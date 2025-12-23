// models/auditLogModel.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
    },
    role: {
      type: String, // you can also use: type: mongoose.Schema.Types.ObjectId, ref: "Role"
    },
    action: { type: String, required: true },
    description: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
