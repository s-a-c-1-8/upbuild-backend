// const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
// const QRCode = require("qrcode"); // ← ✅ Add this
// const notifyOccupants = require("../../../../../utils/notifyOccupants");

// exports.addBulkVisitorInfo = async (req, res) => {
//   try {
//     const {
//       name,
//       phoneNumber,
//       address,
//       gender,
//       vehicleType,
//       vehicleNumber,
//       status,
//       bulkVisitorId,
//     } = req.body;

//     // Required field check
//     if (!name || !phoneNumber || !address || !bulkVisitorId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Regex validations
//     const nameRegex = /^[A-Za-z ]+$/;
//     const phoneRegex = /^[0-9]{10}$/;
//     const addressRegex = /^[A-Za-z0-9 ,.\n-]*$/;

//     if (!nameRegex.test(name) || name.length > 30) {
//       return res.status(400).json({ message: "Invalid visitor name" });
//     }

//     if (!phoneRegex.test(phoneNumber)) {
//       return res
//         .status(400)
//         .json({ message: "Phone number must be exactly 10 digits" });
//     }

//     if (!addressRegex.test(address) || address.length > 250) {
//       return res.status(400).json({ message: "Invalid address" });
//     }

//     // File validations
//     const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
//     const uploadedPhoto = req.processedUploads?.photo?.[0];
//     const uploadedVehiclePhoto = req.processedUploads?.vehiclePhoto?.[0];

//     if (uploadedPhoto && uploadedPhoto.size > MAX_FILE_SIZE_BYTES) {
//       return res.status(400).json({
//         message: `Visitor photo '${uploadedPhoto.originalname}' exceeds 5MB limit.`,
//         fileSize: `${(uploadedPhoto.size / (1024 * 1024)).toFixed(2)} MB`,
//       });
//     }

//     if (
//       uploadedVehiclePhoto &&
//       uploadedVehiclePhoto.size > MAX_FILE_SIZE_BYTES
//     ) {
//       return res.status(400).json({
//         message: `Vehicle photo '${uploadedVehiclePhoto.originalname}' exceeds 5MB limit.`,
//         fileSize: `${(uploadedVehiclePhoto.size / (1024 * 1024)).toFixed(
//           2
//         )} MB`,
//       });
//     }

//     // Find bulk entry
//     const bulkDoc = await VisitorsBulk.findById(bulkVisitorId);
//     if (!bulkDoc) {
//       return res.status(400).json({ message: "Invalid bulkVisitorId" });
//     }
//     let finalVehicleType = vehicleType;
//     let finalVehicleNumber = vehicleNumber;

//     // Normalize vehicle fields
//     if (!vehicleType || vehicleType.toLowerCase() === "none") {
//       finalVehicleType = "";
//       finalVehicleNumber = "";
//     }

//     const nextIndex = bulkDoc.visitors.length + 1;
//     const visitorInfoId = `${bulkDoc.bulkVisitorId}${nextIndex}`;
//     const qrData = `VISITOR:${visitorInfoId}`; // you can include more data if needed

//     const qrCode = await QRCode.toDataURL(qrData); // returns base64 PNG string

//     const newVisitorEntry = {
//       visitorInfoId,
//       name,
//       phoneNumber,
//       address,
//       gender,
//       vehicleType: finalVehicleType,
//       vehicleNumber: finalVehicleNumber,
//       status: status || "Awaiting",
//       photo: uploadedPhoto?.path || "",
//       vehiclePhoto: uploadedVehiclePhoto?.path || "",
//       qrCode, // ⬅️ this stores the base64 QR image
//       addedAt: new Date(),
//     };

//     bulkDoc.visitors.push(newVisitorEntry);
//     await bulkDoc.save();

//     await notifyOccupants({
//       apartmentId: bulkDoc.apartmentId,
//       flatId: bulkDoc.flatId,
//       message: `New visitor "${name}" added. Please approve their visit for the event.`,
//       logId: bulkDoc._id,
//       logModel: "VisitorsBulk",
//       link: `${process.env.FRONTEND_URL}/apartment/visitors/bulkVisit/${bulkDoc._id}?search=${visitorInfoId}`,
//     });

//     return res.status(201).json({
//       message: "Visitor added to bulk event successfully",
//       visitor: newVisitorEntry,
//     });
//   } catch (error) {
//     console.error("Add Bulk Visitor Error:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
const QRCode = require("qrcode");
const notifyOccupants = require("../../../../../utils/notifyOccupants");

exports.addBulkVisitorInfo = async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      address,
      gender,
      vehicleType,
      vehicleNumber,
      status,
      bulkVisitorId,
    } = req.body;

    // Required field check
    if (!name || !phoneNumber || !address || !bulkVisitorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Regex validations
    const nameRegex = /^[A-Za-z ]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const addressRegex = /^[A-Za-z0-9 ,.\n-]*$/;

    if (!nameRegex.test(name) || name.length > 30) {
      return res.status(400).json({ message: "Invalid visitor name" });
    }

    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json({ message: "Phone number must be exactly 10 digits" });
    }

    if (!addressRegex.test(address) || address.length > 250) {
      return res.status(400).json({ message: "Invalid address" });
    }

    // File validations
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    const uploadedPhoto = req.processedUploads?.photo?.[0];
    const uploadedVehiclePhoto = req.processedUploads?.vehiclePhoto?.[0];

    if (uploadedPhoto && uploadedPhoto.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        message: `Visitor photo '${uploadedPhoto.originalname}' exceeds 5MB limit.`,
        fileSize: `${(uploadedPhoto.size / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    if (
      uploadedVehiclePhoto &&
      uploadedVehiclePhoto.size > MAX_FILE_SIZE_BYTES
    ) {
      return res.status(400).json({
        message: `Vehicle photo '${uploadedVehiclePhoto.originalname}' exceeds 5MB limit.`,
        fileSize: `${(uploadedVehiclePhoto.size / (1024 * 1024)).toFixed(
          2
        )} MB`,
      });
    }

    // Find bulk entry
    const bulkDoc = await VisitorsBulk.findById(bulkVisitorId);
    if (!bulkDoc) {
      return res.status(400).json({ message: "Invalid bulkVisitorId" });
    }

    /** ---- Block only if event already ended ---- **/
    const now = new Date();

    const parseTime = (t) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return { h, m };
    };

    const makeDateTime = (dateStr, timeStr, isStart) => {
      if (!dateStr) return null;
      const d = new Date(dateStr); // expects ISO-like "YYYY-MM-DD" or parseable date
      if (Number.isNaN(d.getTime())) return null;

      const tm = parseTime(timeStr);
      if (tm) {
        d.setHours(tm.h, tm.m, isStart ? 0 : 59, isStart ? 0 : 999);
      } else {
        // default to full-day bound if no time
        d.setHours(
          isStart ? 0 : 23,
          isStart ? 0 : 59,
          isStart ? 0 : 59,
          isStart ? 0 : 999
        );
      }
      return d;
    };

    let windowEnd;

    if (bulkDoc.isMultipleDays) {
      // multi-day: end at toDate + toTime (or end-of-day if no time)
      windowEnd = makeDateTime(bulkDoc.toDate, bulkDoc.toTime, false);
    } else {
      // single-day: end at visitDate + toTime (or end-of-day if no time)
      windowEnd = makeDateTime(bulkDoc.visitDate, bulkDoc.toTime, false);
    }

    // If we can compute an end, block when now is past it
    if (windowEnd && now > windowEnd) {
      return res.status(400).json({ message: "Event has already ended" });
    }

    let finalVehicleType = vehicleType;
    let finalVehicleNumber = vehicleNumber;

    // Normalize vehicle fields
    if (!vehicleType || vehicleType.toLowerCase() === "none") {
      finalVehicleType = "";
      finalVehicleNumber = "";
    }

    const nextIndex = bulkDoc.visitors.length + 1;
    const visitorInfoId = `${bulkDoc.bulkVisitorId}${nextIndex}`;

    // Create new visitor entry
    const newVisitorEntry = {
      visitorInfoId,
      name,
      phoneNumber,
      address,
      gender,
      vehicleType: finalVehicleType,
      vehicleNumber: finalVehicleNumber,
      status: status || "Awaiting",
      photo: uploadedPhoto?.path || "",
      vehiclePhoto: uploadedVehiclePhoto?.path || "",
      addedAt: new Date(),
    };

    // Push visitor and save (so Mongo assigns _id)
    bulkDoc.visitors.push(newVisitorEntry);
    await bulkDoc.save();

    // Get the saved visitor with its Mongo _id
    const savedVisitor = bulkDoc.visitors[bulkDoc.visitors.length - 1];

    // Build qrPayload with 3 IDs
    const qrPayload = {
      bulkId: bulkDoc._id.toString(),
      visitorInfoId: savedVisitor.visitorInfoId,
      visitorId: savedVisitor._id.toString(),
    };

    // Generate QR code image (base64) from the payload
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

    // Save qrCode into visitor record
    savedVisitor.qrCode = qrCode;
    await bulkDoc.save();

    // Notify occupants
    await notifyOccupants({
      apartmentId: bulkDoc.apartmentId,
      flatId: bulkDoc.flatId,
      message: `New visitor "${name}" added. Please approve their visit for the event.`,
      logId: bulkDoc._id,
      logModel: "VisitorsBulk",
      link: `${process.env.FRONTEND_URL}/apartment/visitors/bulkVisit/${bulkDoc._id}?search=${visitorInfoId}`,
    });

    return res.status(201).json({
      message: "Visitor added to bulk event successfully",
      visitor: savedVisitor,
    });
  } catch (error) {
    console.error("Add Bulk Visitor Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
