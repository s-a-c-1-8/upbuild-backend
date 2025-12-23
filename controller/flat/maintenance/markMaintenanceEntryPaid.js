const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");

exports.markMaintenanceEntryPaid = async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Maintenance entry ID is required.",
      });
    }

    // Find and update the specific maintenance entry
    const result = await MonthlyFlatMaintenance.findOneAndUpdate(
      { "maintenance._id": entryId },
      { $set: { "maintenance.$.status": "paid" } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Maintenance entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Maintenance marked as paid.",
    });
  } catch (error) {
    console.error("❌ Error updating maintenance status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating maintenance entry.",
    });
  }
};
