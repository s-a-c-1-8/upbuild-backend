const Agency = require("../../../model/flat/agency");
const logAction = require("../../../utils/logAction"); 

exports.updateAgency = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      agencyName,
      phone,
      email,
      address,
      contactPerson,
      serviceOffered,
      startDate,
      endDate,
    } = req.body;

    // ✅ Convert serviceOffered into array
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

    // 📅 Validate Dates
    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date." });
    }

    // 🔍 Check Agency Exists
    const existingAgency = await Agency.findById(id);
    if (!existingAgency) {
      return res.status(404).json({ message: "Agency not found." });
    }

    // 🔍 Handle new file upload (optional)
    let newAgreementFile = null;
    const file = req.processedUploads?.agreementFile?.[0];

    if (file) {
      // Validate size
      const MAX_FILE_SIZE_MB = 10;
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({
          message: `Agreement file '${file.originalname}' exceeds 10MB limit.`,
          fileSize: `${sizeInMB.toFixed(2)} MB`,
        });
      }

      newAgreementFile = {
        name: file.originalname,
        path: file.path.replace(/\\/g, "/"),
        type: file.type,
      };
    }

    // ✏️ Update data
    existingAgency.agencyName = agencyName;
    existingAgency.phone = phone;
    existingAgency.email = email;
    existingAgency.address = address;
    existingAgency.contactPerson = contactPerson;
    existingAgency.serviceOffered = services;
    existingAgency.startDate = startDate;
    existingAgency.endDate = endDate;

    if (newAgreementFile) {
      existingAgency.agreementFile = newAgreementFile;
    }

    await existingAgency.save();

    // 🪵 Log Action
    await logAction({
      req,
      action: "UPDATE_AGENCY",
      description: `Updated agency "${agencyName}"`,
      metadata: {
        agencyId: id,
        agencyName,
        services,
        updatedFile: newAgreementFile?.name || "Not changed",
      },
    });

    res.status(200).json({ message: "Agency updated successfully." });
  } catch (err) {
    console.error("❌ Failed to update agency:", err);
    res.status(500).json({ message: "Failed to update agency." });
  }
};
