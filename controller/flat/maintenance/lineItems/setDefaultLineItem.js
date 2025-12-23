// controllers/apartmentSettings.controller.js
const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

exports.setDefaultLineItem = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID missing from auth",
      });
    }

    const { lineItemId } = req.body;
    if (!lineItemId) {
      return res.status(400).json({
        success: false,
        message: "Line item ID is required",
      });
    }

    const updated = await ApartmentSettings.findOneAndUpdate(
      { apartment: apartmentId },
      { $set: { "settings.defaultMaintenanceLineItem": lineItemId } },
      { new: true, upsert: true }
    )
      .populate("settings.defaultMaintenanceLineItem") // optional: to return full line item details
      .lean();

    return res.json({
      success: true,
      message: "Default maintenance line item set successfully",
      data: updated.settings.defaultMaintenanceLineItem,
    });
  } catch (error) {
    console.error("Error setting default line item:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
