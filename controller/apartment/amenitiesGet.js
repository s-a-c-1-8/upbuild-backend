// controllers/apartmentController.js
const Apartment = require("../../model/apartment/apartmentModel");
const Amenity = require("../../model/superAdmin/amenity");

// GET /api/apartment/:id/all-amenities
const getApartmentWithAllAmenities = async (req, res) => {
  try {
    const { id } = req.params; // apartment _id

    // 1️⃣ Fetch apartment with its amenities (type + schedule)
    const apartment = await Apartment.findById(id)
      .select("amenities")
      .populate({
        path: "amenities.amenity",
        select: "name status", // type now comes from Apartment, not Amenity
      });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    // 2️⃣ Map apartment amenities
    const apartmentAmenitiesMap = {};
    apartment.amenities.forEach((a) => {
      if (a.amenity && a.amenity._id) {
        apartmentAmenitiesMap[a.amenity._id.toString()] = {
          type: a.type || "always",
          schedule: a.schedule || [],
        };
      }
    });

    // 3️⃣ Fetch all active amenities (for UI list)
    const allAmenities = await Amenity.find({ status: "Active" })
      .select("name createdAt")
      .sort({ createdAt: 1 });

    // 4️⃣ Merge Apartment data + master Amenity list
    const finalAmenities = allAmenities.map((am) => {
      const apartmentAmenity = apartmentAmenitiesMap[am._id.toString()];
      const isChecked = !!apartmentAmenity;

      if (isChecked) {
        // ✅ If checked → include full data
        return {
          _id: am._id,
          name: am.name,
          checked: true,
          type: apartmentAmenity.type,
          schedule: apartmentAmenity.schedule,
        };
      } else {
        // ❌ If not checked → send only id + name
        return {
          _id: am._id,
          name: am.name,
          checked: false,
        };
      }
    });

    res.json(finalAmenities);
  } catch (err) {
    console.error("Error fetching apartment amenities:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getApartmentWithAllAmenities,
};
