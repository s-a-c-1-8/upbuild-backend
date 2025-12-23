const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    igstPer: { type: Number, default: 0 },
    cgstPer: { type: Number, default: 0 },
    sgstPer: { type: Number, default: 0 },
    hsnCode: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    type: {
      type: String,
      enum: ["Visitors", "Complaints", "Maintenance","Amenities"],
      required: true,
    }, // <— NEW
    totalTax: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
