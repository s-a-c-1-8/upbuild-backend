const Flat = require("../../../../model/flat/flatModel");
const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

/**
 * POST /admin/calculate/corpus/maintenance
 * Body: { apartmentId, month, mode, totalAmount?, baseRate? }
 */
exports.calculateCorpusMaintenanceByApartmentId = async (req, res) => {
  try {
    console.log("req body", req.body);
    const {
      apartmentId,
      month,
      mode = "equal",
      totalAmount,
      baseRate,
    } = req.body;

    if (!apartmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Apartment ID is required." });
    }

    // Fetch flats
    const flats = await Flat.find({ apartmentId }).select(
      "_id flatName blockName squareFootage"
    );

    if (!flats.length) {
      return res.status(404).json({
        success: false,
        message: "No flats found for this apartment.",
      });
    }

    // Fetch apartment settings (for penalty info)
    const settings = await ApartmentSettings.findOne({ apartment: apartmentId }).lean();
    const corpusSettings = settings?.settings?.maintenanceFine?.corpus || {};
    const fixedFine = corpusSettings.fixedFine || { amount: 0, type: "₹" };
    const dailyFine = corpusSettings.dailyFine || { perDay: 0, type: "%" };
    const penaltyStartDay = corpusSettings.penaltyStartDay || 1;

    // ✅ Calculate penalty start date
    let penaltyStartDate = null;
    if (month) {
      const [year, mon] = month.split("-").map(Number); // e.g. "2025-09"
      const date = new Date(year, mon - 1, penaltyStartDay);
      penaltyStartDate = date.toISOString().split("T")[0];
    }

    // Map flats
    const mappedFlats = flats.map((flat) => ({
      _id: flat._id,
      flatNumber: `${flat.flatName}${flat.blockName ? "-" + flat.blockName : ""}`,
      areaSqFt: parseFloat(flat.squareFootage || "0"),
    }));

    // Perform calculation
    let result = [];
    if (mode === "equal") {
      const perFlatAmount = parseFloat(totalAmount);
      if (!perFlatAmount || perFlatAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid totalAmount for 'equal' mode.",
        });
      }

      result = mappedFlats.map((f) => ({
        _id: f._id,
        flatNumber: f.flatNumber,
        areaSqFt: f.areaSqFt,
        amount: Number(perFlatAmount.toFixed(2)),
      }));
    } else if (mode === "area") {
      let rate = 0;

      if (baseRate) {
        rate = parseFloat(baseRate);
      } else if (totalAmount) {
        // derive baseRate = totalAmount / totalArea
        const totalArea = mappedFlats.reduce((acc, f) => acc + f.areaSqFt, 0);
        rate = parseFloat(totalAmount) / totalArea;
      }

      if (!rate || rate <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid baseRate or totalAmount for 'area' mode.",
        });
      }

      result = mappedFlats.map((f) => ({
        _id: f._id,
        flatNumber: f.flatNumber,
        areaSqFt: f.areaSqFt,
        amount: Number((f.areaSqFt * rate).toFixed(2)),
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Must be 'equal' or 'area'.",
      });
    }

// ✅ Always recompute total cleanly from per-flat amounts
const totalCalculatedAmount = result.reduce((acc, curr) => {
  const amt = isNaN(curr.amount) ? 0 : curr.amount; // handle null/NaN safely
  return acc + amt;
}, 0);

    res.status(200).json({
      success: true,
      maintenance: result,
      totalAmount: Number(totalCalculatedAmount.toFixed(2)), // <-- always numeric
      penaltyInfo: {
        fixedFine,
        dailyFine,
        penaltyStartDate,
      },
    });
  } catch (err) {
    console.error("❌ Error calculating maintenance:", err);
    res.status(500).json({
      success: false,
      message: "Server error while calculating maintenance.",
    });
  }
};
