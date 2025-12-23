const mongoose = require("mongoose");

const ApartmentRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    group: {
      type: String,
      enum: ["Admins", "Board-members", "Staff", "Residents"],
      default: "Residents",
    },
    permissions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ApartmentPermission" },
    ],
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Unique constraint on (slug + apartment)
ApartmentRoleSchema.index({ slug: 1, apartment: 1 }, { unique: true });

// module.exports = mongoose.model("ApartmentRole", ApartmentRoleSchema);

module.exports =
  mongoose.models.ApartmentRole ||
  mongoose.model("ApartmentRole", ApartmentRoleSchema);
