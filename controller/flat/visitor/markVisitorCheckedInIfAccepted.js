const moment = require("moment-timezone");
const VisitorLog = require("../../../model/flat/visitorLogModel");
const logAction = require("../../../utils/logAction");
const notifyOccupants = require("../../../utils/notifyOccupants");

exports.markVisitorCheckedInIfAccepted = async (req, res) => {
  const { id } = req.params;

  try {
    const log = await VisitorLog.findById(id).populate("visitor");

    if (!log) {
      return res.status(404).json({ message: "Visitor log not found" });
    }

    // ⛔ Only allow if status is Awaiting and occupantAcceptStatus is Accepted
    if (log.status !== "Awaiting" || log.occupantAcceptStatus !== "Accepted") {
      return res.status(400).json({
        message:
          "Cannot mark as Checked-In. Either already processed or not accepted by occupant.",
      });
    }

    // 🕒 Validate schedule window if exists
    if (log.scheduleDate && log.scheduleFrom && log.scheduleTo) {
      
      // Convert properly using moment-timezone
      const now = moment().tz("Asia/Kolkata");

      const scheduleDate = moment(log.scheduleDate).tz("Asia/Kolkata");

      const fromTime = moment.tz(
        `${log.scheduleDate} ${log.scheduleFrom}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata"
      );

      const toTime = moment.tz(
        `${log.scheduleDate} ${log.scheduleTo}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata"
      );

      // If NOT within allowed window → block
      if (!now.isBetween(fromTime, toTime)) {
        return res.status(400).json({
          message: `Cannot check-in. Allowed only between ${fromTime.format(
            "hh:mm A"
          )} and ${toTime.format("hh:mm A")} on ${scheduleDate.format(
            "DD-MM-YYYY"
          )}.`,
        });
      }
    }

    // ✅ Update to Checked-In
    log.status = "Checked-In";
    log.clockInTime = new Date();
    await log.save();

    // 🪵 Log the action
    await logAction({
      req,
      action: "MARK_CHECKED_IN",
      description: `Visitor ${log.visitorLogId} marked as Checked-In after occupant accepted`,
      metadata: {
        visitorLogId: log.visitorLogId,
        logId: log._id,
        newStatus: log.status,
        from: "Awaiting",
        occupantAcceptStatus: log.occupantAcceptStatus,
        scheduleDate: log.scheduleDate,
        scheduleFrom: log.scheduleFrom,
        scheduleTo: log.scheduleTo,
      },
    });

    // 🔔 Notify occupants
    await notifyOccupants({
      apartmentId: log.apartment,
      flatId: log.flatId,
      message: `Visitor ${log.visitor.name} has checked in.`,
      logId: log._id,
      logModel: "VisitorLog",
      link: `${process.env.FRONTEND_URL}/apartment/visitors?search=${log.visitorLogId}`,
    });

    return res.status(200).json({
      message: "Visitor marked as Checked-In successfully",
      updatedLog: log,
    });
  } catch (error) {
    console.error("Error marking visitor as Checked-In:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
