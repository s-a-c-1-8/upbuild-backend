const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");

// POST /maintenance/waive/corpus/penalty
const waiveCorpusPenalty = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    const { maintenanceId, reasonId } = req.body;

    if (!apartmentId || !maintenanceId || !reasonId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔍 Find the corpus document containing this maintenance entry and reason
    const corpus = await CorpusFlatMaintenance.findOne({
      apartmentId,
      "maintenance._id": maintenanceId,
      "maintenance.penaltyReasons._id": reasonId,
    });

    if (!corpus) {
      return res.status(404).json({ message: "Corpus record not found" });
    }

    // Get maintenance entry
    const entry = corpus.maintenance.id(maintenanceId);
    if (!entry) {
      return res
        .status(404)
        .json({ message: "Corpus maintenance entry not found" });
    }

    // Get reason
    const reason = entry.penaltyReasons.id(reasonId);
    if (!reason) {
      return res.status(404).json({ message: "Penalty reason not found" });
    }

    // ✅ Deduct only if not already waived
    let deduction = 0;
    if (!reason.waived) {
      deduction = Number(reason.price) || 0;

      entry.amount = Math.max(0, entry.amount - deduction);
      corpus.totalAmount = Math.max(0, corpus.totalAmount - deduction);

      reason.waived = true;   // mark waived
      reason.price = 0;       // optional: clear price so it doesn’t re-add
    }

    await corpus.save();

    return res.json({
      success: true,
      message: "Corpus penalty waived successfully",
      maintenanceId,
      reasonId,
      deducted: deduction,
    });
  } catch (err) {
    console.error("❌ waiveCorpusPenalty error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { waiveCorpusPenalty };
