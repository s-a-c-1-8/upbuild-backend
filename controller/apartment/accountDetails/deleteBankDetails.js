// controllers/bankDetails.controller.js
const mongoose = require("mongoose");
const ApartmentBankDetails = require("../../../model/apartment/bankDetailsModel");
const ApartmentSettings = require("../../../model/apartment/apartmentSettings");

const deleteBankDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Bank ID is required or invalid.",
      });
    }

    const bankDoc = await ApartmentBankDetails.findById(id);
    if (!bankDoc) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found.",
      });
    }

    const bankId = new mongoose.Types.ObjectId(id);

    // Find if this bank is used in any ApartmentSettings
    const usage = await ApartmentSettings.findOne({
      apartment: bankDoc.apartment,
      $or: [
        { "settings.maintenanceAccounts.monthlyAccount": bankId },
        { "settings.maintenanceAccounts.corpusAccount": bankId },
        { "settings.maintenanceAccounts.eventsAccount": bankId },
      ],
    });

    if (usage) {
      const usedIn = [];

      if (
        usage.settings?.maintenanceAccounts?.monthlyAccount?.toString() === id
      ) {
        usedIn.push("Monthly");
      }
      if (
        usage.settings?.maintenanceAccounts?.corpusAccount?.toString() === id
      ) {
        usedIn.push("Corpus");
      }
      if (
        usage.settings?.maintenanceAccounts?.eventsAccount?.toString() === id
      ) {
        usedIn.push("Events");
      }

      return res.status(400).json({
        success: false,
        message: `This bank account is currently used in the following maintenance settings: ${usedIn.join(
          ", "
        )}. Please update or remove those references before deleting.`,
        usedIn,
      });
    }

    // ✅ Safe to delete
    await ApartmentBankDetails.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Bank account deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting bank account:", err);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

module.exports = { deleteBankDetails };
