// utils/logAction.js
const AuditLog = require("../model/auditLog");

const logAction = async ({ req, action, description, metadata = {} }) => {
  try {
    const log = new AuditLog({
      userId: req.user?._id,
      apartmentId: req.activeRole?.apartment?._id || null,
      flatId: req.activeRole?.flat?._id || null,
      role: req.activeRole?.role?.slug || null, // or .name based on your setup
      action,
      description,
      metadata,
    });
    await log.save();
  } catch (err) {
    console.error("🔴 Audit log failed:", err.message);
  }
};

module.exports = logAction;
