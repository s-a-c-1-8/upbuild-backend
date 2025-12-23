const ApartmentSettings = require("../../../model/apartment/apartmentSettings");

// ✅ Update maintenance account mapping
const updateMaintenanceAccounts = async (req, res) => {
  try {
    const apartment = req.auth?.apartmentId;

    const { mode, monthlyAccount, corpusAccount, eventsAccount } = req.body;

    if (!apartment || !mode) {
      return res
        .status(400)
        .json({ message: "Apartment ID and mode are required." });
    }

    if (
      (mode === "same" && !monthlyAccount) ||
      (mode === "separate" &&
        (!monthlyAccount || !corpusAccount || !eventsAccount))
    ) {
      return res.status(400).json({ message: "Incomplete account selection." });
    }

    const updated = await ApartmentSettings.findOneAndUpdate(
      { apartment },
      {
        $set: {
          "settings.maintenanceAccounts.monthlyAccount": monthlyAccount,
          "settings.maintenanceAccounts.corpusAccount":
            mode === "same" ? monthlyAccount : corpusAccount,
          "settings.maintenanceAccounts.eventsAccount":
            mode === "same" ? monthlyAccount : eventsAccount,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Maintenance accounts updated successfully.",
      data: updated?.settings?.maintenanceAccounts,
    });
  } catch (err) {
    console.error("Error updating maintenance accounts:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Get mapped maintenance accounts
const getMaintenanceAccounts = async (req, res) => {
  try {
    // const { apartment } = req.body;
    const apartment = req.auth?.apartmentId;

    if (!apartment) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    const settingsDoc = await ApartmentSettings.findOne({ apartment })
      .populate(
        "settings.maintenanceAccounts.monthlyAccount",
        "referenceName accountNumber"
      )
      .populate(
        "settings.maintenanceAccounts.corpusAccount",
        "referenceName accountNumber"
      )
      .populate(
        "settings.maintenanceAccounts.eventsAccount",
        "referenceName accountNumber"
      );

    if (!settingsDoc) {
      return res
        .status(404)
        .json({ message: "Settings not found for apartment." });
    }

    return res.status(200).json({
      message: "Maintenance accounts fetched successfully.",
      data: settingsDoc.settings.maintenanceAccounts,
    });
  } catch (err) {
    console.error("Error fetching maintenance accounts:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  updateMaintenanceAccounts,
  getMaintenanceAccounts,
};
