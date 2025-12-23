const SuperAdmin = require("../../model/superAdmin/superAdmin");
const bcrypt = require("bcryptjs");

const updateSuperAdminById = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  try {
    const admin = await SuperAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    admin.name = name;
    admin.email = email;

    await admin.save();

    res.status(200).json({ message: "Super Admin updated successfully", admin });
  } catch (error) {
    console.error("Error updating Super Admin:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

const changeSuperAdminPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.params;
  
    try {
      const superAdmin = await SuperAdmin.findById(id);
      if (!superAdmin) {
        return res.status(404).json({ message: "SuperAdmin not found" });
      }
  
      const isMatch = await bcrypt.compare(currentPassword, superAdmin.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
  
      const salt = await bcrypt.genSalt(10);
      superAdmin.password = await bcrypt.hash(newPassword, salt);
      await superAdmin.save();
  
      res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("SuperAdmin password change error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };

module.exports = {updateSuperAdminById,changeSuperAdminPassword};
