const UserRoleAssignment = require("../../../model/user/userRoleAssignment");

exports.assignBoardRoleToUser = async (req, res) => {
  try {
    const { apartmentId, userId, roleId, flatId } = req.body;
    console.log("req body", req.body);

    // Basic validation
    if (!apartmentId || !userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: "apartmentId, userId, roleId are required",
      });
    }

    // 🔍 CHECK FOR DUPLICATE:
    // Same user + same role + same apartment + same flat
    const existing = await UserRoleAssignment.findOne({
      apartment: apartmentId,
      user: userId,
      role: roleId,
      flat: flatId || null, // ★ match same flat OR null for apartment-level roles
      active: true,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This user already holds this role for this flat.",
      });
    }

    // ✅ CREATE ASSIGNMENT
    const newAssignment = await UserRoleAssignment.create({
      apartment: apartmentId,
      user: userId,
      role: roleId,
      flat: flatId || null,
      active: true,
    });

    return res.status(201).json({
      success: true,
      message: "Role assigned successfully",
      data: newAssignment,
    });

  } catch (err) {
    console.error("Error assigning role", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
