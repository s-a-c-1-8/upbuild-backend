// const Agency = require("../../model/flat/agency");
// const logAction = require("../../utils/logAction"); // ✅ Import logAction

// exports.addAgency = async (req, res) => {
//   try {
//     const {
//       agencyName,
//       phone,
//       email,
//       address,
//       contactPerson,
//       serviceOffered,
//       startDate,
//       endDate,
//       apartmentId,
//     } = req.body;

//     if (!apartmentId) {
//       return res.status(400).json({ message: "Apartment ID is required." });
//     }

//     // 🔍 Extract file and validate presence
//     const file = req.processedUploads?.agreementFile?.[0];
//     if (!file) {
//       return res.status(400).json({ message: "Agreement file is required." });
//     }

//     // 🔐 Validate file size (max 10MB)
//     const MAX_FILE_SIZE_MB = 10;
//     const sizeInMB = file.size / (1024 * 1024);
//     if (sizeInMB > MAX_FILE_SIZE_MB) {
//       return res.status(400).json({
//         message: `Agreement file '${file.originalname}' exceeds 10MB limit.`,
//         fileSize: `${sizeInMB.toFixed(2)} MB`,
//       });
//     }

//     // 📅 Validate dates
//     if (new Date(startDate) > new Date(endDate)) {
//       return res
//         .status(400)
//         .json({ message: "End date must be after start date." });
//     }

//     // 💾 Save agency
//     const agency = new Agency({
//       agencyName,
//       phone,
//       email,
//       address,
//       contactPerson,
//       serviceOffered,
//       startDate,
//       endDate,
//       apartmentId,
//       agreementFile: {
//         name: file.originalname,
//         path: file.path.replace(/\\/g, "/"),
//         type: file.type,
//       },
//     });

//     await agency.save();

//     // 🪵 Log the action
//     await logAction({
//       req,
//       action: "ADD_AGENCY",
//       description: `Added new agency "${agencyName}"`,
//       metadata: {
//         agencyId: agency._id,
//         agencyName,
//         apartmentId,
//         contactPerson,
//         serviceOffered,
//         agreementFileName: file.originalname,
//       },
//     });

//     res.status(201).json({ message: "Agency added successfully." });
//   } catch (err) {
//     console.error("❌ Failed to add agency:", err);
//     res.status(500).json({ message: "Failed to add agency." });
//   }
// };

const Agency = require("../../../model/flat/agency");
const logAction = require("../../../utils/logAction"); // ✅ Import logAction

exports.addAgency = async (req, res) => {
  try {
    const {
      agencyName,
      phone,
      email,
      address,
      contactPerson,
      serviceOffered,
      startDate,
      endDate,
      apartmentId,
    } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    // 🔄 Convert serviceOffered into array (because frontend sent JSON string)
    let services = [];
    try {
      services = Array.isArray(serviceOffered)
        ? serviceOffered
        : JSON.parse(serviceOffered || "[]");
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid serviceOffered format." });
    }

    if (!services.length) {
      return res.status(400).json({ message: "Select at least one service." });
    }

    // 🔍 Extract file and validate presence
    const file = req.processedUploads?.agreementFile?.[0];
    if (!file) {
      return res.status(400).json({ message: "Agreement file is required." });
    }

    // 🔐 Validate file size (max 10MB)
    const MAX_FILE_SIZE_MB = 10;
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > MAX_FILE_SIZE_MB) {
      return res.status(400).json({
        message: `Agreement file '${file.originalname}' exceeds 10MB limit.`,
        fileSize: `${sizeInMB.toFixed(2)} MB`,
      });
    }

    // 📅 Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date." });
    }

    // 💾 Save agency
    const agency = new Agency({
      agencyName,
      phone,
      email,
      address,
      contactPerson,
      serviceOffered: services, // ✅ Save as array
      startDate,
      endDate,
      apartmentId,
      agreementFile: {
        name: file.originalname,
        path: file.path.replace(/\\/g, "/"),
        type: file.type,
      },
    });

    await agency.save();

    // 🪵 Log the action
    await logAction({
      req,
      action: "ADD_AGENCY",
      description: `Added new agency "${agencyName}"`,
      metadata: {
        agencyId: agency._id,
        agencyName,
        apartmentId,
        contactPerson,
        serviceOffered: services,
        agreementFileName: file.originalname,
      },
    });

    res.status(201).json({ message: "Agency added successfully." });
  } catch (err) {
    console.error("❌ Failed to add agency:", err);
    res.status(500).json({ message: "Failed to add agency." });
  }
};
