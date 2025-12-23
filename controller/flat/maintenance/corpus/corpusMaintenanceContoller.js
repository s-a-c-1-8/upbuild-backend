const mongoose = require("mongoose");
const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");
const Flat = require("../../../../model/flat/flatModel");
const Apartment = require("../../../../model/apartment/apartmentModel");
const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");
const logAction = require("../../../../utils/logAction");
const { notifyHOFOccupants } = require("../../../../utils/notifyHOFOccupants");

exports.addCorpusMaintenance = async (req, res) => {
  try {
    const {
      apartmentId,
      month,
      totalAmount,
      maintenance,
      reasons = [],
      penaltyInfo = null, // ✅ Accept penalty info from frontend
    } = req.body;

    if (!apartmentId || !month || !totalAmount || !maintenance?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
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

    // Validate incoming maintenance
    const isValid = maintenance.every(
      (item) =>
        item._id &&
        mongoose.Types.ObjectId.isValid(item._id) &&
        item.flatNumber &&
        typeof item.flatNumber === "string" &&
        typeof item.amount === "number"
    );

    if (!isValid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid maintenance format." });

    // Get Apartment doc
    const apartmentDoc = await Apartment.findById(apartmentId).select(
      "apartmentId"
    );
    if (!apartmentDoc)
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found." });

    const flatIds = maintenance.map((m) => m._id);
    const flats = await Flat.find({ _id: { $in: flatIds } }).select(
      "flatName blockName"
    );

    // Fetch corpus account linked in apartment settings
    const settings = await ApartmentSettings.findOne({
      apartment: apartmentId,
    }).populate("settings.maintenanceAccounts.corpusAccount");

    if (!settings?.settings?.maintenanceAccounts?.corpusAccount) {
      return res
        .status(400)
        .json({ success: false, message: "No corpus bank account linked." });
    }

    const account = settings.settings.maintenanceAccounts.corpusAccount;
    const bankDetails = {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      referenceName: account.referenceName,
    };

    // Extract MMYY for ID generation
    const [monthStr, yearStr] = formattedMonth.split(" ");
    const monthNumber = new Date(`${monthStr} 1, 2000`).getMonth() + 1;
    const mmyy = `${String(monthNumber).padStart(2, "0")}${yearStr.slice(-2)}`;

    const mappedMaintenance = [];

    for (const m of maintenance) {
      const flat = flats.find((f) => f._id.toString() === m._id);
      const flatKey = `${flat.flatName}${flat.blockName || ""}`;
      const prefix = `CORP-${apartmentDoc.apartmentId}-${mmyy}${flatKey}`;

      // Find last entry in DB for the same flat and month
      const lastFlatEntry = await CorpusFlatMaintenance.aggregate([
        {
          $match: {
            apartmentId: new mongoose.Types.ObjectId(apartmentId),
            month: formattedMonth,
          },
        },
        { $unwind: "$maintenance" },
        {
          $match: { "maintenance.flatId": new mongoose.Types.ObjectId(m._id) },
        },
        { $sort: { "maintenance.maintenanceId": -1 } },
        { $limit: 1 },
      ]);

      let seq = 1;
      if (lastFlatEntry.length) {
        const lastId = lastFlatEntry[0].maintenance.maintenanceId;
        const match = lastId.match(/(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
      }

      // Check current batch too
      const existingInBatch = mappedMaintenance.filter(
        (x) => x.flatId.toString() === m._id
      ).length;
      seq += existingInBatch;

      const maintenanceId = `${prefix}-${seq}`;
      mappedMaintenance.push({
        flatId: m._id,
        amount: m.amount,
        maintenanceId,
      });
    }

    // Save to DB including penaltyInfo
    const newEntry = await CorpusFlatMaintenance.create({
      apartmentId,
      month: formattedMonth,
      totalAmount,
      maintenance: mappedMaintenance,
      reasons,
      penaltyInfo, // ✅ Store penalty info
      ...bankDetails,
    });

    // Log action
    await logAction({
      req,
      action: "CREATE_CORPUS_MAINTENANCE",
      description: `Created corpus maintenance for ${formattedMonth}`,
      metadata: {
        totalAmount,
        month: formattedMonth,
        maintenanceCount: mappedMaintenance.length,
        bankDetails,
        penaltyInfo, // ✅ log penalty info
      },
    });

    // Notify HOFs
    await Promise.all(
      mappedMaintenance.map((m) =>
        notifyHOFOccupants({
          apartmentId,
          flatId: m.flatId,
          message: `Corpus maintenance of ₹${m.amount} has been created for ${formattedMonth}.`,
          logId: newEntry._id,
          logModel: "CorpusFlatMaintenance",
          link: `${process.env.FRONTEND_URL}apartment/maintenance/corpus?search=${m.maintenanceId}`,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Corpus maintenance saved successfully.",
      data: newEntry,
    });
  } catch (error) {
    console.error("❌ Error adding corpus maintenance:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
