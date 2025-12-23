const SuperAdmin = require('../../model/superAdmin/superAdmin'); // Your model

const getSuperAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    const superAdmin = await SuperAdmin.findById(id);

    if (!superAdmin) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    res.status(200).json({
      _id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      slug: superAdmin.slug,
      userRole: superAdmin.userRole,
      createdAt: superAdmin.createdAt,
    });
  } catch (error) {
    console.error("Error fetching Super Admin by id:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

module.exports = { getSuperAdminById };
