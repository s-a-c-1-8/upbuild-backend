const mongoose = require("mongoose");

const bookingAmenitySchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    amenity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Amenity",
      required: true,
    },
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true, // optional in case booked by non-flat entity
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
      required: true,
    },

    // Booking details
    bookingDate: { type: Date, required: true }, // selected date
    timeSlot: { type: String, required: true }, // e.g. "6:00 AM – 7:00 AM"
    status: {
      type: String,
      enum: ["pending", "cancelled", "completed"],
      default: "pending",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BookingAmenity", bookingAmenitySchema);
