const SubAdmin = require("../../model/subAdmin/subAdmin");

exports.updateSubAdminStatus = async (req, res) => {
  try {
    const { id, isActive } = req.body;

    if (!id || typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const updated = await SubAdmin.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Sub Admin not found" });
    }

    res.status(200).json({
      message: "Status updated successfully",
      updatedSubAdmin: updated,
    });
  } catch (err) {
    console.error("Error updating sub admin status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSubAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    const subAdmin = await SubAdmin.findById(id).populate("role");

    if (!subAdmin) {
      return res.status(404).json({ message: "SubAdmin not found" });
    }

    res.status(200).json({
      _id: subAdmin._id,
      name: subAdmin.name,
      email: subAdmin.email,
      slug: subAdmin.slug,
      userRole: subAdmin.userRole,
      createdAt: subAdmin.createdAt,
    });
  } catch (error) {
    console.error("Error fetching SubAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};