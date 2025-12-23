const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true },
    planType: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    planId: { type: String, required: true, unique: true },
    planCost: { type: Number, required: true }, // totalAmount before discount
    discount: { type: Number, default: 0 }, // discount value
    discountType: {
      type: String,
      enum: ["percentage", "rupees"],
      default: "percentage",
    }, // discount type
    finalCost: { type: Number, required: true }, // totalAfterDiscount
    bufferTimeToPay: { type: Number },
    frequency: { type: String, required: true },
    description: { type: String },
    // complexAdminsAllowed: { type: Number, required: true },
    // tenantsAllowed: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    settings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service", // assuming you have a Service model
        required: true,
      },
    ],
  },
  { timestamps: true }
);

// Ensure single model definition across hot reloads
module.exports = mongoose.models.Plan || mongoose.model("Plan", planSchema);
