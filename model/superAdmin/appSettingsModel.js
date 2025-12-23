const mongoose = require("mongoose");

const appSettingsSchema = new mongoose.Schema({
  settings: {
    otp: {
      otpMaxAttempts: {
        type: Number,
        default: 5,
      },
      otpCooldownTime: {
        type: Number, // in milliseconds
        default: 60000,
      },
      otpWindow: {
        type: Number, // in milliseconds
        default: 60 * 60 * 1000,
      },
    },
    inactivity: {
      popupAfter: {
        type: Number, // in milliseconds
        default: 5 * 60 * 1000, // 5 minutes
      },
      autoLogoutAfter: {
        type: Number, // in milliseconds
        default: 10 * 60 * 1000, // 10 minutes
      },
    },
    // Add more nested config sections like notifications, UI, etc.
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("AppSettings", appSettingsSchema);
