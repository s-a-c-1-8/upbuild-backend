const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");

exports.markCorpusEntryPaid = async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Maintenance entry ID is required.",
      });
    }

    // Find and update the specific maintenance entry's status to "paid"
    const result = await CorpusFlatMaintenance.findOneAndUpdate(
      { "maintenance._id": entryId },
      { $set: { "maintenance.$.status": "paid" } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Corpus maintenance entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Corpus maintenance marked as paid.",
    });
  } catch (error) {
    console.error("❌ Error updating corpus maintenance status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating corpus maintenance entry.",
    });
  }
};
