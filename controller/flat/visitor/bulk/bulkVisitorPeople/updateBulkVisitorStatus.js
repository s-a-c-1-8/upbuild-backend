const UserRoleAssignment = require("../../../../../model/user/userRoleAssignment");
const { logAction } = require("../../../../../model/auditLog");
const VisitorsBulk = require("../../../../../model/flat/visitorBulk");

exports.updateBulkVisitorStatus = async (req, res) => {
  try {
    const { visitorId } = req.params;

    // 🛡️ Permission Check
    const selectedRoleId = req.auth?.selectedRoleId;
    if (!selectedRoleId) {
      return res.status(403).json({ message: "Access denied. No role selected." });
    }

    const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate({
      path: "role",
      populate: {
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      },
    });

    if (!roleAssignment || !roleAssignment.role) {
      return res.status(403).json({ message: "Access denied. Role not found." });
    }

    const roleSlug = roleAssignment.role.slug;
    const permissionNames = roleAssignment.role.permissions?.map((p) => p.name) || [];

    const isAllowed =
      roleSlug === "apartment-admin" ||
      roleSlug === "security" ||
      permissionNames.includes("can_edit_visitor_status");

    if (!isAllowed) {
      return res.status(403).json({
        message: "You do not have permission to update visitor status.",
      });
    }

    // ✅ Fetch the Bulk Visitor Document
    const doc = await VisitorsBulk.findOne({ "visitors._id": visitorId });
    if (!doc) return res.status(404).json({ message: "Visitor not found" });

    const visitor = doc.visitors.id(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found inside list" });

    const now = new Date();

    if (visitor.status === "Awaiting") {
      // ❗️Check occupantAcceptStatus before check-in
      if (visitor.occupantAcceptStatus !== "Accepted") {
        return res.status(400).json({ message: "Occupant has not accepted the visitor yet." });
      }
      visitor.status = "Checked-In";
      visitor.checkInTime = now;
    } else if (visitor.status === "Checked-In") {
      visitor.status = "Checked-Out";
      visitor.checkOutTime = now;
    } else {
      return res
        .status(400)
        .json({ message: `Cannot update visitor with status: ${visitor.status}` });
    }

    await doc.save();

    // Optional: Audit Logging
    await logAction?.({
      req,
      action: "UPDATE_BULK_VISITOR_STATUS",
      description: `Bulk visitor ${visitor.visitorInfoId} marked ${visitor.status}`,
      metadata: {
        bulkVisitorId: doc.bulkVisitorId,
        visitorId,
        newStatus: visitor.status,
        checkInTime: visitor.checkInTime,
        checkOutTime: visitor.checkOutTime,
      },
    });

    res.json({ message: `Status updated to ${visitor.status}`, visitor });
  } catch (err) {
    console.error("❌ updateBulkVisitorStatus Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
