const AppSettings = require("../../../model/superAdmin/appSettingsModel");

// 🟩 Create or Update OTP Settings
exports.updateOtpSettings = async (req, res) => {
  try {
    const {
      otpMaxAttempts,
      otpCooldownTime, // in seconds
      otpWindow,       // in minutes
    } = req.body;

    if (
      typeof otpMaxAttempts !== "number" ||
      typeof otpCooldownTime !== "number" ||
      typeof otpWindow !== "number"
    ) {
      return res.status(400).json({ message: "All fields must be numbers." });
    }

    const updatedSettings = {
      "settings.otp.otpMaxAttempts": otpMaxAttempts,
      "settings.otp.otpCooldownTime": otpCooldownTime * 1000,
      "settings.otp.otpWindow": otpWindow * 60 * 1000,
    };

    const existing = await AppSettings.findOne();

    if (existing) {
      await AppSettings.updateOne({}, { $set: updatedSettings });
      return res.status(200).json({ message: "OTP settings updated successfully." });
    } else {
      const newSettings = new AppSettings({ settings: { otp: updatedSettings["settings.otp"] } });
      await newSettings.save();
      return res.status(201).json({ message: "OTP settings created successfully." });
    }
  } catch (error) {
    console.error("❌ Error updating OTP settings:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// 🟦 Get OTP Settings
exports.getOtpSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOne();
    if (!settings || !settings.settings?.otp) {
      return res.status(404).json({ message: "OTP settings not found." });
    }

    const otp = settings.settings.otp;

    return res.status(200).json({
      otpMaxAttempts: otp.otpMaxAttempts,
      otpCooldownTime: otp.otpCooldownTime / 1000, // seconds
      otpWindow: otp.otpWindow / (60 * 1000),       // minutes
    });
  } catch (error) {
    console.error("❌ Error fetching OTP settings:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};
