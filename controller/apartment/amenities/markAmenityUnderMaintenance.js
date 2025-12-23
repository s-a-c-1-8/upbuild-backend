// const Apartment = require("../../../model/apartment/apartmentModel");
// const Amenity = require("../../../model/superAdmin/amenity");

// // 🧩 Combine date + time + AM/PM → proper local Date
// function combineDateTime(date, time, period) {
//   console.log("🛠️ combineDateTime called with:", { date, time, period });
//   if (!date || !time || !period) return null;

//   let [hour, minute] = time.split(":").map(Number);
//   if (period === "PM" && hour < 12) hour += 12;
//   if (period === "AM" && hour === 12) hour = 0;

//   const d = new Date(date);
//   d.setHours(hour, minute, 0, 0);
//   console.log("✅ Final combined DateTime:", d);
//   return d;
// }

// exports.markAmenityUnderMaintenance = async (req, res) => {
//   try {
//     console.log("📥 Incoming Request Body:", req.body);

//     const { id } = req.params; // apartmentId
//     const {
//       amenityId,
//       fromDate,
//       fromTime,
//       fromPeriod,
//       toDate,
//       toTime,
//       toPeriod,
//       reason,
//     } = req.body;

//     console.log("👉 Step 1: Basic validation check");

//     if (!amenityId || !fromDate || !fromTime || !toDate || !toTime) {
//       console.log("❌ Missing required fields");
//       return res.status(400).json({
//         message: "Amenity ID, From date/time, and To date/time are required.",
//       });
//     }

//     console.log("👉 Step 2: Checking amenity existence");
//     const amenityExists = await Amenity.findById(amenityId);
//     if (!amenityExists) {
//       console.log("❌ Amenity not found in master table");
//       return res.status(404).json({ message: "Amenity not found." });
//     }

//     console.log("👉 Step 3: Checking apartment existence");
//     const apartment = await Apartment.findById(id);
//     if (!apartment) {
//       console.log("❌ Apartment not found");
//       return res.status(404).json({ message: "Apartment not found." });
//     }

//     console.log("👉 Step 4: Searching amenity inside apartment");
//     const targetAmenity = apartment.amenities.find(
//       (a) => a.amenity.toString() === amenityId
//     );
//     if (!targetAmenity) {
//       console.log("❌ Amenity not linked to apartment");
//       return res.status(404).json({
//         message: "This amenity is not added to the apartment yet.",
//       });
//     }

//     console.log("👉 Step 5: Combining maintenance date + time");
//     const fromDateTime = combineDateTime(fromDate, fromTime, fromPeriod);
//     const toDateTime = combineDateTime(toDate, toTime, toPeriod);

//     if (!fromDateTime || !toDateTime) {
//       console.log("❌ Invalid combined datetime");
//       return res.status(400).json({ message: "Invalid date/time format provided." });
//     }

//     console.log("✅ Final Maintenance Window:", {
//       fromDateTime,
//       toDateTime,
//       reason,
//     });

//     console.log("👉 Step 6: Assigning maintenance to amenity");
//     targetAmenity.maintenance = {
//       fromDateTime,
//       toDateTime,
//       reason: reason || "",
//     };

//     await apartment.save();
//     console.log("✅ Maintenance saved to DB");

//     res.json({
//       message: `Amenity "${amenityExists.name}" marked under maintenance successfully.`,
//       updatedAmenity: targetAmenity,
//     });
//   } catch (err) {
//     console.error("❌ Maintenance error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const Apartment = require("../../../model/apartment/apartmentModel");
const Amenity = require("../../../model/superAdmin/amenity");
const BookingAmenity = require("../../../model/flat/bookingAmenitySchema");
const notification = require("../../../model/user/notification");

// 🧩 Combine date + time + AM/PM → proper local Date
function combineDateTime(date, time, period) {
  if (!date || !time || !period) return null;

  let [hour, minute] = time.split(":").map(Number);
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

exports.markAmenityUnderMaintenance = async (req, res) => {
  try {
    const { id } = req.params; // apartmentId
    const {
      amenityId,
      fromDate,
      fromTime,
      fromPeriod,
      toDate,
      toTime,
      toPeriod,
      reason,
    } = req.body;
    console.log("fromDate", fromDate);
    console.log("fromTime", fromTime);
    console.log("fromPeriod", fromPeriod);
    console.log("toDate", toDate);
    console.log("toTime", toTime);
    console.log("toPeriod", toPeriod);

    if (!amenityId || !fromDate || !fromTime || !toDate || !toTime) {
      return res.status(400).json({
        message: "Amenity ID, From date/time, and To date/time are required.",
      });
    }

    const amenityExists = await Amenity.findById(amenityId);
    if (!amenityExists)
      return res.status(404).json({ message: "Amenity not found." });

    const apartment = await Apartment.findById(id);
    if (!apartment)
      return res.status(404).json({ message: "Apartment not found." });

    const targetAmenity = apartment.amenities.find(
      (a) => a.amenity.toString() === amenityId
    );
    if (!targetAmenity) {
      return res.status(404).json({
        message: "This amenity is not added to the apartment yet.",
      });
    }

    const fromDateTime = combineDateTime(fromDate, fromTime, fromPeriod);
    const toDateTime = combineDateTime(toDate, toTime, toPeriod);

    if (!fromDateTime || !toDateTime)
      return res
        .status(400)
        .json({ message: "Invalid date/time format provided." });

    // ✅ Get ALL bookings on same day range
    const existingBookings = await BookingAmenity.find({
      amenity: amenityId,
      bookingDate: {
        $gte: new Date(fromDateTime.setHours(0, 0, 0, 0)),
        $lte: new Date(toDateTime.setHours(23, 59, 59, 999)),
      },
      status: "completed",
    })
      .populate({
        path: "createdBy",
        populate: { path: "user", select: "name contactNumber" },
      })
      .lean();

    console.log(`🟡 Possible bookings to check: ${existingBookings.length}`);

    // ✅ If overlapping in time — cancel + notify
    for (const b of existingBookings) {
      const [startTime, endTime] = b.timeSlot.split(" – ");
      const slotStart = combineDateTime(
        b.bookingDate,
        startTime.split(" ")[0],
        startTime.split(" ")[1]
      );
      const slotEnd = combineDateTime(
        b.bookingDate,
        endTime.split(" ")[0],
        endTime.split(" ")[1]
      );

      if (slotStart < toDateTime && slotEnd > fromDateTime) {
        const bookingDate = new Date(b.bookingDate);
        const day = String(bookingDate.getDate()).padStart(2, "0");
        const month = String(bookingDate.getMonth() + 1).padStart(2, "0");
        const year = bookingDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        await BookingAmenity.findByIdAndUpdate(b._id, { status: "cancelled" });

        console.log(`✅ Cancelled due to overlap: ${b.createdBy?.user?.name}`);

        await notification.create({
          apartmentId: b.apartment,
          flatId: b.flat,
          message: `Your amenity booking for "${amenityExists.name}" on ${formattedDate} at ${b.timeSlot} has been cancelled due to maintenance.`,
          logId: b._id,
          logModel: "BookingAmenity",
          recipients: [b.createdBy],
          link: `${process.env.FRONTEND_URL}apartment/amenities/myBookings`,
        });
      }
    }

    // ✅ NOW apply the maintenance flag
    targetAmenity.maintenance = {
      fromDate,
      fromTime,
      fromPeriod,
      toDate,
      toTime,
      toPeriod,
      reason: reason || "",
    };

    await apartment.save();

    res.json({
      message: `Amenity "${amenityExists.name}" marked under maintenance successfully.`,
      updatedAmenity: targetAmenity,
    });
  } catch (err) {
    console.error("❌ Maintenance error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
