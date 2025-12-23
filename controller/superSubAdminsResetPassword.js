const bcrypt = require("bcryptjs");
const SuperAdmin = require("../model/superAdmin/superAdmin");
const SubAdmin = require("../model/subAdmin/subAdmin");

const resetPasswordController = async (req, res) => {
  const { id, newPassword } = req.body;

  if (!id || !newPassword) {
    return res.status(400).json({ message: "ID and newPassword are required" });
  }

  try {
    // First check user in SuperAdmin
    let user = await SuperAdmin.findById(id);

    // If not SuperAdmin, check SubAdmin
    if (!user) {
      user = await SubAdmin.findById(id);
    }

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❗ IMPORTANT: Check if reset link exists
    if (!user.forgotPassLink) {
      return res.status(400).json({
        message: "Reset password link expired or already used. Please request again.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.passwordSetDate = new Date();
    user.forgotPassLink = null; // ❗ clear the link after successful reset

    await user.save();

    return res.status(200).json({
      message: "Password reset successful",
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { resetPasswordController };
