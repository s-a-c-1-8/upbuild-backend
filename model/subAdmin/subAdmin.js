const mongoose = require("mongoose");

const subAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Email is required and must be unique
    password: { type: String, required: true },
    passwordSetDate: {
      type: Date,
      default: Date.now,
    },
    // store old password when expired
    oldPassword: { type: String, default: null },
    oldPasswordDate: { type: Date, default: null },

    // 🔥 Forgot Password Reset Link / Token
    forgotPassLink: {
      type: String,
      default: null, // will be filled only when forgot password is requested
    },
    userRole: {
      type: String,
      enum: ["subAdmin"],
      default: "subAdmin",
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubAdmin", subAdminSchema);
