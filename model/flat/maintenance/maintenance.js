// const mongoose = require("mongoose");

// const flatShareSchema = new mongoose.Schema(
//   {
//     maintenanceId: {
//       type: String,
//       required: true,
//     },
//     flatId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Flat",
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["paid", "pending"],
//       default: "pending",
//     },
//   },
//   { timestamps: true }
// );

// const monthlyFlatMaintenanceSchema = new mongoose.Schema(
//   {
//     apartmentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Apartment",
//       required: true,
//     },
//     month: {
//       type: String, // Format: "2025-06"
//       required: true,
//     },
//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     maintenance: [flatShareSchema],

//     // Optional reasons (description + price)
//     reasons: [
//       {
//         description: { type: String },
//         price: { type: Number },
//       },
//     ],

//     // ✅ Bank info for monthly maintenance
//     bankName: { type: String, required: true },
//     accountNumber: { type: String, required: true },
//     ifscCode: { type: String, required: true },
//     referenceName: { type: String, required: true },
//   },
//   { timestamps: true }
// );

// // Prevent duplicates for same apartment + month
// monthlyFlatMaintenanceSchema.index(
//   { apartmentId: 1, month: 1 },
//   { unique: true }
// );

// module.exports = mongoose.model(
//   "MonthlyFlatMaintenance",
//   monthlyFlatMaintenanceSchema
// );

const mongoose = require("mongoose");

// Each flat's maintenance info
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
    status: {
      type: String,
      enum: ["paid", "pending"],
      default: "pending",
    },
    // ✅ Per-flat reasons
    reasons: [
      {
        description: { type: String },
        price: { type: Number },
        waived: { type: Boolean, default: false }, // ✅ track waived state
      },
    ],
    // ✅ Optional open/penalty date for this flat
  },
  { timestamps: true }
);

const penaltySettingsSchema = new mongoose.Schema(
  {
    fixed: {
      amount: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ["₹", "%"], default: "₹" },
    },
    daily: {
      amount: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ["₹", "%"], default: "₹" },
    },
    startDate: { type: Date, default: null }, // ✅ this line is crucial
  },
  { _id: false }
);

// Main monthly maintenance schema
const monthlyFlatMaintenanceSchema = new mongoose.Schema(
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
    penaltySettings: { type: penaltySettingsSchema, default: null },

    maintenance: [flatShareSchema], // Array of flats with their details

    // // ✅ Optional global reasons (if needed)
    // reasons: [
    //   {
    //     description: { type: String },
    //     price: { type: Number },
    //   },
    // ],

    // Bank info for monthly maintenance
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    referenceName: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent duplicates for same apartment + month
monthlyFlatMaintenanceSchema.index(
  { apartmentId: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "MonthlyFlatMaintenance",
  monthlyFlatMaintenanceSchema
);
