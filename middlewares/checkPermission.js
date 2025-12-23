const SubAdmin = require("../model/subAdmin/subAdmin");
const Role = require("../model/superAdmin/role");
const Permission = require("../model/superAdmin/permission");
const UserRoleAssignment = require("../model/user/userRoleAssignment");

const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.superAdmin || req.subAdmin || req.user;
      const userRole = req.superAdmin
        ? "superAdmin"
        : req.subAdmin
        ? "subAdmin"
        : req.user
        ? "user"
        : null;

      if (!user || !userRole) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // console.log("🔍 Checking permission for:", permissionName);
      // console.log("👤 User:", {
      //   id: user._id,
      //   role: userRole,
      // });

      // ✅ SuperAdmin bypass
      if (userRole === "superAdmin") {
        console.log("✅ SuperAdmin detected. Bypassing permission checks.");
        return next();
      }

      // ✅ SubAdmin check
      if (userRole === "subAdmin") {
        const populatedSubAdmin = await SubAdmin.findById(user._id).populate({
          path: "role",
          populate: { path: "permissions" },
        });

        if (!populatedSubAdmin || !populatedSubAdmin.role) {
          return res.status(403).json({ message: "SubAdmin role not found" });
        }

        const hasPermission = populatedSubAdmin.role.permissions.some(
          (perm) => perm.name === permissionName && perm.status === "Active"
        );

        if (!hasPermission) {
          console.log(`⛔ SubAdmin lacks permission: ${permissionName}`);
          return res.status(403).json({ message: "Permission denied" });
        }

        console.log(`✅ SubAdmin has permission: ${permissionName}`);
        return next();
      }

      // ✅ Apartment User check
      if (userRole === "user") {
        const activeRole = req.activeRole;

        if (!activeRole) {
          return res.status(400).json({ message: "Role not selected." });
        }

        // Populate permissions
        await activeRole.populate({
          path: "role",
          populate: { path: "permissions" },
        });

        if (!activeRole.role) {
          return res.status(403).json({ message: "Apartment role not found" });
        }

        // ✅ Bypass permission check if slug is 'apartment-admin'
        if (activeRole.role.slug === "apartment-admin") {
          // console.log("✅ Apartment Admin detected. Bypassing permission checks.");
          return next();
        }

        const hasApartmentPermission = activeRole.role.permissions.some(
          (perm) => perm.name === permissionName && perm.status === "Active"
        );

        if (!hasApartmentPermission) {
          console.log(`⛔ User ${user._id} lacks permission: ${permissionName}`);
          return res.status(403).json({ message: "Permission denied" });
        }

        console.log(`✅ User ${user._id} has permission: ${permissionName}`);
        return next();
      }

      return res.status(403).json({ message: "Unknown user role" });
    } catch (err) {
      console.error("🚨 Permission check error:", err);
      return res.status(500).json({ message: "Server error in permission check" });
    }
  };
};

module.exports = checkPermission;
