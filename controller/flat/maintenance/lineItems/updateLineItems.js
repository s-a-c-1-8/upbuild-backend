const mongoose = require("mongoose");
const LineItems = require("../../../../model/flat/maintenance/maintenanceLineItems");

exports.updateLineItems = async (req, res) => {
  console.log("req body", req.body);
  try {
    const { id } = req.params; // document ID from route
    const apartmentId = req.auth?.apartmentId;
    const {
      lineItemName,
      reasons = [],
      totalPrice,
      applyPenalty = false,
      tenantCharge = 0, // ✅ separate field
      fixed,            // ✅ penalty fixed
      daily,            // ✅ penalty daily
      startDay,         // ✅ penalty start day
    } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid line item ID" });
    }
    if (!apartmentId || !mongoose.Types.ObjectId.isValid(apartmentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid apartment id" });
    }

    // Validate inputs
    if (!lineItemName || !String(lineItemName).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "lineItemName is required" });
    }
    if (!Array.isArray(reasons)) {
      return res
        .status(400)
        .json({ success: false, message: "reasons must be an array" });
    }

    // Fetch existing doc
    const existing = await LineItems.findOne({
      _id: id,
      apartment: apartmentId,
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Line item not found or unauthorized",
      });
    }

    // 🔹 Clean global reasons (ignore tenantCharge here)
    let cleaned = reasons.map((r) => ({
      description: String(r?.description || "").trim(),
      price: isNaN(Number(r?.price)) ? 0 : Number(r?.price),
    }));

    cleaned = cleaned.filter(
      (r) => r.description && !isNaN(r.price) && r.price >= 0
    );

    if (cleaned.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid reasons provided" });
    }

    // 🔹 Calculate total only from global reasons
    const computedTotal = cleaned.reduce((sum, r) => sum + r.price, 0);
    const finalTotal =
      typeof totalPrice === "number" && totalPrice >= 0
        ? totalPrice
        : computedTotal;

    // 🔹 Perform update
    existing.lineItemName = String(lineItemName).trim();
    existing.reasons = cleaned;
    existing.totalPrice = finalTotal;
    existing.applyPenalty = Boolean(applyPenalty);
    existing.tenantCharge = Number(tenantCharge) || 0;

    // ✅ Save penalty settings only if applyPenalty is true
    if (applyPenalty) {
      existing.penaltySettings = {
        fixed: {
          amount: Number(fixed?.amount) || 0,
          type: fixed?.type || "₹",
        },
        daily: {
          amount: Number(daily?.amount) || 0,
          type: daily?.type || "₹",
        },
        startDay: Number(startDay) || 1,
      };
    } else {
      existing.penaltySettings = null;
    }

    existing.lastUpdatedBy = req.user?._id;

    const updated = await existing.save();

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateLineItems error:", err);

    if (
      err?.code === 11000 &&
      err?.keyPattern?.apartment === 1 &&
      err?.keyPattern?.lineItemName === 1
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Line Item Name already exists for this apartment. Please use a different name.",
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};
