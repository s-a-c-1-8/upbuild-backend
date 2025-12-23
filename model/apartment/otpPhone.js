const mongoose = require("mongoose");

const phoneOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model("PhoneOtp", phoneOtpSchema);
