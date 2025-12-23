const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");

// POST /maintenance/waive-penalty
const waiveMonthlyPenalty = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    const { maintenanceId, reasonId } = req.body;

    if (!apartmentId || !maintenanceId || !reasonId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const monthly = await MonthlyFlatMaintenance.findOne({
      apartmentId,
      "maintenance._id": maintenanceId,
      "maintenance.reasons._id": reasonId,
    });

    if (!monthly) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    const entry = monthly.maintenance.id(maintenanceId);
    if (!entry) {
      return res
        .status(404)
        .json({ message: "Flat maintenance entry not found" });
    }

    const reason = entry.reasons.id(reasonId);
    if (!reason) {
      return res.status(404).json({ message: "Reason not found" });
    }

    // ✅ deduct only once (if not already waived)
    let deduction = 0;
    if (!reason.waived) {
      deduction = Number(reason.price) || 0;
      entry.amount = Math.max(0, entry.amount - deduction);
      monthly.totalAmount = Math.max(0, monthly.totalAmount - deduction);

      reason.waived = true;   // mark waived
      reason.price = 0;       // optional: clear price so it doesn’t count again
    }

    await monthly.save();

    return res.json({
      success: true,
      message: "Penalty reason waived successfully",
      maintenanceId,
      reasonId,
      deducted: deduction,
    });
  } catch (err) {
    console.error("❌ waivePenalty error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

module.exports = { waiveMonthlyPenalty };
