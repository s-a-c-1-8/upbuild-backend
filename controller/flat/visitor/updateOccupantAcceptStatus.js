const VisitorLog = require("../../../model/flat/visitorLogModel");
const { getIO } = require("../../../socket");
const logAction = require("../../../utils/logAction");
const {
  markNotificationAsRead,
} = require("../../../utils/markNotificationAsRead");
const notifyOccupants = require("../../../utils/notifyOccupants");

exports.updateOccupantAcceptStatus = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!["Accepted", "Rejected"].includes(response)) {
    return res.status(400).json({ message: "Invalid occupant response" });
  }

  const selectedRoleId = req.auth?.selectedRoleId;
  if (!selectedRoleId) {
    return res
      .status(403)
      .json({ message: "Access denied. No role selected." });
  }

  const roleAssignment = await require("../../../model/user/userRoleAssignment")
    .findById(selectedRoleId)
    .populate("role");

  const roleSlug = roleAssignment?.role?.slug;
  if (roleSlug !== "occupants") {
    return res.status(403).json({
      message: "Only occupants are allowed to respond to visitors.",
    });
  }

  try {
    const log = await VisitorLog.findById(id).populate("visitor");

    if (!log) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    const createdAtDate = new Date(log.createdAt);
    const currentDate = new Date();

    const isSameDay =
      createdAtDate.getFullYear() === currentDate.getFullYear() &&
      createdAtDate.getMonth() === currentDate.getMonth() &&
      createdAtDate.getDate() === currentDate.getDate();

    if (!isSameDay) {
      return res.status(400).json({
        message:
          "Status update window has expired. You can only respond on the same day.",
      });
    }
    // ✅ Update response status
    log.occupantAcceptStatus = response;

    if (response === "Accepted") {
      log.status = "Checked-In";
      log.clockInTime = new Date();
      log.clockOutTime = undefined;
    } else if (response === "Rejected") {
      log.status = "Rejected";
      log.clockInTime = undefined;
      log.clockOutTime = undefined;
    }

    await log.save();

    // ✅ Notify all occupants to close modal
    const io = getIO();
    if (io && log.flatId && log.apartment) {
      const roomKey = `${log.apartment}_${log.flatId}`;
      console.log(`📢 Emitting visitor-response-recorded to room: ${roomKey}`);

      io.to(roomKey).emit("visitor-response-recorded", {
        visitorLogId: log._id.toString(),
        response,
      });
    }

    // ✅ Mark related notification as read
    // await Notification.updateMany(
    //   { logId: log._id, logModel: "VisitorLog" }, // 👈 include logModel
    //   { $set: { read: true } }
    // );
    // ✅ Move selectedRoleId from recipients to readRecipients
    await markNotificationAsRead({
      logId: log._id,
      logModel: "VisitorLog",
    });

    // ✅ Send new notification to relevant occupants
    await notifyOccupants({
      apartmentId: log.apartment,
      flatId: log.flatId,
      message: `Visitor ${
        log.visitor?.name
      } has been ${response.toLowerCase()}.`,
      logId: log._id,
      logModel: "VisitorLog",
      link: `${process.env.FRONTEND_URL}/apartment/visitors?search=${log.visitorLogId}`,
    });

    // 🪵 Audit log
    await logAction({
      req,
      action: "OCCUPANT_RESPONSE",
      description: `Occupant ${response} visitor ${log.visitorLogId}`,
      metadata: {
        visitorLogId: log.visitorLogId,
        logId: log._id,
        response,
        newStatus: log.status,
        flatId: log.flatId || null,
        apartmentId: log.apartment || null,
        hasClockInTime: !!log.clockInTime,
        hasClockOutTime: !!log.clockOutTime,
      },
    });

    return res.status(200).json({
      message: "Occupant response recorded successfully",
      updatedLog: log,
    });
  } catch (error) {
    console.error("Error updating occupantAcceptStatus:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
