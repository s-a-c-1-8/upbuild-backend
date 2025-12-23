const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    contactPerson: { type: String },
    serviceOffered: { type: [String], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    agreementFile: {
      name: { type: String },
      path: { type: String },
      type: { type: String },
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agency", agencySchema);
