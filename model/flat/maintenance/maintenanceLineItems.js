// models/apartmentMonthlyMaintenanceLineItems.model.js
const mongoose = require("mongoose");

const ReasonSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PenaltySettingsSchema = new mongoose.Schema(
  {
    fixed: {
      amount: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ["₹", "%"], default: "₹" }, // ✅ currency or percentage
    },
    daily: {
      amount: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ["₹", "%"], default: "₹" },
    },
    startDay: { type: Number, default: 1, min: 1, max: 30 }, // ✅ penalty start day
  },
  { _id: false }
);

const ApartmentMonthlyMaintenanceLineItemsSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    lineItemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    reasons: {
      type: [ReasonSchema], // ✅ only global/common reasons
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    applyPenalty: {
      type: Boolean,
      default: false, // ✅ flag if penalty applies
    },
    tenantCharge: {
      type: Number,
      default: 0, // ✅ separate subletting/tenant charge (per tenant flat)
      min: 0,
    },
    penaltySettings: {
      type: PenaltySettingsSchema,
      default: {}, // ✅ embed penalty structure
    },
  },
  { timestamps: true }
);

// ✅ Enforce uniqueness of lineItemName per apartment
ApartmentMonthlyMaintenanceLineItemsSchema.index(
  { apartment: 1, lineItemName: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ApartmentMonthlyMaintenanceLineItems",
  ApartmentMonthlyMaintenanceLineItemsSchema
);
