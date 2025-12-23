const FlatBulkVisitor = require("../../../../../model/flat/visitorBulk");
const UserRoleAssignment = require("../../../../../model/user/userRoleAssignment");

exports.getBulkVisitorLink = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedRoleId = req.auth?.selectedRoleId || null;
    const userFlatId = req.auth?.flatId || null;

    const visitor = await FlatBulkVisitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ message: "Bulk visitor entry not found" });
    }

    let allowed = false;
    let roleSlug = "";

    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate({
        path: "role",
        populate: { path: "permissions" }
      });
      const role = roleAssignment?.role;
      if (role) roleSlug = role.slug;
      
      // Admin (apartment-admin) can always access
      if (roleSlug === "apartment-admin") {
        allowed = true;
      }

      // If occupant, must match their own flat
      else if (
        roleSlug === "occupants" &&
        userFlatId &&
        visitor.flatId &&
        String(visitor.flatId) === String(userFlatId)
      ) {
        allowed = true;
      }

      // Any other role: needs correct permission
      else if (
        role?.permissions &&
        role.permissions.some(
          perm => perm.name === "can_copy_bulk_visitor_link" && perm.status === "Active"
        )
      ) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ message: "Not authorized to view/copy this link." });
    }

    return res.json({
      bulkVisitorId: visitor.bulkVisitorId,
      bulkVisitorLink: visitor.bulkVisitorLink,
    });
  } catch (err) {
    console.error("Error in getBulkVisitorLink:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};
