// const mongoose = require("mongoose");

// const occupantSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   phoneNumber: {
//     type: String,
//     required: true,
//   },
// });

// const tenantDetailsSchema = new mongoose.Schema({
//   tenantName: {
//     type: String,
//     required: true,
//   },
//   tenantPhoneNumber: {
//     type: String,
//     required: true,
//   },
//   tenantEmail: {
//     type: String,
//     required: true,
//   },
//   startDate: {
//     type: String,
//     required: true,
//   },
//   endDate: {
//     type: String,
//     required: true,
//   },
//   active: {
//     type: Boolean,
//     default: true,
//   },
//   agreementFile: {
//     type: String, // Assuming this is the file path or URL
//   },
//   occupants: [occupantSchema], // List of occupants
// });

// const flatSchema = new mongoose.Schema(
//   {
//     apartmentId: {
//       type: mongoose.Schema.Types.ObjectId, // Reference to the Apartment model (if it's a related model)
//       ref: "Apartment", // Assuming you have an Apartment model
//       required: true,
//     },
//     flatName: String,
//     ownerStaying: { type: Boolean, default: true },
//     flatType: String,
//     blockName: String,
//     facing: String,
//     squareFootage: String,
//     landmark: String,
//     city: String,
//     state: String,
//     fullAddress: String,
//     latitude: Number,
//     longitude: Number,
//     ownerName: String,
//     ownerPhoneNumber: String,
//     ownerEmail: String,
//     age: Number,
//     gender: String,
//     powerMeterNumber: String,
//     stpMeterNumber: String,
//     additionalDetails: String,
//     apartmentStatus: {
//       type: String,
//       enum: ["occupied", "empty"],
//       default: "empty",
//     },
//     tenantDetails: tenantDetailsSchema, // Tenant details if tenant exists
//     occupantsData: [occupantSchema], // For occupant data directly without tenant info
//   },
//   {
//     timestamps: true, // ✅ Adds createdAt and updatedAt
//   }
// );
// // ✅ Add this line to enforce uniqueness of flatName within apartment + block
// flatSchema.index(
//   { apartmentId: 1, blockName: 1, flatName: 1 },
//   { unique: true }
// );
// const Flat = mongoose.model("Flat", flatSchema);

// module.exports = Flat;

const mongoose = require("mongoose");

const flatSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    flatName: { type: String, required: true },
    flatType: String, // e.g., 2BHK, 3BHK
    blockName: String,
    facing: String,
    squareFootage: String,
    ownerStaying: { type: Boolean, default: true },
    // 📍Location
    landmark: String,
    city: String,
    state: String,
    fullAddress: String,
    latitude: Number,
    longitude: Number,

    // 🔌 Meters
    powerMeterNumber: String,
    stpMeterNumber: String,
    saleDeedFile: { type: String },
    parkingFiles: [{ type: String }],

    additionalDetails: String,

    // 🔄 Status of the flat (vacant or occupied)
    apartmentStatus: {
      type: String,
      enum: ["occupied", "empty"],
      default: "empty",
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Unique flat per apartment + block
flatSchema.index(
  { apartmentId: 1, blockName: 1, flatName: 1 },
  { unique: true }
);

module.exports = mongoose.model("Flat", flatSchema);
