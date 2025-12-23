// const mongoose = require("mongoose");
// const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");
// const Flat = require("../../../model/flat/flatModel");
// const Apartment = require("../../../model/apartment/apartmentModel");
// const ApartmentSettings = require("../../../model/apartment/apartmentSettings");
// const logAction = require("../../../utils/logAction");
// const { notifyHOFOccupants } = require("../../../utils/notifyHOFOccupants");

// exports.addMonthlyMaintenance = async (req, res) => {
//   try {
//     const {
//       apartmentId,
//       month,
//       totalAmount,
//       maintenance,
//       reasons = [],
//     } = req.body;

//     if (!apartmentId || !month || !totalAmount || !maintenance?.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields.",
//       });
//     }

//     // Format month: "2025-06" → "Jun 2025"
//     const [yearPart, monthPart] = month.includes("-")
//       ? month.split("-")
//       : ["", ""];
//     let formattedMonth = month;
//     if (yearPart.length === 4 && monthPart.length <= 2) {
//       const date = new Date(`${yearPart}-${monthPart}-01`);
//       formattedMonth = new Intl.DateTimeFormat("en-IN", {
//         month: "short",
//         year: "numeric",
//       }).format(date);
//     }

//     // Validate maintenance input
//     const isValid = maintenance.every(
//       (item) =>
//         item._id &&
//         mongoose.Types.ObjectId.isValid(item._id) &&
//         item.flatNumber &&
//         typeof item.flatNumber === "string" &&
//         typeof item.amount === "number"
//     );
//     if (!isValid) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Invalid maintenance format. Each item must include _id, flatNumber, and amount.",
//       });
//     }

//     // Fetch apartment document
//     const apartmentDoc = await Apartment.findById(apartmentId).select(
//       "apartmentId"
//     );
//     if (!apartmentDoc) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Apartment not found." });
//     }

//     // Fetch linked monthly bank account
//     const settings = await ApartmentSettings.findOne({
//       apartment: apartmentId,
//     }).populate("settings.maintenanceAccounts.monthlyAccount");

//     if (!settings?.settings?.maintenanceAccounts?.monthlyAccount) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Monthly bank account not linked. Please link an account in apartment settings.",
//       });
//     }

//     const account = settings.settings.maintenanceAccounts.monthlyAccount;
//     const bankDetails = {
//       bankName: account.bankName,
//       accountNumber: account.accountNumber,
//       ifscCode: account.ifscCode,
//       referenceName: account.referenceName,
//     };

//     const flatIds = maintenance.map((m) => m._id);
//     const flats = await Flat.find({ _id: { $in: flatIds } }).select(
//       "flatName blockName"
//     );

//     // Generate maintenance IDs
//     const [monthStr, yearStr] = formattedMonth.split(" ");
//     const monthNumber = new Date(`${monthStr} 1, 2000`).getMonth() + 1;
//     const mmyy = `${String(monthNumber).padStart(2, "0")}${yearStr.slice(-2)}`;

//     const mappedMaintenance = maintenance.map((m) => {
//       const flat = flats.find((f) => f._id.toString() === m._id);
//       const block = flat?.blockName || "X";
//       const flatName = flat?.flatName || "NA";
//       return {
//         flatId: m._id,
//         amount: m.amount,
//         maintenanceId: `MANT-${apartmentDoc.apartmentId}-${mmyy}${flatName}${block}`,
//       };
//     });

//     // Save to DB with bank info
//     const newEntry = await MonthlyFlatMaintenance.create({
//       apartmentId,
//       month: formattedMonth,
//       totalAmount,
//       maintenance: mappedMaintenance,
//       reasons,
//       ...bankDetails,
//     });

//     // Log the action
//     await logAction({
//       req,
//       action: "CREATE_MAINTENANCE",
//       description: `Created monthly maintenance for ${formattedMonth}`,
//       metadata: {
//         totalAmount,
//         month: formattedMonth,
//         maintenanceCount: mappedMaintenance.length,
//         bankDetails,
//       },
//     });

//     // ✅ Notify all HOF occupants
//     await Promise.all(
//       mappedMaintenance.map((m) =>
//         notifyHOFOccupants({
//           apartmentId,
//           flatId: m.flatId,
//           message: `Monthly maintenance for ${formattedMonth} has been generated. Please pay.`,
//           logId: newEntry._id,
//           logModel: "MonthlyFlatMaintenance",
//           link: `${process.env.FRONTEND_URL}apartment/maintenance/monthly?search=${m.maintenanceId}`, // ✅ FIX
//         })
//       )
//     );

//     return res.status(201).json({
//       success: true,
//       message: "Monthly maintenance saved successfully.",
//       data: newEntry,
//     });
//   } catch (error) {
//     console.error("❌ Error adding monthly maintenance:", error);
//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message:
//           "Maintenance has already been generated for this month and year.",
//       });
//     }
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

const mongoose = require("mongoose");
const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");
const Flat = require("../../../model/flat/flatModel");
const Apartment = require("../../../model/apartment/apartmentModel");
const ApartmentSettings = require("../../../model/apartment/apartmentSettings");
const logAction = require("../../../utils/logAction");
const { notifyHOFOccupants } = require("../../../utils/notifyHOFOccupants");

exports.addMonthlyMaintenance = async (req, res) => {
  console.log("req body", req.body);
  try {
    const {
      apartmentId,
      month,
      totalAmount,
      maintenance,
      penaltyDetails,
      openPenaltyDate,
    } = req.body;

    if (!apartmentId || !month || !totalAmount || !maintenance?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    // Format month: "2025-06" → "Jun 2025"
    const [yearPart, monthPart] = month.includes("-")
      ? month.split("-")
      : ["", ""];
    let formattedMonth = month;
    if (yearPart.length === 4 && monthPart.length <= 2) {
      const date = new Date(`${yearPart}-${monthPart}-01`);
      formattedMonth = new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "numeric",
      }).format(date);
    }

    // Validate maintenance input
    const isValid = maintenance.every(
      (item) =>
        item._id &&
        mongoose.Types.ObjectId.isValid(item._id) &&
        item.flatNumber &&
        typeof item.flatNumber === "string" &&
        typeof item.amount === "number"
    );
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid maintenance format. Each item must include _id, flatNumber, and amount.",
      });
    }

    // Fetch apartment
    const apartmentDoc = await Apartment.findById(apartmentId).select(
      "apartmentId"
    );
    if (!apartmentDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found." });
    }

    // Fetch linked monthly bank account
    const settings = await ApartmentSettings.findOne({
      apartment: apartmentId,
    }).populate("settings.maintenanceAccounts.monthlyAccount");

    if (!settings?.settings?.maintenanceAccounts?.monthlyAccount) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly bank account not linked. Please link an account in apartment settings.",
      });
    }

    const account = settings.settings.maintenanceAccounts.monthlyAccount;
    const bankDetails = {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      referenceName: account.referenceName,
    };

    // Fetch flat details
    const flatIds = maintenance.map((m) => m._id);
    const flats = await Flat.find({ _id: { $in: flatIds } }).select(
      "flatName blockName"
    );

    // Generate maintenance IDs
    const [monthStr, yearStr] = formattedMonth.split(" ");
    const monthNumber = new Date(`${monthStr} 1, 2000`).getMonth() + 1;
    const mmyy = `${String(monthNumber).padStart(2, "0")}${yearStr.slice(-2)}`;

    const mappedMaintenance = maintenance.map((m) => {
      const flat = flats.find((f) => f._id.toString() === m._id);
      const block = flat?.blockName || "X";
      const flatName = flat?.flatName || "NA";

      return {
        flatId: m._id,
        amount: m.amount,
        reasons: m.reasons || [], // per-flat reasons
        maintenanceId: `MANT-${apartmentDoc.apartmentId}-${mmyy}${flatName}${block}`,
      };
    });

    // Pick penaltyDetails or fallback to openPenaltyDate
    // Pick penalty settings (structured object)
    // Map penaltyDetails properly
    let penaltyPayload = null;
    if (penaltyDetails) {
      penaltyPayload = {
        penaltySettings: {
          applyPenalty: penaltyDetails.applyPenalty || false,
          fixed: {
            amount: penaltyDetails.penaltyFixedAmount || 0,
            type: penaltyDetails.penaltyFixedType || "₹",
          },
          daily: {
            amount: penaltyDetails.penaltyDailyAmount || 0,
            type: penaltyDetails.penaltyDailyType || "₹",
          },
          startDate: penaltyDetails.penaltyStartDate || null, // store exact date
        },
      };
    }

    // Save to DB with bank info
    const newEntry = await MonthlyFlatMaintenance.create({
      apartmentId,
      month: formattedMonth,
      totalAmount,
      maintenance: mappedMaintenance,
      ...penaltyPayload, // mapped properly
      ...bankDetails,
    });

    // Log the action
    await logAction({
      req,
      action: "CREATE_MAINTENANCE",
      description: `Created monthly maintenance for ${formattedMonth}`,
      metadata: {
        totalAmount,
        month: formattedMonth,
        maintenanceCount: mappedMaintenance.length,
        penaltySettings: penaltyDetails || null,
        bankDetails,
      },
    });

    // Notify HOF occupants
    await Promise.all(
      mappedMaintenance.map((m) =>
        notifyHOFOccupants({
          apartmentId,
          flatId: m.flatId,
          message: `Monthly maintenance for ${formattedMonth} has been generated. Please pay.`,
          logId: newEntry._id,
          logModel: "MonthlyFlatMaintenance",
          link: `${process.env.FRONTEND_URL}apartment/maintenance/monthly?search=${m.maintenanceId}`,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Monthly maintenance saved successfully.",
      data: newEntry,
    });
  } catch (error) {
    console.error("❌ Error adding monthly maintenance:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Maintenance has already been generated for this month and year.",
      });
    }
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
