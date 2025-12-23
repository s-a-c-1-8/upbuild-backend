// const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
// const { getIO } = require("../../../../../socket");
// const {
//   markNotificationAsRead,
// } = require("../../../../../utils/markNotificationAsRead");

// exports.acceptWihtClockInBulkVisitorOccupant = async (req, res) => {
//   const { visitorId } = req.params;
//   const { response } = req.body;

//   console.log("Received response:", response);

//   if (!["Accepted", "Rejected"].includes(response)) {
//     return res.status(400).json({ message: "Invalid response value" });
//   }

//   try {
//     const updateFields =
//       response === "Accepted"
//         ? {
//             "visitors.$.occupantAcceptStatus": "Accepted",
//             "visitors.$.checkInTime": new Date(),
//             "visitors.$.status": "Checked-In",
//           }
//         : {
//             "visitors.$.occupantAcceptStatus": "Rejected",
//             "visitors.$.status": "Rejected",
//           };

//     // ✅ Update matching visitor inside bulk doc
//     const bulkVisitorDoc = await VisitorsBulk.findOneAndUpdate(
//       { "visitors._id": visitorId },
//       { $set: updateFields },
//       { new: true }
//     );

//     if (!bulkVisitorDoc) {
//       return res
//         .status(404)
//         .json({ message: "Visitor not found in bulk list" });
//     }

//     // ✅ Find the updated visitor subdocument
//     const updatedVisitor = bulkVisitorDoc.visitors.id(visitorId);

//     // ✅ Emit socket event to all occupants in that flat room
//     const io = getIO();
//     if (io && bulkVisitorDoc.flatId && bulkVisitorDoc.apartmentId) {
//       const roomKey = `${bulkVisitorDoc.apartmentId}_${bulkVisitorDoc.flatId}`;
//       console.log(`📢 Emitting bulk-visitor-response to room: ${roomKey}`);

//       io.to(roomKey).emit("bulk-visitor-response", {
//         visitorId,
//         response,
//         flatId: bulkVisitorDoc.flatId,
//         apartmentId: bulkVisitorDoc.apartmentId, // ✅ fixed
//         status: updatedVisitor?.status || response,
//         checkInTime: updatedVisitor?.checkInTime || null,
//         occupantAcceptStatus: updatedVisitor?.occupantAcceptStatus || response,
//       });
//     }
//     // ✅ Mark related notification as read
//     await markNotificationAsRead({
//       logId: visitorId,
//       logModel: "VisitorsBulk",
//       // selectedRoleId: req.auth?.selectedRoleId,
//     });

//     return res.json({
//       success: true,
//       message:
//         response === "Accepted"
//           ? "Visitor accepted and checked-in successfully"
//           : "Visitor rejected successfully",
//       updatedVisitor,
//     });
//   } catch (err) {
//     console.error("❌ Error updating occupant response:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
const { getIO } = require("../../../../../socket");
const {
  markNotificationAsRead,
} = require("../../../../../utils/markNotificationAsRead");

exports.acceptWihtClockInBulkVisitorOccupant = async (req, res) => {
  const { visitorId } = req.params;
  const { response } = req.body;

  console.log("Received response:", response);

  if (!["Accepted", "Rejected"].includes(response)) {
    return res.status(400).json({
      success: false,
      message: "Invalid response value. Must be Accepted or Rejected.",
    });
  }

  try {
    // 🕒 Prevent accepting if event expired
    const bulkVisitorDocCheck = await VisitorsBulk.findOne({
      "visitors._id": visitorId,
    });
    if (!bulkVisitorDocCheck) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor not found in bulk list" });
    }

    const now = new Date();
    let isExpired = false;

    if (bulkVisitorDocCheck.isMultipleDays) {
      if (
        bulkVisitorDocCheck.toDate &&
        new Date(bulkVisitorDocCheck.toDate) < now
      ) {
        isExpired = true;
      }
    } else {
      if (
        bulkVisitorDocCheck.visitDate &&
        new Date(bulkVisitorDocCheck.visitDate) < now
      ) {
        isExpired = true;
      }
    }

    if (isExpired) {
      return res.status(400).json({
        success: false,
        message:
          "Event date has expired. You cannot accept or reject this visitor.",
      });
    }

    const updateFields =
      response === "Accepted"
        ? {
            "visitors.$.occupantAcceptStatus": "Accepted",
            "visitors.$.checkInTime": new Date(),
            "visitors.$.status": "Checked-In",
          }
        : {
            "visitors.$.occupantAcceptStatus": "Rejected",
            "visitors.$.status": "Rejected",
          };

    // ✅ Update matching visitor inside bulk doc
    const bulkVisitorDoc = await VisitorsBulk.findOneAndUpdate(
      { "visitors._id": visitorId },
      { $set: updateFields },
      { new: true }
    );

    if (!bulkVisitorDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor not found after update" });
    }

    // ✅ Find the updated visitor subdocument
    const updatedVisitor = bulkVisitorDoc.visitors.id(visitorId);

    // ✅ Emit socket event
    const io = getIO();
    if (io && bulkVisitorDoc.flatId && bulkVisitorDoc.apartmentId) {
      const roomKey = `${bulkVisitorDoc.apartmentId}_${bulkVisitorDoc.flatId}`;
      console.log(`📢 Emitting bulk-visitor-response to room: ${roomKey}`);

      io.to(roomKey).emit("bulk-visitor-response", {
        visitorId,
        response,
        flatId: bulkVisitorDoc.flatId,
        apartmentId: bulkVisitorDoc.apartmentId,
        status: updatedVisitor?.status || response,
        checkInTime: updatedVisitor?.checkInTime || null,
        occupantAcceptStatus: updatedVisitor?.occupantAcceptStatus || response,
      });
    }

    // ✅ Mark related notification as read
    await markNotificationAsRead({
      logId: visitorId,
      logModel: "VisitorsBulk",
    });

    return res.json({
      success: true,
      message:
        response === "Accepted"
          ? "Visitor accepted and checked-in successfully"
          : "Visitor rejected successfully",
      updatedVisitor,
    });
  } catch (err) {
    console.error("❌ Error updating occupant response:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
