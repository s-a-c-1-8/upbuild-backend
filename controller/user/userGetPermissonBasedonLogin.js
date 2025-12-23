// const UserRoleAssignment = require("../../model/user/userRoleAssignment");
// const ApartmentRole = require("../../model/apartment/apartmentRole");
// const ApartmentPermission = require("../../model/apartment/apartmentPermission");
// const Apartment = require("../../model/apartment/apartmentModel"); // 👈 add

// exports.getMyPermissions = async (req, res) => {
//   try {
//     const { selectedRoleId, apartmentId: authApartmentId } = req.auth || {};

//     if (!selectedRoleId) {
//       return res.status(400).json({ message: "Missing role ID in token" });
//     }

//     // ✅ Step 1: Fetch role assignment to get actual ApartmentRole (and apartment if needed)
//     const roleAssignment = await UserRoleAssignment.findById(selectedRoleId)
//       .populate("role")
//       .populate("apartment", "_id"); // ensures we can read apartment from assignment too

//     if (!roleAssignment || !roleAssignment.role) {
//       return res
//         .status(404)
//         .json({ message: "Role assignment or role not found" });
//     }

//     // Resolve apartmentId from token-first, then assignment, then activeRole
//     const resolvedApartmentId =
//       authApartmentId ||
//       roleAssignment?.apartment?._id?.toString?.() ||
//       req?.activeRole?.apartment?._id?.toString?.() ||
//       req?.activeRole?.apartment?.toString?.() ||
//       null;

//     // 👉 Load plan features (types inside planSnapshot.settings) if we have an apartment
//     let planFeatures = [];
//     if (resolvedApartmentId) {
//       const apt = await Apartment.findById(resolvedApartmentId)
//         .select("planSnapshot.settings")
//         .lean();

//       if (apt?.planSnapshot?.settings?.length) {
//         // Only include services marked Active; return their `type`
//         planFeatures = apt.planSnapshot.settings
//           .filter((s) => s && s.status === "Active" && s.type)
//           .map((s) => s.type);
//       }
//     }

//     // ✅ Step 2: Load role with active permissions
//     const role = await ApartmentRole.findById(roleAssignment.role._id).populate(
//       {
//         path: "permissions",
//         match: { status: "Active" },
//         select: "name",
//       }
//     );

//     if (!role) {
//       return res.status(404).json({ message: "Apartment role not found" });
//     }

//     // ✅ Apartment admin gets all permissions
//     if (role.slug === "apartment-admin") {
//       const all = await ApartmentPermission.find({ status: "Active" }).select(
//         "name"
//       );
//       const allNames = all.map((perm) => perm.name);

//       return res.status(200).json({
//         permissions: allNames,
//         roleSlug: role.slug,
//         apartmentId: resolvedApartmentId || null, // 👈 added
//         planFeatures, // 👈 added (e.g., ["Visitors","Maintenance"])
//       });
//     }

//     const permissionNames = role.permissions.map((perm) => perm.name);

//     return res.status(200).json({
//       permissions: permissionNames,
//       roleSlug: role.slug,
//       apartmentId: resolvedApartmentId || null, // 👈 added
//       planFeatures, // 👈 added
//     });
//   } catch (error) {
//     console.error("🔐 Failed to get permissions:", error);
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const ApartmentRole = require("../../model/apartment/apartmentRole");
const ApartmentPermission = require("../../model/apartment/apartmentPermission");
const Apartment = require("../../model/apartment/apartmentModel");

/**
 * These are REAL plan features
 */
const FEATURE_GROUPS = [
  "Visitors",
  "Complaints",
  "Maintenance",
  "Amenities",
];

/**
 * Feature → Permission Groups mapping
 * 🔑 Expense is controlled ONLY via Maintenance
 */
const FEATURE_TO_PERMISSION_GROUPS = {
  Visitors: ["Visitors"],
  Complaints: ["Complaints"],
  Maintenance: ["Maintenance", "Expense"],
  Amenities: ["Amenities"],
};

exports.getMyPermissions = async (req, res) => {
  try {
    const { selectedRoleId, apartmentId: authApartmentId } = req.auth || {};
    if (!selectedRoleId) {
      return res.status(400).json({ message: "Missing role ID in token" });
    }

    // 1️⃣ Load role assignment
    const roleAssignment = await UserRoleAssignment.findById(selectedRoleId)
      .populate("role")
      .populate("apartment", "_id");

    if (!roleAssignment || !roleAssignment.role) {
      return res.status(404).json({ message: "Role assignment not found" });
    }

    const apartmentId =
      authApartmentId ||
      roleAssignment?.apartment?._id?.toString?.() ||
      req?.activeRole?.apartment?._id?.toString?.() ||
      req?.activeRole?.apartment?.toString?.();

    // 2️⃣ Load plan snapshot
    let allowedPermissionGroups = [];

    if (apartmentId) {
      const apt = await Apartment.findById(apartmentId)
        .select("planSnapshot")
        .lean();

      if (
        apt?.planSnapshot &&
        apt.planSnapshot.planPaidStatus === "paid" &&
        Array.isArray(apt.planSnapshot.settings)
      ) {
        for (const setting of apt.planSnapshot.settings) {
          if (
            setting &&
            setting.status === "Active" &&
            FEATURE_TO_PERMISSION_GROUPS[setting.type]
          ) {
            allowedPermissionGroups.push(
              ...FEATURE_TO_PERMISSION_GROUPS[setting.type]
            );
          }
        }
      }
    }

    // Remove duplicates
    allowedPermissionGroups = [...new Set(allowedPermissionGroups)];

    /**
     * 3️⃣ Permission filter
     * - Allow system permissions always
     * - Allow feature permissions ONLY if plan allows them
     */
    const FEATURE_CONTROLLED_GROUPS = Object.values(
      FEATURE_TO_PERMISSION_GROUPS
    ).flat();

    const permissionGroupFilter = {
      $or: [
        { group: { $nin: FEATURE_CONTROLLED_GROUPS } },
        { group: { $in: allowedPermissionGroups } },
      ],
    };

    // 4️⃣ Apartment Admin
    if (roleAssignment.role.slug === "apartment-admin") {
      const perms = await ApartmentPermission.find({
        status: "Active",
        ...permissionGroupFilter,
      }).select("name");

      return res.json({
        permissions: perms.map((p) => p.name),
        roleSlug: "apartment-admin",
        apartmentId,
        planFeatures: allowedPermissionGroups,
      });
    }

    // 5️⃣ Normal apartment roles
    const role = await ApartmentRole.findById(roleAssignment.role._id).populate({
      path: "permissions",
      match: {
        status: "Active",
        ...permissionGroupFilter,
      },
      select: "name",
    });

    if (!role) {
      return res.status(404).json({ message: "Apartment role not found" });
    }

    return res.json({
      permissions: role.permissions.map((p) => p.name),
      roleSlug: role.slug,
      apartmentId,
      planFeatures: allowedPermissionGroups,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
