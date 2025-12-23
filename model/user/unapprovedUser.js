const mongoose = require("mongoose");

const unapprovedUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: false, trim: true },
    contactNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null, // Apartment-level roles won't need this
    },
    // email: {
    //   type: String,
    //   unique: true,
    //   sparse: true, // In case some users sign up with just phone
    //   trim: true,
    // },
    // age: {
    //   type: Number,
    //   default: null,
    // },
    // image: { type: String }, // Profile image URL or path

    // gender: {
    //   type: String,
    //   default: null,
    // },
    isMobileVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    // address: { type: String },
    // image: { type: String }, // Profile image URL or path
    // status: {
    //   type: String,
    //   enum: ["Active", "Inactive"],
    //   default: "Active",
    // },

    // 🔐 OTP login fields
    otp: { type: String },
    lastOtpSentAt: { type: Date },
    otpAttempts: {
      count: { type: Number, default: 0 },
      lastAttemptTime: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UnapprovedUser", unapprovedUserSchema);
