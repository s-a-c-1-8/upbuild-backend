const SubAdmin = require("../../model/subAdmin/subAdmin");
const bcrypt = require("bcryptjs");

const updateSubAdminById = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  try {
    const subadmin = await SubAdmin.findById(id);
    if (!subadmin) {
      return res.status(404).json({ message: "Sub Admin not found" });
    }

    subadmin.name = name;
    subadmin.email = email;

    await subadmin.save();

    res
      .status(200)
      .json({ message: "Sub Admin updated successfully", subadmin });
  } catch (error) {
    console.error("Error updating Sub Admin:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

const changeSubAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.params;

  try {
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: "SubAdmin not found" });
    }

    // ❗ Validate current password
    const isMatch = await bcrypt.compare(currentPassword, subAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // 🔐 Hash & Save new password
    const salt = await bcrypt.genSalt(10);
    subAdmin.password = await bcrypt.hash(newPassword, salt);

    // 🔥 IMPORTANT: Update password set date
    subAdmin.passwordSetDate = new Date();

    await subAdmin.save();  

    res.status(200).json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("SubAdmin password change error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { updateSubAdminById, changeSubAdminPassword };
