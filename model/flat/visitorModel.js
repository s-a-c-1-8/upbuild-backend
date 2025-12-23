const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    name: String,
    phoneNumber: { type: String, required: true, unique: true },
    address: String,
    gender: String,
    photo: String,
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Visitor", visitorSchema);
