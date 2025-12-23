// controllers/apartmentController.js
const Apartment = require("../../../../model/apartment/apartmentModel");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment"); // ✅ Add this import

// ✅ GET amenities by apartment ID (Accessible only to Occupants)
exports.getApartmentAmenitiesForOccupants = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    let roleSlug = null;

    // 🔍 Fetch role slug
    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");
      roleSlug = roleAssignment?.role?.slug || null;
      // console.log("role slug:", roleSlug);
    }

    // 🚫 Restrict access
    if (roleSlug !== "occupants") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only occupants can view amenities.",
      });
    }

    // 🧩 Validate input
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required.",
      });
    }

    // 🏢 Fetch apartment with populated amenities
    const apartment = await Apartment.findById(apartmentId)
      .populate("amenities.amenity", "name description icon type")
      .select("name amenities");

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    // ✅ Return success response
    return res.status(200).json({
      success: true,
      apartmentName: apartment.name,
      amenities: apartment.amenities || [],
    });
  } catch (error) {
    console.error("❌ Error fetching amenities:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};
