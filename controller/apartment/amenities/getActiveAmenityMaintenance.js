// const Apartment = require("../../../model/apartment/apartmentModel");
// const Amenity = require("../../../model/superAdmin/amenity");
// const BookingAmenity = require("../../../model/flat/bookingAmenitySchema");

// // // ✅ POST /api/apartment/:id/check-maintenance
// // exports.checkAmenityMaintenance = async (req, res) => {
// //   try {
// //     const { id } = req.params; // apartmentId
// //     const { amenityId } = req.body;
// //     const now = new Date();

// //     if (!amenityId) {
// //       return res.status(400).json({ message: "Amenity ID is required." });
// //     }

// //     // ✅ Fetch apartment and populate amenities
// //     const apartment = await Apartment.findById(id).populate({
// //       path: "amenities.amenity",
// //       select: "name",
// //     });

// //     if (!apartment) {
// //       return res.status(404).json({ message: "Apartment not found." });
// //     }

// //     // ✅ Locate amenity
// //     const targetAmenity = apartment.amenities.find(
// //       (a) => a.amenity._id.toString() === amenityId
// //     );

// //     if (!targetAmenity) {
// //       return res
// //         .status(404)
// //         .json({ message: "This amenity is not part of this apartment." });
// //     }

// //     const maintenance = targetAmenity.maintenance;
// //     const schedule = targetAmenity.schedule || [];

// //     // 🔍 Fetch ALL completed bookings for this apartment & amenity
// //     const completedBookings = await BookingAmenity.find({
// //       apartment: id,
// //       amenity: amenityId,
// //       status: "completed",
// //     })
// //       .select("bookingDate timeSlot apartment amenity _id") // ✅ only required fields
// //       .sort({ bookingDate: 1 }) // optional: sort by date ascending
// //       .lean();

// //     // 🧩 No maintenance record case
// //     if (!maintenance?.fromDateTime || !maintenance?.toDateTime) {
// //       console.log(`ℹ️ No maintenance found for amenity: ${targetAmenity.amenity.name}`);
// //       return res.json({
// //         message: "No maintenance record found for this amenity.",
// //         underMaintenance: false,
// //         schedule,
// //         bookings: completedBookings, // ✅ send all bookings
// //       });
// //     }

// //     const from = new Date(maintenance.fromDateTime);
// //     const to = new Date(maintenance.toDateTime);

// //     // 🧠 Debug log for every check
// //     console.log("🧩 Maintenance check:", {
// //       amenity: targetAmenity.amenity.name,
// //       apartmentId: id,
// //       from: from.toISOString(),
// //       to: to.toISOString(),
// //       now: now.toISOString(),
// //       expired: to < now,
// //     });

// //     // ✅ If maintenance period has expired, clear it
// //     if (maintenance?.toDateTime && to.getTime() < now.getTime()) {
// //       console.log(`⚠️ Deleting expired maintenance for: ${targetAmenity.amenity.name}`);
// //       targetAmenity.maintenance = undefined;
// //       await apartment.save();

// //       return res.json({
// //         message: `Maintenance period expired and cleared for "${targetAmenity.amenity.name}".`,
// //         underMaintenance: false,
// //         cleared: true,
// //         schedule,
// //         bookings: completedBookings, // ✅ send all bookings
// //       });
// //     }

// //     // ✅ Still active or scheduled maintenance
// //     return res.json({
// //       message: `Amenity "${targetAmenity.amenity.name}" is under maintenance (active or scheduled).`,
// //       underMaintenance: true,
// //       maintenance,
// //       schedule,
// //       bookings: completedBookings, // ✅ send all bookings
// //     });
// //   } catch (err) {
// //     console.error("❌ Error checking maintenance:", err);
// //     res.status(500).json({ message: "Server error", error: err.message });
// //   }
// // };

// // ✅ POST /api/apartment/:id/check-maintenance
// exports.checkAmenityMaintenance = async (req, res) => {
//   try {
//     const { id } = req.params; // apartmentId
//     const { amenityId } = req.body;
//     const now = new Date();

//     if (!amenityId) {
//       return res.status(400).json({ message: "Amenity ID is required." });
//     }

//     const apartment = await Apartment.findById(id).populate({
//       path: "amenities.amenity",
//       select: "name",
//     });

//     if (!apartment) {
//       return res.status(404).json({ message: "Apartment not found." });
//     }

//     const targetAmenity = apartment.amenities.find(
//       (a) => a.amenity._id.toString() === amenityId
//     );

//     if (!targetAmenity) {
//       return res
//         .status(404)
//         .json({ message: "This amenity is not part of this apartment." });
//     }

//     const maintenance = targetAmenity.maintenance;
//     const schedule = targetAmenity.schedule || [];

//     // ✅ RAW VALUES NOW — So check properly
//     if (!maintenance?.fromDate || !maintenance?.toDate) {
//       return res.json({
//         message: "No maintenance record found for this amenity.",
//         underMaintenance: false,
//         schedule,
//       });
//     }

//     // ✅ Recreate Date() only for comparison, not for saving
//     const from = new Date(
//       `${maintenance.fromDate} ${maintenance.fromTime} ${maintenance.fromPeriod}`
//     );
//     const to = new Date(
//       `${maintenance.toDate} ${maintenance.toTime} ${maintenance.toPeriod}`
//     );

//     if (to < now) {
//       // ✅ Auto remove expired
//       targetAmenity.maintenance = undefined;
//       await apartment.save();

//       return res.json({
//         message: `Maintenance period expired and cleared for "${targetAmenity.amenity.name}".`,
//         underMaintenance: false,
//         cleared: true,
//         schedule,
//       });
//     }

//     return res.json({
//       message: `Amenity "${targetAmenity.amenity.name}" is under maintenance (active or scheduled).`,
//       underMaintenance: true,
//       maintenance, // ✅ Return RAW values to frontend
//       schedule,
//     });
//   } catch (err) {
//     console.error("❌ Error checking maintenance:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
// ✅ POST /api/apartment/:id/check-maintenance

const Apartment = require("../../../model/apartment/apartmentModel");
const Amenity = require("../../../model/superAdmin/amenity");
const BookingAmenity = require("../../../model/flat/bookingAmenitySchema");

exports.checkAmenityMaintenance = async (req, res) => {
  try {
    const { id } = req.params; // apartmentId
    const { amenityId } = req.body;
    const now = new Date();

    console.log("🔍 API HIT: /check-maintenance");
    console.log("➡️ apartment:", id);
    console.log("➡️ amenityId:", amenityId);
    console.log("⏱️ Current Time:", now.toISOString());

    if (!amenityId) {
      return res.status(400).json({ message: "Amenity ID is required." });
    }

    const apartment = await Apartment.findById(id).populate({
      path: "amenities.amenity",
      select: "name",
    });

    if (!apartment) {
      console.log("❌ Apartment NOT FOUND");
      return res.status(404).json({ message: "Apartment not found." });
    }

    const targetAmenity = apartment.amenities.find(
      (a) => a.amenity._id.toString() === amenityId
    );

    if (!targetAmenity) {
      console.log("❌ Amenity NOT FOUND in Apartment");
      return res
        .status(404)
        .json({ message: "This amenity is not part of this apartment." });
    }

    console.log("✅ Found Amenity:", targetAmenity.amenity.name);

    const maintenance = targetAmenity.maintenance;
    const schedule = targetAmenity.schedule || [];

    console.log("📌 Maintenance RAW:", maintenance);

    // ✅ Fetch ALL completed bookings
    const completedBookings = await BookingAmenity.find({
      apartment: id,
      amenity: amenityId,
      status: "completed",
    })
      .select("bookingDate timeSlot")
      .sort({ bookingDate: 1 })
      .lean();

    // ✅ No maintenance case
    if (!maintenance?.fromDate || !maintenance?.toDate) {
      return res.json({
        message: "No maintenance record found for this amenity.",
        underMaintenance: false,
        schedule,
        bookings: completedBookings,
      });
    }

    // ✅ Create full EXACT DateTime using both date + time + period
    const from = new Date(
      `${maintenance.fromDate} ${maintenance.fromTime} ${maintenance.fromPeriod}`
    );
    const to = new Date(
      `${maintenance.toDate} ${maintenance.toTime} ${maintenance.toPeriod}`
    );

    console.log("🕒 FROM:", from.toISOString());
    console.log("🕒 TO  :", to.toISOString());

    // ✅ EXPIRE ONLY AFTER full end time is crossed (strict >)
    if (now.getTime() > to.getTime()) {
      console.log("⚠️ EXPIRED (strict time). Deleting it now.");
      targetAmenity.maintenance = undefined;
      await apartment.save();

      return res.json({
        message: "Maintenance expired and cleared.",
        underMaintenance: false,
        cleared: true,
        schedule,
        bookings: completedBookings,
      });
    }

    // ✅ FUTURE scheduled — NOT started yet
    if (now.getTime() < from.getTime()) {
      console.log("🟡 SCHEDULED (future start)");
      return res.json({
        message: "Maintenance is scheduled (future).",
        underMaintenance: true,
        scheduled: true,
        maintenance,
        schedule,
        bookings: completedBookings,
      });
    }

    // ✅ ACTIVE NOW
    console.log("🔴 ACTIVE right now!");
    return res.json({
      message: "Amenity is currently under maintenance.",
      underMaintenance: true,
      active: true,
      maintenance,
      schedule,
      bookings: completedBookings,
    });
  } catch (err) {
    console.error("❌ Error checking maintenance:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
