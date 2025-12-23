const BookingAmenity = require("../../../../model/flat/bookingAmenitySchema");
const Apartment = require("../../../../model/apartment/apartmentModel");
const Amenity = require("../../../../model/superAdmin/amenity");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const mongoose = require("mongoose");

exports.createBooking = async (req, res) => {
  try {
    const { apartmentId, amenityId, date, time } = req.body;
    const { activeRole, auth } = req;

    if (!apartmentId || !amenityId || !date || !time) {
      return res.status(400).json({
        message: "apartmentId, amenityId, date, and time are required",
      });
    }

    // 🧩 Extract user context
    const selectedRoleId = auth?.selectedRoleId || activeRole?._id;
    const flatId = auth?.flatId || activeRole?.flat?._id;

    if (!selectedRoleId) {
      return res
        .status(400)
        .json({ message: "User role (selectedRoleId) missing" });
    }

    if (!flatId) {
      return res
        .status(400)
        .json({ message: "Flat ID missing in user context" });
    }

    // 🔐 Fetch role and verify occupant
    const roleAssignment = await UserRoleAssignment.findById(
      selectedRoleId
    ).populate("role");
    const roleSlug = roleAssignment?.role?.slug;

    if (!roleAssignment || !roleSlug) {
      return res.status(403).json({ message: "Access denied. Invalid role." });
    }

    if (roleSlug.toLowerCase() !== "occupants") {
      return res.status(403).json({
        message: "Access denied: Only occupants can book amenities.",
      });
    }

    // 🏢 Validate apartment
    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    // 🧾 Validate amenity globally
    const amenityExists = await Amenity.findById(amenityId);
    if (!amenityExists) {
      return res.status(404).json({ message: "Amenity does not exist" });
    }

    // 🔍 Ensure amenity belongs to this apartment
    const amenityInfo = apartment.amenities.find(
      (a) => a.amenity.toString() === amenityId.toString()
    );
    if (!amenityInfo) {
      return res.status(400).json({
        message: `Amenity "${amenityExists.name}" is not available for this apartment.`,
      });
    }

    // ⏱ Convert booking time
    const bookingDate = new Date(date);
    const [slotStart] = time.split(" – ");
    const to24h = (time12) => {
      const [t, p] = time12.split(" ");
      let [h, m] = t.split(":").map(Number);
      if (p === "PM" && h < 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const bookingStart = new Date(`${date}T${to24h(slotStart)}:00`);

    // 🧱 Check maintenance window (exclusive end)
    // 🧱 Check maintenance window using raw values
    const maintenance = amenityInfo.maintenance;

    if (maintenance?.fromDate && maintenance?.toDate) {
      const from = new Date(
        `${maintenance.fromDate} ${maintenance.fromTime} ${maintenance.fromPeriod}`
      );
      const to = new Date(
        `${maintenance.toDate} ${maintenance.toTime} ${maintenance.toPeriod}`
      );

      console.log(
        "⛔ Checking maintenance block at:",
        bookingStart.toISOString()
      );
      console.log("🔧 FROM:", from.toISOString());
      console.log("🔧 TO  :", to.toISOString());

      // ✅ Block STRICT inside maintenance window (>= from AND < to)
      if (bookingStart >= from && bookingStart < to) {
        return res.status(400).json({
          message: `Selected time slot is under maintenance.`,
        });
      }
    }

    // 🔎 Duplicate booking check
    const existing = await BookingAmenity.findOne({
      apartment: apartmentId,
      amenity: amenityId,
      bookingDate,
      timeSlot: time,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      return res.status(409).json({
        message:
          "This slot is already reserved for this amenity in this apartment. Please choose a different time.",
      });
    }

    // ✅ Create booking
    const booking = await BookingAmenity.create({
      apartment: apartmentId,
      amenity: amenityId,
      flat: flatId,
      createdBy: selectedRoleId,
      bookingDate,
      timeSlot: time,
      status: "completed",
    });

    res.status(201).json({
      message: "Booking created successfully.",
      booking,
    });
  } catch (err) {
    console.error("❌ createBooking error:", err);
    res.status(500).json({
      message: "Failed to create booking.",
      error: err.message,
    });
  }
};
