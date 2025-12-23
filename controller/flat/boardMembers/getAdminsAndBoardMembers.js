const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const User = require("../../../model/user/userModel");
const ApartmentRole = require("../../../model/apartment/apartmentRole");

exports.getAllBoardMembers = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "apartmentId is required",
      });
    }

    // 1️⃣ Fetch only roles that are Admins or Board-members for this apartment
    const validRoles = await ApartmentRole.find({
      apartment: apartmentId,
      group: { $in: ["Board-members"] },
      status: "Active",
    }).select("_id name group slug");

    const roleIds = validRoles.map((r) => r._id);

    // 2️⃣ Find assignments matching those role IDs
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: { $in: roleIds },
      active: true,
    })
      .populate("user", "name contactNumber email image")
      .populate("flat", "flatName blockName")
      .populate("role", "name slug group")
      .lean();

    return res.status(200).json({
      success: true,
      count: assignments.length,
      members: assignments,
    });
  } catch (err) {
    console.error("Error fetching board/admin members:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
