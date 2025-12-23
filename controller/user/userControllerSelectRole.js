const jwt = require("jsonwebtoken");
const userRoleAssignment = require("../../model/user/userRoleAssignment");

exports.selectRole = async (req, res) => {
  try {
    const { selectedRoleId } = req.body;
    const tokenUserId = req.user._id;

    if (!selectedRoleId) {
      return res.status(400).json({ message: "selectedRoleId is required" });
    }

    const roleAssignment = await userRoleAssignment
      .findById(selectedRoleId)
      .populate("apartment", "name")
      .populate("flat", "flatName blockName")
      .populate("role", "name slug");

    if (
      !roleAssignment ||
      roleAssignment.user.toString() !== tokenUserId.toString()
    ) {
      return res.status(403).json({ message: "Invalid role selection" });
    }

    // 🔐 Generate enriched token
    const token = jwt.sign(
      {
        id: req.user._id,
        userType: "user",
        selectedRoleId: roleAssignment._id,
        apartmentId: roleAssignment?.apartment?._id,
        flatId: roleAssignment?.flat?._id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error("🔴 Role Selection Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
