const Apartment = require("../../model/apartment/apartmentModel");
const ApartmentRole = require("../../model/apartment/apartmentrole");
const User = require("../../model/user/userModel");

exports.getNamesByIds = async (req, res) => {
  try {
    const { apartmentId, roleId, userId } = req.query; // or req.body if POST
    console.log("roleId", roleId);
    const result = {};

    if (apartmentId) {
      const apartment = await Apartment.findById(apartmentId).select(
        "_id name"
      );
      result.apartment = apartment
        ? { _id: apartment._id, name: apartment.name }
        : null;
    }

    if (roleId) {
      const role = await ApartmentRole.findById(roleId).select("_id name");
      result.role = role ? { _id: role._id, name: role.name } : null;
    }

    if (userId) {
      const user = await User.findById(userId).select("_id name");
      result.user = user ? { _id: user._id, name: user.name } : null;
    }
    console.log("📤 Final Result:", result);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching names:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
