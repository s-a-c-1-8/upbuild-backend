// controllers/event/getEventDetails.js

const EventFlatMaintenance = require("../../../../model/flat/maintenance/events");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../../model/apartment/apartmentrole");

const getEventDetailsById = async (req, res) => {
  const { id } = req.params;

  const flatIdFromToken = req.auth?.flatId || null;
  const selectedRoleId = req.auth?.selectedRoleId || null;

  if (!id || id.length !== 24) {
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }

  try {
    let roleSlug = "";
    let hasPermission = false;

    // ✅ Get role & check access
    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");

      if (!roleAssignment || !roleAssignment.role) {
        return res.status(403).json({
          success: false,
          message: "Invalid role assignment.",
        });
      }

      roleSlug = roleAssignment.role.slug;

      if (
        roleSlug === "apartment-admin" ||
        roleSlug === "occupants"
      ) {
        hasPermission = true;
      } else {
        const fullRole = await ApartmentRole.findById(roleAssignment.role._id)
          .populate({
            path: "permissions",
            match: { status: "Active" },
            select: "name",
          });

        const permissionNames = fullRole.permissions.map((perm) => perm.name);
        hasPermission = permissionNames.includes("can_view_maintenance_page_with_all_data");
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this event.",
      });
    }

    // ✅ Fetch event
    const event = await EventFlatMaintenance.findById(id)
      .populate("apartmentId", "name location")
      .populate("contributions.flatId", "flatName blockName")
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // 🔒 Occupant restriction to own flat only
    if (roleSlug === "occupants" && flatIdFromToken) {
      event.contributions = event.contributions?.filter((c) =>
        c.flatId && c.flatId._id?.toString() === flatIdFromToken.toString()
      ) || [];
    }

    return res.status(200).json({ success: true, event });
  } catch (err) {
    console.error("❌ Error in getEventDetailsById:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = getEventDetailsById;
