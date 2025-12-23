// const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");
// const Flat = require("../../../model/flat/flatModel");

// exports.getMaintenanceEntryById = async (req, res) => {
//   try {
//     const { entryId } = req.params;

//     if (!entryId) {
//       return res.status(400).json({
//         success: false,
//         message: "Maintenance entry ID is required.",
//       });
//     }

//     // Search for the nested maintenance item by _id
//     const record = await MonthlyFlatMaintenance.findOne({
//       "maintenance._id": entryId,
//     }).populate("maintenance.flatId", "flatName blockName");

//     if (!record) {
//       return res.status(404).json({
//         success: false,
//         message: "Maintenance entry not found.",
//       });
//     }

//     // Find the exact nested entry
//     const entry = record.maintenance.find((m) => m._id.toString() === entryId);

//     if (!entry) {
//       return res.status(404).json({
//         success: false,
//         message: "Maintenance detail not found.",
//       });
//     }

//     const flat = entry.flatId;
//     const flatLabel = `${flat?.flatName || "NA"}-${flat?.blockName || "X"}`;

//     return res.status(200).json({
//       success: true,
//       data: {
//         maintenanceId: entry.maintenanceId,
//         flat: flatLabel,
//         amount: entry.amount,
//         month: record.month,
//         status: entry.status,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error fetching maintenance entry:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching maintenance entry.",
//     });
//   }
// };

const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");
const Flat = require("../../../model/flat/flatModel");
const { applyPenaltiesAndUpdateTotals } = require("./applyPenaltiesAndUpdateDb");

exports.getMaintenanceEntryById = async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Maintenance entry ID is required.",
      });
    }

    // 🔹 Find record first to get apartmentId
    const recordBefore = await MonthlyFlatMaintenance.findOne({
      "maintenance._id": entryId,
    });

    if (!recordBefore) {
      return res.status(404).json({
        success: false,
        message: "Maintenance entry not found.",
      });
    }

    // 🔹 Apply penalties and update totals for this apartment
    await applyPenaltiesAndUpdateTotals(recordBefore.apartmentId);

    // 🔹 Fetch the record again after penalties are applied
    const record = await MonthlyFlatMaintenance.findOne({
      "maintenance._id": entryId,
    }).populate("maintenance.flatId", "flatName blockName");

    // Find the exact nested entry
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
        reasons: entry.reasons || [], // include reasons if any
      },
    });
  } catch (error) {
    console.error("❌ Error fetching maintenance entry:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching maintenance entry.",
    });
  }
};
