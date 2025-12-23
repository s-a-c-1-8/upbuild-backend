const Visitor = require("../../../model/flat/visitorModel");
const VisitorLog = require("../../../model/flat/visitorLogModel");
const Apartment = require("../../../model/apartment/apartmentModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const logAction = require("../../../utils/logAction"); // ✅ Import logAction
const { getIO } = require("../../../socket");
const notifyOccupants = require("../../../utils/notifyOccupants");
const QRCode = require("qrcode");
const moment = require("moment-timezone");

exports.addVisitor = async (req, res) => {
  console.log("req body",req.body)
  try {
    const {
      name,
      phoneNumber,
      address,
      gender,
      visitorType,
      vehicleType,
      vehicleNumber,
      flatId,
      apartmentId,
      clockInTime,
      status,
      purpose,
      // 👉 NEW fields
      scheduleDate,
      scheduleFrom,
      scheduleTo,
    } = req.body;

    if (!name || !phoneNumber || !apartmentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔐 Check role + permissions
    const selectedRoleId = req.auth?.selectedRoleId;
    if (!selectedRoleId) {
      return res
        .status(403)
        .json({ message: "Access denied. No role selected." });
    }

    const roleAssignment = await UserRoleAssignment.findById(
      selectedRoleId
    ).populate("role");
    const role = roleAssignment?.role;

    if (!roleAssignment || !role) {
      return res.status(403).json({ message: "Access denied. Invalid role." });
    }

    const roleSlug = role.slug;
    const permissionNames = (role.permissions || []).map((p) => p.name);
    const hasPermission = permissionNames.includes("can_add_visitor");

    if (
      !["apartment-admin", "occupants", "security"].includes(roleSlug) &&
      !hasPermission
    ) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to add visitors.",
      });
    }

    // ⛔ Require flatId for occupants
    if (roleSlug === "occupants" && !flatId) {
      return res.status(400).json({
        message:
          "As an occupant, you must specify the flat ID for the visitor.",
      });
    }

    // ⛔ Require schedule for occupants
    if (
      roleSlug === "occupants" &&
      (!scheduleDate || !scheduleFrom || !scheduleTo)
    ) {
      return res.status(400).json({
        message:
          "As an occupant, you must provide scheduleDate, scheduleFrom, and scheduleTo for the visitor.",
      });
    }

    // 🏢 Find apartment
    const apartment = await Apartment.findById(apartmentId).select(
      "apartmentId name"
    );
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const aptCode = apartment.apartmentId || apartment._id.toString().slice(-4);
    const now = new Date();
    const datePart = `${now.getFullYear().toString().slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    let counter = 1;
    let visitorLogId = `VIS-${aptCode}-${datePart}${counter}`;
    while (await VisitorLog.findOne({ visitorLogId })) {
      counter++;
      visitorLogId = `VIS-${aptCode}-${datePart}${counter}`;
    }

    const MAX_FILE_SIZE_MB = 10;
    const uploadedPhoto = req.processedUploads?.photo?.[0];
    const uploadedVehiclePhoto = req.processedUploads?.vehiclePhoto?.[0];

    if (
      uploadedPhoto &&
      uploadedPhoto.size / (1024 * 1024) > MAX_FILE_SIZE_MB
    ) {
      return res.status(400).json({
        message: `Visitor photo '${uploadedPhoto.originalname}' exceeds 10MB limit.`,
        fileSize: `${(uploadedPhoto.size / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    if (
      uploadedVehiclePhoto &&
      uploadedVehiclePhoto.size / (1024 * 1024) > MAX_FILE_SIZE_MB
    ) {
      return res.status(400).json({
        message: `Vehicle photo '${uploadedVehiclePhoto.originalname}' exceeds 10MB limit.`,
        fileSize: `${(uploadedVehiclePhoto.size / (1024 * 1024)).toFixed(
          2
        )} MB`,
      });
    }

    let visitor = await Visitor.findOne({ phoneNumber });
    let isNewVisitor = false;

    if (!visitor) {
      visitor = new Visitor({
        name,
        phoneNumber,
        address,
        gender,
        apartment: apartmentId,
        photo: uploadedPhoto?.path || "",
      });
      await visitor.save();
      isNewVisitor = true;
    }

    const logData = {
      visitorLogId,
      visitor: visitor._id,
      apartment: apartmentId,
      purpose,
      visitorType,
      vehicleType,
      vehicleNumber,
      vehiclePhoto: uploadedVehiclePhoto?.path || "",

      // 👉 Save schedule if provided
      scheduleDate: scheduleDate || null,
      scheduleFrom: scheduleFrom || null,
      scheduleTo: scheduleTo || null,
    };

    if (visitorType === "For Apartment") {
      logData.status = "Checked-In";
      logData.clockInTime = clockInTime || new Date();
      logData.occupantAcceptStatus = "N/A";
    } else {
      logData.flatId = flatId;
      logData.status = "Awaiting";

      if (roleSlug === "occupants") {
        logData.occupantAcceptStatus = "Accepted";
      } else {
        logData.occupantAcceptStatus = flatId ? "Pending" : "N/A";
      }

      if ((status || "Awaiting") !== "Awaiting") {
        logData.clockInTime = clockInTime || new Date();
      }
    }

    const log = new VisitorLog(logData);
    await log.save();

    // 👉 Generate QR if occupant has accepted
    if (roleSlug === "occupants" && log.occupantAcceptStatus === "Accepted") {
      const qrPayload = {
        logId: log._id.toString(),
        visitorId: visitor._id.toString(),
        visitorLogId: log.visitorLogId,
      };

      const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));
      log.qrCode = qrCode;
      await log.save();
    }

    // 🔔 Only notify and emit if occupant hasn't already accepted
    const io = getIO();
    const shouldEmitAndNotify = log.occupantAcceptStatus !== "Accepted";

    if (shouldEmitAndNotify && io) {
      io.emit("new-visitor", {
        visitorLogId: log._id,
        apartmentId,
        flatId,
      });
    }

    if (shouldEmitAndNotify && log.flatId) {
      await notifyOccupants({
        apartmentId,
        flatId: log.flatId,
        logId: log._id,
        logModel: "VisitorLog", // 👈 must include this now
        message: `New visitor "${name}" is at your flat. Please approve.`,
        link: `${process.env.FRONTEND_URL}apartment/visitors?search=${log.visitorLogId}`, // 👈 added link
      });
    }

    await logAction({
      req,
      action: "ADD_VISITOR",
      description: `Visitor ${name} logged (${visitorType}) with ID ${visitorLogId}`,
      metadata: {
        visitorId: visitor._id,
        isNewVisitor,
        apartmentId,
        flatId: flatId || null,
        visitorLogId,
        visitorType,
        vehicleType,
        vehicleNumber,
        uploadedPhoto: !!uploadedPhoto,
        uploadedVehiclePhoto: !!uploadedVehiclePhoto,
        purpose,
        status: log.status,
        occupantAcceptStatus: log.occupantAcceptStatus,
        // 👉 log schedule in audit
        scheduleDate,
        scheduleFrom,
        scheduleTo,
      },
    });

    return res.status(201).json({
      message: "Visitor log added successfully",
      visitor,
      log,
    });
  } catch (error) {
    console.error("Add Visitor Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


exports.updateVisitorStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "Awaiting",
    "Checked-In",
    "Checked-Out",
    "Wrong Entry",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    // 🔐 Permission + Role check
    const selectedRoleId = req.auth?.selectedRoleId;
    if (!selectedRoleId) {
      return res
        .status(403)
        .json({ message: "Access denied. No role selected." });
    }
    const roleAssignment = await UserRoleAssignment.findById(
      selectedRoleId
    ).populate({
      path: "role",
      populate: {
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      },
    });

    if (!roleAssignment || !roleAssignment.role) {
      return res
        .status(403)
        .json({ message: "Access denied. Role not found." });
    }

    const roleSlug = roleAssignment.role.slug;
    const permissionNames =
      roleAssignment.role.permissions?.map((p) => p.name) || [];

    const isAllowed =
      roleSlug === "apartment-admin" ||
      roleSlug === "security" ||
      permissionNames.includes("can_edit_visitor_status");

    if (!isAllowed) {
      return res.status(403).json({
        message: "You do not have permission to update visitor status.",
      });
    }
    
    const nowIST = moment().tz("Asia/Kolkata").toDate();

    // ✅ Fetch & update visitor log
    const log = await VisitorLog.findById(id).populate("visitor"); // <-- populate visitor
    if (!log) {
      return res.status(404).json({ message: "Visitor log not found" });
    }

    log.status = status;

    if (status === "Checked-In") {
      log.clockInTime = nowIST;
      log.clockOutTime = undefined;
    } else if (status === "Checked-Out") {
      log.clockOutTime = nowIST;
    } else {
      log.clockInTime = undefined;
      log.clockOutTime = undefined;
    }

    await log.save();

    // 🪵 Log the action
    await logAction({
      req,
      action: "UPDATE_VISITOR_STATUS",
      description: `Visitor log ${log.visitorLogId} status updated to ${status}`,
      metadata: {
        visitorLogId: log.visitorLogId,
        logId: log._id,
        newStatus: status,
        hasClockInTime: !!log.clockInTime,
        hasClockOutTime: !!log.clockOutTime,
        flatId: log.flatId || null,
        apartmentId: log.apartment,
      },
    });

    // ✅ Notify occupants
    await notifyOccupants({
      apartmentId: log.apartment,
      flatId: log.flatId,
      message: `Visitor ${log.visitor.name} status updated to ${status}`,
      logId: log._id,
      logModel: "VisitorLog",
      link: `${process.env.FRONTEND_URL}/apartment/visitors?search=${log.visitorLogId}`,
    });

    return res.status(200).json({
      message: "Visitor status updated successfully",
      updatedLog: log,
    });
  } catch (error) {
    console.error("❌ Error updating visitor status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
