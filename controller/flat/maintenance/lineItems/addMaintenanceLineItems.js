// controllers/maintenanceLineItems.controller.js
const mongoose = require("mongoose");
const LineItems = require("../../../../model/flat/maintenance/maintenanceLineItems");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// CREATE line items doc (uses unique index on { apartment, lineItemName })
exports.saveLineItems = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    const {
      lineItemName,
      reasons = [],
      totalPrice,
      applyPenalty = false,
      tenantCharge = 0, // ✅ separate tenant charge
      fixed = {},       // ✅ new fine settings
      daily = {},
      startDay,
    } = req.body;

    if (!apartmentId || !isValidId(apartmentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid apartment id" });
    }
    if (!lineItemName || !String(lineItemName).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "lineItemName is required" });
    }
    if (!Array.isArray(reasons) || reasons.length === 0) {
      return res.status(400).json({
        success: false,
        message: "reasons must be a non-empty array",
      });
    }

    // ✅ Clean reasons (only global/common charges)
    let cleaned = reasons
      .map((r) => ({
        description: String(r?.description || "").trim(),
        price: Number(r?.price),
      }))
      .filter((r) => r.description && !isNaN(r.price) && r.price >= 0);

    if (cleaned.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid reasons provided" });
    }

    // ✅ compute global total (exclude tenant charge)
    const computedTotal = cleaned.reduce((sum, r) => sum + r.price, 0);
    const finalTotal =
      typeof totalPrice === "number" && totalPrice >= 0
        ? totalPrice
        : computedTotal;

    try {
      const doc = await LineItems.create({
        apartment: apartmentId,
        lineItemName: String(lineItemName).trim(),
        reasons: cleaned,
        totalPrice: finalTotal, // ✅ only global charges
        applyPenalty: Boolean(applyPenalty),
        tenantCharge: Number(tenantCharge) || 0, // ✅ store separately
        penaltySettings: {
          fixed: {
            amount: Number(fixed?.amount) || 0,
            type: fixed?.type || "₹",
          },
          daily: {
            amount: Number(daily?.amount) || 0,
            type: daily?.type || "₹",
          },
          startDay: Number(startDay) || 1,
        },
      });

      return res.json({ success: true, data: doc });
    } catch (err) {
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
      throw err;
    }
  } catch (err) {
    console.error("saveLineItems error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};
