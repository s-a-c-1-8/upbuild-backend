// controllers/maintenanceCalculator.controller.js
const Flat = require("../../../model/flat/flatModel");
const ApartmentSettings = require("../../../model/apartment/apartmentSettings");
const ApartmentMonthlyMaintenanceLineItems = require("../../../model/flat/maintenance/maintenanceLineItems");

exports.calculateMaintenance = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    const { mode, amount, rate } = req.body;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required.",
      });
    }

    // 🔹 Fetch flats
    const flats = await Flat.find({ apartmentId }).select(
      "_id flatName blockName squareFootage ownerStaying"
    );
    if (!flats.length) {
      return res.status(404).json({
        success: false,
        message: "No flats found for this apartment.",
      });
    }

    // --- CASE 1: perFlat ---
    if (mode === "perFlat") {
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Valid amount is required." });
      }

      const mapped = flats.map((f) => ({
        _id: f._id,
        flatNumber: `${f.flatName}${f.blockName ? "-" + f.blockName : ""}`,
        amount: Number(amount),
      }));

      return res.json({
        success: true,
        mode,
        perFlatAmount: Number(amount),
        total: mapped.reduce((a, b) => a + b.amount, 0),
        count: mapped.length,
        data: mapped,
      });
    }

    // --- CASE 2: perSqFeet ---
    if (mode === "perSqFeet") {
      if (!rate || isNaN(rate) || Number(rate) <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Valid rate is required." });
      }

      const mapped = flats.map((f) => {
        // ensure numeric and non-negative
        const area =
          !isNaN(Number(f.squareFootage)) && Number(f.squareFootage) > 0
            ? Number(f.squareFootage)
            : 0;

        const calcAmount = +(area * Number(rate)).toFixed(2);

        return {
          _id: f._id,
          flatNumber: `${f.flatName}${f.blockName ? "-" + f.blockName : ""}`,
          areaSqFt: area,
          amount: calcAmount,
        };
      });

      const total = mapped.reduce((sum, flat) => sum + (flat.amount || 0), 0);

      console.log(
        "PerSqFeet total:",
        total,
        mapped.map((f) => f.amount)
      );

      return res.json({
        success: true,
        mode,
        rate: Number(rate),
        total,
        count: mapped.length,
        data: mapped,
      });
    }

// --- CASE 3: perFlatWithItems ---
if (mode === "perFlatWithItems") {
  const settings = await ApartmentSettings.findOne({
    apartment: apartmentId,
  })
    .select("settings.defaultMaintenanceLineItem")
    .populate("settings.defaultMaintenanceLineItem")
    .lean();

  const lineItem = settings?.settings?.defaultMaintenanceLineItem;
  if (!lineItem) {
    return res.status(404).json({
      success: false,
      message: "No default maintenance line item set for apartment.",
    });
  }

  const {
    reasons,
    lineItemName,
    applyPenalty,
    tenantCharge = 0,
    penaltySettings,
  } = lineItem;

  // ✅ calculate penalty start date if month is provided
  let penaltyStartDate = null;
  if (req.body.month && penaltySettings?.startDay) {
    const [year, month] = req.body.month.split("-"); // e.g. "2025-01"
    penaltyStartDate = new Date(
      Number(year),
      Number(month) - 1,
      penaltySettings.startDay
    );
  }

  const mapped = flats.map((flat) => {
    let flatAmount = 0;
    const appliedReasons = [];

    // ✅ Apply all global reasons
    for (const r of reasons) {
      flatAmount += Number(r.price);
      appliedReasons.push(r);
    }

    // ✅ Apply tenantCharge only if flat.ownerStaying === false
    if (flat.ownerStaying === false && tenantCharge > 0) {
      flatAmount += tenantCharge;
      appliedReasons.push({
        description: "Subletting charges (for tenant occupancy)",
        price: tenantCharge,
      });
    }

    return {
      _id: flat._id,
      flatNumber: `${flat.flatName}${
        flat.blockName ? "-" + flat.blockName : ""
      }`,
      amount: flatAmount,
      appliedReasons,
    };
  });

  return res.json({
    success: true,
    mode,
    lineItem: {
      lineItemName,
      applyPenalty,
      penaltyStartDate,
      // ✅ flattened penalty info
      penaltyFixedAmount: penaltySettings?.fixed?.amount || 0,
      penaltyFixedType: penaltySettings?.fixed?.type || "₹",
      penaltyDailyAmount: penaltySettings?.daily?.amount || 0,
      penaltyDailyType: penaltySettings?.daily?.type || "₹",
      penaltyStartDay: penaltySettings?.startDay || null,
      reasons,
      tenantCharge,
    },
    total: mapped.reduce((a, b) => a + b.amount, 0),
    count: mapped.length,
    data: mapped,
  });
}

    // ❌ Unsupported
    return res.status(400).json({
      success: false,
      message: "Invalid mode",
    });
  } catch (err) {
    console.error("❌ Error calculating maintenance:", err);
    res.status(500).json({
      success: false,
      message: "Server error while calculating maintenance.",
      error: err.message,
    });
  }
};
