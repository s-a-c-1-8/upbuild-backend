const mongoose = require("mongoose");

const serviceSnapshotSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, // original ref (optional)
    name: String,
    description: String,
    amount: Number,
    igstPer: Number,
    cgstPer: Number,
    sgstPer: Number,
    hsnCode: String,
    status: { type: String, enum: ["Active", "Inactive"] },
    type: {
      type: String,
      enum: ["Visitors", "Complaints", "Maintenance", "Amenities"],
    },
    totalTax: Number,
    totalAmount: Number,
  },
  { _id: false }
);

const planSnapshotSchema = new mongoose.Schema(
  {
    planRef: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }, // original ref
    planName: String,
    planType: String,
    slug: String,
    planId: String,
    planCost: Number,
    discount: Number,
    discountType: { type: String, enum: ["percentage", "rupees"] },
    finalCost: Number,
    bufferTimeToPay: Number,
    frequency: String,
    description: String,
    complexAdminsAllowed: Number,
    tenantsAllowed: Number,
    settings: [serviceSnapshotSchema], // frozen copy of services at purchase time
    capturedAt: { type: Date, default: Date.now },
    planPaidStatus: {
      type: String,
      enum: ["unpaid", "paid", "pending", "failed"],
      default: "unpaid",
    },
    planPaidAt: { type: Date },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    path: { type: String, required: true },
  },
  { _id: false }
);

const policySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    path: { type: String, required: true },
    description: { type: String, default: "" },
    fromDate: { type: Date },
    toDate: { type: Date },
  },
  { _id: false }
);

const meterSchema = new mongoose.Schema({
  number: { type: String, required: false },
  description: { type: String, default: "" },
});

// ✅ Amenity Schema (with live maintenance info)
const apartmentAmenitySchema = new mongoose.Schema(
  {
    amenity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Amenity",
      required: true,
    },
    type: {
      type: String,
      enum: ["always", "time", "booking"],
      default: "always",
    },
    schedule: {
      type: [
        {
          fromTime: { type: String },
          toTime: { type: String },
        },
      ],
      default: [],
    },
    // 🧰 Live maintenance state (used for blocking bookings)
    maintenance: {
      fromDate: { type: String },
      fromTime: { type: String },
      fromPeriod: { type: String },
      toDate: { type: String },
      toTime: { type: String },
      toPeriod: { type: String },
      reason: { type: String, default: "" },
    },
  },
  { _id: false }
);

const apartmentSchema = new mongoose.Schema(
  {
    apartmentId: { type: String, unique: true },
    name: { type: String, required: true }, // building name

    // planId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Plan",
    // },
    planSnapshot: planSnapshotSchema,
    // optional lifecycle tracking
    planActivatedAt: { type: Date },
    planExpiresAt: { type: Date },

    approved: { type: Boolean, default: false },
    // 🔥 New Status Field (Active/Inactive)
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Inactive", // <= default inactive
    },

    // 🔹 Basic Info
    builderName: { type: String }, // New field (text)
    builder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Builder", // Reference to Builder model
    },
    blockName: { type: String },
    propertyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyType",
    },
    numberOfUnits: { type: String },
    yearBuilt: { type: String },
    squareFootage: { type: String },
    noOfGates: { type: String },
    powerMeter: [meterSchema], // ✅ updated to accept array of objects
    waterMeter: [meterSchema], // ✅ updated to accept array of objects
    description: { type: String },
    amenities: [apartmentAmenitySchema],

    // ✅ Updated
    apartmentPhoto: [attachmentSchema], // multiple images
    apartmentPolicies: [policySchema], // PDFs with metadata
    alternativeEmail: {
      type: String,
      trim: true,
      default: "",
    },
    apartmentAddress: {
      addressLine1: String,
      city: String,
      state: String,
      landmark: String,
      fullAddress: String,
      latitude: Number,
      longitude: Number,
    },

    // 🔹 Admin User
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Apartment", apartmentSchema);
