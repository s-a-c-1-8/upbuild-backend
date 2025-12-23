const mongoose = require("mongoose");

const visitorEntrySchema = new mongoose.Schema(
  {
    visitorInfoId: String, // 👈 Add this custom readable ID
    name: String,
    phoneNumber: String,
    address: String,
    gender: String,
    vehicleType: String,
    vehicleNumber: String,
    occupantAcceptStatus: {
      type: String,
      default: "Pending",
    },
    status: { type: String, default: "Awaiting" },
    photo: String,
    vehiclePhoto: String,
    qrCode: String, // ✅ ADD THIS LINE
    addedAt: { type: Date, default: Date.now },
    checkInTime: Date, // ✅ new field
    checkOutTime: Date, // ✅ new field
  },
  { _id: true }
); // You can add more fields as needed

const visitoreBulkSchema = new mongoose.Schema(
  {
    bulkVisitorId: {
      type: String,
      required: true,
      unique: true,
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: false,
    },
    eventPurpose: {
      type: String,
      required: true,
    },
    expectedCount: {
      type: Number,
      required: true,
    },
    isMultipleDays: {
      type: Boolean,
      default: false,
    },
    bulkVisitorLink: {
      type: String,
      required: false,
    },
    visitDate: String, // for single day
    fromDate: String, // for multi-day
    toDate: String,
    fromTime: String,
    toTime: String,
    notes: {
      type: String,
      default: "",
    },
    visitors: [visitorEntrySchema], // 👈 ADD THIS!
  },
  { timestamps: true }
);

module.exports = mongoose.model("VisitorsBulk", visitoreBulkSchema);
