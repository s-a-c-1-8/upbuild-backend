const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: {
      type: String,
      required: true,
      unique: true, // So no duplicates in DB
    },  
    description: { type: String },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", RoleSchema);
