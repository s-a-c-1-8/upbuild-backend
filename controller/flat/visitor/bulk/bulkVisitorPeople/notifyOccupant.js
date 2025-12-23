const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
const { getIO } = require("../../../../../socket");
const notifyOccupants = require("../../../../../utils/notifyOccupants");

// POST /visitor/notify-occupant/:id
exports.notifyOccupant = async (req, res) => {
  try {
    const { id } = req.params; // can be bulkVisitorId OR inner visitorId
    const { flatId } = req.body;

    let bulkDoc, visitor;

    // 1. Try to find by bulk visitor _id
    bulkDoc = await VisitorsBulk.findById(id);
    if (bulkDoc) {
      // notify using whole bulk event
      visitor = null; // not an inner visitor
    } else {
      // 2. If not found, try inside visitors array
      bulkDoc = await VisitorsBulk.findOne(
        { "visitors._id": id },
        { "visitors.$": 1, apartmentId: 1, flatId: 1 }
      );
      if (bulkDoc) {
        visitor = bulkDoc.visitors[0];
      }
    }

    if (!bulkDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor not found" });
    }

    const io = getIO();

    // Condition check – only emit if not already accepted
    const alreadyAccepted =
      visitor?.occupantAcceptStatus === "Accepted" ||
      bulkDoc.occupantAcceptStatus === "Accepted";

    if (!alreadyAccepted && io) {
      io.emit("new-bulk-visitor", {
        visitorLogId: visitor ? visitor._id : bulkDoc._id,
        apartmentId: bulkDoc.apartmentId,
        flatId: flatId || bulkDoc.flatId,
      });
    }
    if (!alreadyAccepted) {
      await notifyOccupants({
        apartmentId: bulkDoc.apartmentId,
        flatId: flatId || bulkDoc.flatId,
        message: `Visitor ${visitor.name} is at your flat. Please approve`,
        logId: visitor ? visitor._id : bulkDoc._id,
        logModel: "VisitorsBulk",
        link: `${process.env.FRONTEND_URL}/apartment/visitors/bulkVisit/${bulkDoc._id}?search=${visitor.visitorInfoId}`,
      });
    }

    return res.json({ success: true, message: "Occupant notified" });
  } catch (err) {
    console.error("notifyOccupant error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
