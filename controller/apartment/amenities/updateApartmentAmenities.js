// const Apartment = require("../../../model/apartment/apartmentModel");
// const Amenity = require("../../../model/superAdmin/amenity");

// // POST /api/update/apartment/amenities/:id
// const updateApartmentAmenities = async (req, res) => {
//   console.log("req body =", JSON.stringify(req.body, null, 2));

//   try {
//     const { id } = req.params;
//     const { additional } = req.body;

//     if (!additional || !Array.isArray(additional.amenities)) {
//       return res.status(400).json({ message: "Amenities data required" });
//     }

//     const amenityIds = additional.amenities.map((a) => a._id);
//     const amenityDetails = await Amenity.find({ _id: { $in: amenityIds } });

//     if (amenityDetails.length === 0) {
//       return res.status(400).json({ message: "No valid amenities found" });
//     }

//     const amenitiesToSave = [];

//     for (const item of additional.amenities) {
//       const amenityInfo = amenityDetails.find(
//         (a) => a._id.toString() === item._id
//       );

//       if (!amenityInfo) {
//         return res
//           .status(400)
//           .json({ message: `Invalid amenity ID: ${item._id}` });
//       }

//       const type = item.type || amenityInfo.type || "always";
//       const schedule = [];

//       if (["time", "booking"].includes(type)) {
//         if (!item.fromTime || !item.toTime) {
//           return res.status(400).json({
//             message: `Amenity "${amenityInfo.name}" requires both From and To time.`,
//           });
//         }

//         schedule.push({
//           fromTime: item.fromTime,
//           toTime: item.toTime,
//         });
//       }

//       amenitiesToSave.push({
//         amenity: item._id,
//         type,
//         schedule,
//       });
//     }

//     // ✅ Save into Apartment document
//     const updatedApartment = await Apartment.findByIdAndUpdate(
//       id,
//       { amenities: amenitiesToSave }, // ✅ corrected path
//       { new: true }
//     );

//     if (!updatedApartment) {
//       return res.status(404).json({ message: "Apartment not found" });
//     }

//     res.json({
//       message: "Amenities updated successfully",
//       amenities: updatedApartment.amenities || [],
//     });
//   } catch (err) {
//     console.error("Error updating apartment amenities:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// module.exports = { updateApartmentAmenities };

const Apartment = require("../../../model/apartment/apartmentModel");
const Amenity = require("../../../model/superAdmin/amenity");

// ✅ POST /api/update/apartment/amenities/:id
const updateApartmentAmenities = async (req, res) => {
  console.log("req body =", JSON.stringify(req.body, null, 2));

  try {
    const { id } = req.params;
    const { additional } = req.body;

    if (!additional || !Array.isArray(additional.amenities)) {
      return res.status(400).json({ message: "Amenities data required" });
    }

    // ✅ Validate amenities
    const amenityIds = additional.amenities.map((a) => a._id);
    const amenityDetails = await Amenity.find({ _id: { $in: amenityIds } });
    if (amenityDetails.length === 0) {
      return res.status(400).json({ message: "No valid amenities found" });
    }

    // ✅ Fetch current apartment (to preserve maintenance)
    const apartment = await Apartment.findById(id);
    if (!apartment) return res.status(404).json({ message: "Apartment not found" });

    const existingAmenities = apartment.amenities || [];
    const updatedAmenities = [];

    for (const item of additional.amenities) {
      const amenityInfo = amenityDetails.find(
        (a) => a._id.toString() === item._id
      );
      if (!amenityInfo) continue;

      const type = item.type || amenityInfo.type || "always";
      const schedule = [];

      if (["time", "booking"].includes(type)) {
        if (!item.fromTime || !item.toTime) {
          return res.status(400).json({
            message: `Amenity "${amenityInfo.name}" requires both From and To time.`,
          });
        }
        schedule.push({
          fromTime: item.fromTime,
          toTime: item.toTime,
        });
      }

      // 🧠 Preserve existing maintenance if it exists
      const existing = existingAmenities.find(
        (a) => a.amenity.toString() === item._id
      );
      const maintenance = existing?.maintenance || undefined;

      updatedAmenities.push({
        amenity: item._id,
        type,
        schedule,
        ...(maintenance ? { maintenance } : {}), // ✅ keep maintenance
      });
    }

    // ✅ Save safely
    apartment.amenities = updatedAmenities;
    await apartment.save();

    res.json({
      message: "Amenities updated successfully",
      amenities: apartment.amenities || [],
    });
  } catch (err) {
    console.error("❌ Error updating apartment amenities:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { updateApartmentAmenities };
