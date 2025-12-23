const mongoose = require("mongoose");

const visitorLogSchema = new mongoose.Schema(
  {
    visitorLogId: {
      type: String,
      required: true,
      unique: true,
    },
    visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: false,
    },
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    clockInTime: { type: Date },
    clockOutTime: { type: Date }, // ✅ no default!
    purpose: String,
    scheduleDate: { type: String },
    scheduleFrom: { type: String },
    scheduleTo: { type: String },
    visitorType: String,
    vehicleType: String,
    vehicleNumber: String,
    vehiclePhoto: String,
    qrCode: { type: String },
    status: {
      type: String,
      enum: [
        "Awaiting",
        "Checked-In",
        "Checked-Out",
        "Wrong Entry",
        "Rejected",
      ],
      default: "Awaiting",
    },
    occupantAcceptStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "N/A"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VisitorLog", visitorLogSchema);
