// controllers/apartmentSettings.controller.js
const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");


// ✅ Get default line item
exports.getDefaultLineItem = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID missing from auth",
      });
    }

    const settings = await ApartmentSettings.findOne({ apartment: apartmentId })
      .populate("settings.defaultMaintenanceLineItem")
      .lean();

    if (!settings || !settings.settings.defaultMaintenanceLineItem) {
      return res.json({
        success: true,
        message: "No default line item set",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "Default maintenance line item fetched successfully",
      data: settings.settings.defaultMaintenanceLineItem,
    });
  } catch (error) {
    console.error("Error fetching default line item:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
