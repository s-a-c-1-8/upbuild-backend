const mongoose = require("mongoose");

const apartmentPermissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    // apartment: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Apartment",
    //   required: true,
    // },
    group: {
      type: String,
      required: true, // ✅ make it required
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ApartmentPermission",
  apartmentPermissionSchema
);
