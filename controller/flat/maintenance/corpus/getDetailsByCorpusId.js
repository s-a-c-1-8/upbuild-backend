const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");
const Flat = require("../../../../model/flat/flatModel");
const applyCorpusPenalties = require("./applyPenaltiesCorpus");

exports.getCorpusEntryById = async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Maintenance entry ID is required.",
      });
    }

    // Find the corpus record containing this entryId
    const record = await CorpusFlatMaintenance.findOne({
      "maintenance._id": entryId,
    }).populate("maintenance.flatId", "flatName blockName");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Maintenance entry not found.",
      });
    }
    await applyCorpusPenalties(record);

    // Extract the exact nested entry
    const entry = record.maintenance.find((m) => m._id.toString() === entryId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Maintenance detail not found.",
      });
    }

    const flat = entry.flatId;
    const flatLabel = `${flat?.flatName || "NA"}-${flat?.blockName || "X"}`;

    return res.status(200).json({
      success: true,
      data: {
        maintenanceId: entry.maintenanceId,
        flat: flatLabel,
        amount: entry.amount,
        month: record.month,
        status: entry.status,
        reasons: [...(record.reasons || []), ...(entry.penaltyReasons || [])],
      },
    });
  } catch (error) {
    console.error("❌ Error fetching corpus maintenance entry:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching corpus maintenance entry.",
    });
  }
};
