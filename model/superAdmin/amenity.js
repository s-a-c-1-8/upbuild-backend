const mongoose = require("mongoose");

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    // type: {
    //   type: String,
    //   enum: ["always", "time", "booking"],
    //   required: true,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Amenity", amenitySchema);
