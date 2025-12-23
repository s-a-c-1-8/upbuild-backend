const mongoose = require("mongoose");

const userRoleAssignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null, // Apartment-level roles won't need this
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApartmentRole",
      required: true,
    },
    active: { type: Boolean, default: true },

    // Optional: Dates for tenants, occupants, etc.
    startDate: Date,
    endDate: Date,
    
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      default: null,
    },

    // Optional: For tenant roles
    agreementFile: {
      type: String, // File path or URL to PDF
    },
    relationshipType: {
      type: String,
      enum: ["owner", "tenant", "owner_occupant", "tenant_occupant"],
      required: false,
    },
  },
  { timestamps: true }
);

// 🛡️ Prevent duplicate role assignments for same user+flat+role (optional)
userRoleAssignmentSchema.index(
  { user: 1, apartment: 1, flat: 1, role: 1 },
  { unique: false }
);

module.exports = mongoose.model("UserRoleAssignment", userRoleAssignmentSchema);
