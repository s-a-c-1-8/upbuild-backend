const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

// 🔹 Save default maintenance calculation type
exports.setMaintenanceType = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID missing from auth",
      });
    }

    const { calculationType } = req.body;
    if (!calculationType) {
      return res.status(400).json({
        success: false,
        message: "calculationType is required",
      });
    }

    // validate value
    const validTypes = ["perFlat", "perSqFeet", "perFlatWithItems"];
    if (!validTypes.includes(calculationType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid calculationType",
      });
    }

    const updated = await ApartmentSettings.findOneAndUpdate(
      { apartment: apartmentId },
      { $set: { "settings.defaultMaintenanceType": calculationType } },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      success: true,
      message: "Default maintenance type updated successfully",
      data: updated.settings.defaultMaintenanceType,
    });
  } catch (error) {
    console.error("Error setting default maintenance type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔹 Fetch default maintenance calculation type
exports.getMaintenanceType = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID missing from auth",
      });
    }

    const settings = await ApartmentSettings.findOne({ apartment: apartmentId })
      .select("settings.defaultMaintenanceType settings.defaultMaintenanceLineItem")
      .populate("settings.defaultMaintenanceLineItem")
      .lean();

    const type = settings?.settings?.defaultMaintenanceType || "perFlat";

    // ✅ response payload
    const response = {
      success: true,
      message: "Fetched maintenance type successfully",
      data: type,
    };

    if (type === "perFlatWithItems" && settings?.settings?.defaultMaintenanceLineItem) {
      response.defaultLineItem = settings.settings.defaultMaintenanceLineItem;
    }

    return res.json(response);
  } catch (error) {
    console.error("Error fetching maintenance type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
