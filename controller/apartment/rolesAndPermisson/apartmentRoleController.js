// const ApartmentRole = require("../../model/apartment/apartmentrole");
// const ApartmentPermission = require("../../model/apartment/apartmentPermission");
// const logAction = require("../../utils/logAction"); // ✅ import logAction

// const addApartmentRole = async (req, res) => {
//   const { name, description, status, permissions, apartment } = req.body;

//   if (!name || !status || !apartment) {
//     return res
//       .status(400)
//       .json({ message: "Name, status and apartment id are required" });
//   }

//   // Generate slug from name
//   const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

//   try {
//     const existingSlug = await ApartmentRole.findOne({ slug, apartment });
//     if (existingSlug) {
//       return res
//         .status(400)
//         .json({ message: "Role already exists with this name or slug" });
//     }

//     const role = new ApartmentRole({
//       name,
//       slug,
//       description,
//       status,
//       permissions: permissions || [],
//       apartment,
//     });

//     await role.save();

//     // 🪵 Log action
//     await logAction({
//       req,
//       action: "CREATE_ROLE",
//       description: `Created new role "${name}" for apartment`,
//       metadata: {
//         roleId: role._id,
//         roleName: name,
//         slug,
//         apartmentId: apartment,
//         permissionCount: permissions?.length || 0,
//       },
//     });

//     return res.status(201).json(role);
//   } catch (err) {
//     console.error("Error adding role:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };


const ApartmentRole = require("../../../model/apartment/apartmentRole");
const ApartmentPermission = require("../../../model/apartment/apartmentPermission");
const logAction = require("../../../utils/logAction"); // ✅ import logAction

const addApartmentRole = async (req, res) => {
  const { name, description, status, permissions, apartment, group } = req.body;

  if (!name || !status || !apartment) {
    return res
      .status(400)
      .json({ message: "Name, status and apartment id are required" });
  }

  if (!group) {
    return res.status(400).json({ message: "Group is required." });
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

  try {
    const existingSlug = await ApartmentRole.findOne({ slug, apartment });
    if (existingSlug) {
      return res
        .status(400)
        .json({ message: "Role already exists with this name or slug" });
    }

    const role = new ApartmentRole({
      name,
      slug,
      description,
      status,
      group, // ⭐ ADDED GROUP FIELD
      permissions: permissions || [],
      apartment,
    });

    await role.save();

    // 🪵 Log action
    await logAction({
      req,
      action: "CREATE_ROLE",
      description: `Created new role "${name}" in group "${group}"`,
      metadata: {
        roleId: role._id,
        roleName: name,
        slug,
        group,
        apartmentId: apartment,
        permissionCount: permissions?.length || 0,
      },
    });

    return res.status(201).json(role);
  } catch (err) {
    console.error("Error adding role:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const getAllApartmentRoles = async (req, res) => {
  const { apartmentId } = req.params;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const roles = await ApartmentRole.find({ apartment: apartmentId }).populate(
      "permissions"
    );
    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllApartmentRolesExceptBoardMembers = async (req, res) => {
  const { apartmentId } = req.params;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      group: { $ne: "Board-members" }   // 🚀 EXCLUDE Board-members
    }).populate("permissions");

    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getOnlyBoardMemberRoles = async (req, res) => {
  const { apartmentId } = req.params;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      group: "Board-members"   // ✅ ONLY Board-members
    }).populate("permissions");

    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching board-member roles:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// const getAllApartmentRolesExceptApartmentAdmin = async (req, res) => {
//   const { apartmentId } = req.params;
//   if (!apartmentId) {
//     return res.status(400).json({ message: "Apartment ID is required" });
//   }

//   try {
//     const excludedSlugs = [
//       "apartment-admin",
//       "apartmentadmin",
//       "apartment_admin",
//       "apartment-sub-admin",
//       "occupants",
//     ];

//     const roles = await ApartmentRole.find({
//       apartment: apartmentId,
//       slug: { $nin: excludedSlugs },
//     }).populate("permissions");

//     res.status(200).json(roles);
//   } catch (err) {
//     console.error("Error fetching roles:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const getOnlyStaffRoles = async (req, res) => {
  const { apartmentId } = req.params;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      group: "Staff"   // ✅ ONLY Staff
    }).populate("permissions");

    res.status(200).json(roles);
  } catch (err) {
    console.error("Error fetching staff roles:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const getApartmentSubAdminRoles = async (req, res) => {
  const { apartmentId } = req.params;

  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      slug: "apartment-sub-admin",
    }).populate("permissions");

    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching sub-admin roles:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// const getAparmentAdminRoleForApartment = async (req, res) => {
//   const { apartmentId } = req.params;

//   if (!apartmentId) {
//     return res.status(400).json({ message: "Apartment ID is required" });
//   }

//   try {
//     const slugs = ["apartment-admin", "apartmentadmin", "apartment_admin"];
//     const role = await ApartmentRole.findOne({
//       slug: { $in: slugs },
//       apartment: apartmentId,
//     }).populate("permissions");

//     if (!role) {
//       return res.status(404).json({ message: "Admin role not found" });
//     }

//     res.status(200).json(role);
//   } catch (err) {
//     console.error("Error fetching Admin role:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// const updateApartmentRolePermissions = async (req, res) => {
//   const { permissions } = req.body;
//   const { roleId, apartmentId } = req.params;

//   if (!permissions || !Array.isArray(permissions)) {
//     return res.status(400).json({ message: "Permissions array is required" });
//   }

//   if (!apartmentId) {
//     return res.status(400).json({ message: "Apartment ID is required" });
//   }

//   try {
//     const role = await ApartmentRole.findOne({
//       _id: roleId,
//       apartment: apartmentId,
//     });

//     if (!role) {
//       return res
//         .status(404)
//         .json({ message: "Role not found for the given apartment" });
//     }

//     const validPermissions = await ApartmentPermission.find({
//       _id: { $in: permissions },
//       apartment: apartmentId,
//     });

//     if (validPermissions.length !== permissions.length) {
//       return res
//         .status(400)
//         .json({ message: "Invalid permissions in the list" });
//     }

//     role.permissions = permissions;
//     await role.save();

//     // 🪵 Log the update
//     await logAction({
//       req,
//       action: "UPDATE_ROLE_PERMISSIONS",
//       description: `Updated permissions for role "${role.name}"`,
//       metadata: {
//         roleId: role._id,
//         roleName: role.name,
//         permissionCount: permissions.length,
//         apartmentId,
//       },
//     });

//     res.status(200).json({ message: "Role permissions updated", role });
//   } catch (error) {
//     console.error("Error updating role permissions:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

const updateApartmentRolePermissions = async (req, res) => {
  const { permissions } = req.body;
  const { roleId } = req.params;

  if (!permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ message: "Permissions array is required" });
  }

  try {
    const role = await ApartmentRole.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // ✅ Only check that the permissions exist globally
    const validPermissions = await ApartmentPermission.find({
      _id: { $in: permissions },
    });

    if (validPermissions.length !== permissions.length) {
      return res
        .status(400)
        .json({ message: "Invalid permissions in the list" });
    }

    role.permissions = permissions;
    await role.save();

    await logAction({
      req,
      action: "UPDATE_ROLE_PERMISSIONS",
      description: `Updated permissions for role "${role.name}"`,
      metadata: {
        roleId: role._id,
        roleName: role.name,
        permissionCount: permissions.length,
      },
    });

    res.status(200).json({ message: "Role permissions updated", role });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



module.exports = {
  addApartmentRole,
  getAllApartmentRoles,
  // getAllApartmentRolesExceptApartmentAdmin,
  updateApartmentRolePermissions,
  getApartmentSubAdminRoles,
  getAllApartmentRolesExceptBoardMembers,
  getOnlyStaffRoles,
  getOnlyBoardMemberRoles
};
