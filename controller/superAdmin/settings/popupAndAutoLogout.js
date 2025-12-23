const AppSettings = require("../../../model/superAdmin/appSettingsModel");

// 🟩 Create or Update Inactivity Settings
exports.updateInactivitySettings = async (req, res) => {
  try {
    const {
      popupAfter,        // in minutes from frontend
      autoLogoutAfter,   // in minutes from frontend
    } = req.body;

    if (
      typeof popupAfter !== "number" ||
      typeof autoLogoutAfter !== "number"
    ) {
      return res.status(400).json({ message: "Both fields must be numbers." });
    }

    const updateData = {
      "settings.inactivity.popupAfter": popupAfter * 60 * 1000,      // to ms
      "settings.inactivity.autoLogoutAfter": autoLogoutAfter * 60 * 1000,
    };

    const updated = await AppSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Inactivity settings updated successfully.",
      settings: updated.settings.inactivity,
    });

  } catch (error) {
    console.error("❌ Error updating inactivity settings:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// 🟦 Get Inactivity Settings
exports.getInactivitySettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOne();
    if (!settings || !settings.settings?.inactivity) {
      return res.status(404).json({ message: "Inactivity settings not found." });
    }

    const inactivity = settings.settings.inactivity;

    return res.status(200).json({
      popupAfter: inactivity.popupAfter / (60 * 1000),       // return in minutes
      autoLogoutAfter: inactivity.autoLogoutAfter / (60 * 1000),
    });

  } catch (error) {
    console.error("❌ Error fetching inactivity settings:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};
