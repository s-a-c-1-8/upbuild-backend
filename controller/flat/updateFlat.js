const Flat = require("../../model/flat/flatModel");

exports.updateFlatData = async (req, res) => {
  console.log("Raw request body:", req.body);
  console.log("Uploaded files:", req.files);

  try {
    const flatId = req.params.id;
    if (!flatId) {
      return res.status(400).json({ message: "Flat ID is required." });
    }

    // Parse incoming JSON data
    const step1Data = JSON.parse(req.body.step1Data || "{}");

    const flatData = step1Data.flatData || {};
    const ownerData = step1Data.ownerData || {};
    const addressData = step1Data.addressData || {};

    const occupantsData = req.body.occupantsData
      ? JSON.parse(req.body.occupantsData)
      : [];
    const tenantData = req.body.tenantData
      ? JSON.parse(req.body.tenantData)
      : null;

    // Find existing flat by ID
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ message: "Flat not found." });
    }

    // Check if flat number/block is being updated and if that conflicts with another flat in the same apartment
    if (
      (flat.flatName !== flatData.flatNumber ||
        flat.blockName !== flatData.blockName) &&
      flat.apartmentId
    ) {
      const existingFlat = await Flat.findOne({
        apartmentId: flat.apartmentId,
        blockName: flatData.blockName,
        flatName: flatData.flatNumber,
        _id: { $ne: flatId }, // exclude current flat
      });

      if (existingFlat) {
        return res.status(400).json({
          message: `Flat ${flatData.flatNumber} already exists in block ${flatData.blockName} of this apartment.`,
        });
      }
    }

    // Update flat fields
    flat.flatName = flatData.flatNumber || flat.flatName;
    flat.flatType = flatData.flatType || flat.flatType;
    flat.facing = flatData.facing || flat.facing;
    flat.squareFootage = flatData.squareFootage || flat.squareFootage;
    flat.apartmentStatus = flatData.apartmentStatus || flat.apartmentStatus;
    flat.blockName = flatData.blockName || flat.blockName;

    flat.landmark = addressData.landmark || flat.landmark;
    flat.city = addressData.city || flat.city;
    flat.state = addressData.state || flat.state;
    flat.fullAddress = addressData.fullAddress || flat.fullAddress;

    flat.latitude = flatData.latitude || flat.latitude;
    flat.longitude = flatData.longitude || flat.longitude;

    flat.ownerName = ownerData.ownerName || flat.ownerName;
    flat.ownerPhoneNumber = ownerData.contactNumber || flat.ownerPhoneNumber;
    flat.ownerEmail = ownerData.email || flat.ownerEmail;
    flat.age = ownerData.age || flat.age;
    flat.gender = ownerData.gender || flat.gender;

    flat.powerMeterNumber = flatData.powerMeter || flat.powerMeterNumber;
    flat.stpMeterNumber = flatData.waterMeter || flat.stpMeterNumber;
    flat.additionalDetails =
      flatData.additionalDetails || flat.additionalDetails;

    // Update tenant details if provided
    if (tenantData && Object.keys(tenantData).length > 0) {
      // Set tenant data
      flat.tenantDetails = {
        tenantName: tenantData.name || "",
        tenantPhoneNumber: tenantData.phoneNumber || "",
        tenantEmail: tenantData.email || "",
        startDate: tenantData.startDate || "",
        endDate: tenantData.endDate || "",
        active: tenantData.active !== undefined ? tenantData.active : true,
        occupants: tenantData.occupants || [],
        agreementFile: flat.tenantDetails?.agreementFile || "",
      };

// 🔍 Check agreement file size if present
const MAX_FILE_SIZE_MB = 10;
const agreementFile = req.processedUploads?.agreementFile?.[0];

if (agreementFile) {
  const fileSizeMB = agreementFile.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return res.status(400).json({
      message: `Agreement file '${agreementFile.originalname}' exceeds 10MB limit.`,
      fileSize: `${fileSizeMB.toFixed(2)} MB`,
    });
  }

  // ✅ Assign file path only if size is valid
  flat.tenantDetails.agreementFile = `uploads/${agreementFile.name}`;
}


      // Clear occupants data when switching to tenant
      flat.occupantsData = [];
      flat.ownerStaying = false;
    } else if (occupantsData.length > 0) {
      // Set occupants data
      flat.occupantsData = occupantsData;

      // Clear tenant details when switching to owner staying
      flat.tenantDetails = null;
      flat.ownerStaying = true;

    }

    await flat.save();

    res.status(200).json({
      message: "Flat data updated successfully",
      flat,
    });
  } catch (error) {
    console.error("❌ Error updating flat:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A flat with this number already exists in the same block of the apartment.",
      });
    }

    res.status(500).json({
      message: "Failed to update flat data",
      error: error.message,
    });
  }
};
