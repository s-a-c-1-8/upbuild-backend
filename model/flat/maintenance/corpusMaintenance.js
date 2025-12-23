const mongoose = require("mongoose");

const flatShareSchema = new mongoose.Schema(
  {
    maintenanceId: {
      type: String,
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    penaltyReasons: [
      {
        description: { type: String },
        price: { type: Number },
        waived: { type: Boolean, default: false }, // ✅ track waived state
      },
    ],

    status: {
      type: String,
      enum: ["paid", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const corpusFlatMaintenanceSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    month: {
      type: String, // Format: "2025-06"
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    maintenance: [flatShareSchema],

    // Optional reasons (description + price)
    reasons: [
      {
        description: { type: String },
        price: { type: Number },
      },
    ],

    // ✅ NEW: Store penalty info
    penaltyInfo: {
      fixedFine: {
        amount: { type: Number, default: 0 },
        type: { type: String, default: "fixed" },
      },
      dailyFine: {
        perDay: { type: Number, default: 0 },
        type: { type: String, default: "daily" },
      },
      penaltyStartDate: { type: Date },
    },

    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    ifscCode: {
      type: String,
      required: true,
    },
    referenceName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicates for same apartment + month
// corpusFlatMaintenanceSchema.index(
//   { apartmentId: 1, month: 1 },
//   { unique: true }
// );

module.exports = mongoose.model(
  "CorpusFlatMaintenance",
  corpusFlatMaintenanceSchema
);
