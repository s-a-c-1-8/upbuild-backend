const mongoose = require("mongoose");

const flatContributionSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["paid", "pending"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    eventDate: {
      type: Date,
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
    },
    minDonation: Number,
    maxDonation: Number,

    contributeCount: {
      type: Number,
      default: 0,
    },

    contributions: [flatContributionSchema],

    // ✅ Bank details (linked from apartment settings)
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    referenceName: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventFlatMaintenance", eventSchema);
