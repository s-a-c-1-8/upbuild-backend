const Role = require("../../model/superAdmin/role");
const Permission = require("../../model/superAdmin/permission");

const addRole = async (req, res) => {
  const { name, description, status, permissions } = req.body;

  if (!name || !status) {
    return res.status(400).json({ message: "Name and status are required" });
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

  try {
    // Check only for duplicate slug
    const existingSlug = await Role.findOne({ slug });
    if (existingSlug) {
      return res
        .status(400)
        .json({ message: "Role already exists with this name or slug" });
    }

    const role = new Role({
      name,
      slug,
      description,
      status,
      permissions: permissions || [],
    });

    await role.save();
    return res.status(201).json(role);
  } catch (err) {
    console.error("Error adding role:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions");
    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSubAdminRole = async (req, res) => {
  try {
    const slugs = ["sub-admin", "subadmin", "sub_admin"];

    const role = await Role.find({ slug: { $in: slugs } }).populate(
      "permissions"
    );

    if (!role) {
      return res.status(404).json({ message: "Sub Admin role not found" });
    }

    res.status(200).json(role);
  } catch (err) {
    console.error("Error fetching Sub Admin role:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// const getAparmentAdminRole = async (req, res) => {
//   try {
//     const slugs = ["apartment-admin", "apartmentadmin", "apartment_admin"];

//     const role = await Role.findOne({ slug: { $in: slugs } }).populate(
//       "permissions"
//     );

//     if (!role) {
//       return res.status(404).json({ message: "Sub Admin role not found" });
//     }

//     res.status(200).json(role);
//   } catch (err) {
//     console.error("Error fetching Sub Admin role:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const updateRolePermissions = async (req, res) => {
  const { permissions } = req.body;
  const { roleId } = req.params;

  if (!permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ message: "Permissions array is required" });
  }

  try {
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Optional: validate permissions exist
    const validPermissions = await Permission.find({
      _id: { $in: permissions },
    });
    if (validPermissions.length !== permissions.length) {
      return res
        .status(400)
        .json({ message: "Invalid permissions in the list" });
    }

    // Only update permissions
    role.permissions = permissions;
    await role.save();

    res.status(200).json({ message: "Role permissions updated", role });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  addRole,
  getAllRoles,
  updateRolePermissions,
  getSubAdminRole,
};
