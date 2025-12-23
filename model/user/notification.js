const mongoose = require("mongoose");
const { getIO, getKey, userSocketMap } = require("../../socket"); // ✅ getKey + userSocketMap
const UserRoleAssignment = require("../user/userRoleAssignment");

const notificationSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    readRecipients: [
      {
        recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserRoleAssignment",
          required: true,
        },
        readAt: { type: Date },
      },
    ],
    logId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "logModel",
    },
    logModel: {
      type: String,
      enum: [
        "VisitorLog",
        "MonthlyMaintenanceExpense",
        "Complaint",
        "VisitorsBulk",
        "EventFlatMaintenance",
        "CorpusFlatMaintenance",
        "MonthlyFlatMaintenance",
        "UnapprovedUser",
        "BookingAmenity",
        "CommunityPost",
        "CommunityPoll",
        "CommunityNotice"
      ],
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserRoleAssignment",
        required: true,
      },
    ],
    link: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * 🔔 Emit socket events to specific recipients
 */
// async function emitNotificationChanged(doc) {
//   try {
//     const io = getIO();
//     if (!io || !doc) return;

//     console.log("📢 Notification changed:", doc._id);

//     // Loop through all recipients
//     for (const recipientId of doc.recipients) {
//       const assignment = await UserRoleAssignment.findById(recipientId)
//         .select("user apartment role")
//         .lean();

//       if (!assignment) continue;

//       // Build the socket key (userId_apartmentId_roleId)
//       const key = getKey({
//         userId: assignment.user,
//         apartmentId: assignment.apartment,
//         userType: assignment.role, // here roleId is used as userType
//       });

//       const socketId = userSocketMap.get(key);

//       if (socketId) {
//         io.to(socketId).emit("notification:changed", {
//           notificationId: doc._id,
//         });
//         console.log(`✅ Emitted notification ${doc._id} to ${key}`);
//       } else {
//         console.log(`⚠️ No active socket for ${key}`);
//       }
//     }
//   } catch (err) {
//     console.error("❌ Socket emit failed (notification:changed):", err);
//   }
// }
// fire after create
async function emitNotificationChanged(doc) {
  try {
    const io = getIO();
    if (!io || !doc || !doc.recipients) {
      console.log("⚠️ Skipping emit, no recipients or doc:", doc?._id);
      return;
    }

    console.log("📢 Notification changed:", doc._id);

    for (const recipientId of doc.recipients) {
      const assignment = await UserRoleAssignment.findById(recipientId)
        .select("user apartment role")
        .lean();

      if (!assignment) continue;

      const key = getKey({
        userId: assignment.user,
        apartmentId: assignment.apartment,
        userType: assignment.role,
      });

      const socketId = userSocketMap.get(key);

      if (socketId) {
        io.to(socketId).emit("notification:changed", {
          notificationId: doc._id,
        });
        console.log(`✅ Emitted notification ${doc._id} to ${key}`);
      } else {
        console.log(`⚠️ No active socket for ${key}`);
      }
    }
  } catch (err) {
    console.error("❌ Socket emit failed (notification:changed):", err);
  }
}

notificationSchema.post("save", emitNotificationChanged);

// fire after single update
notificationSchema.post("findOneAndUpdate", async function (res) {
  if (!res) return;
  await emitNotificationChanged(res);
});

// fire after multiple updates (need to fetch manually)
notificationSchema.post("updateMany", async function (res) {
  const filter = this.getFilter();
  const docs = await this.model.find(filter);
  for (const doc of docs) {
    await emitNotificationChanged(doc);
  }
});

// fire after delete
notificationSchema.post("findOneAndDelete", async function (res) {
  if (!res) return;
  await emitNotificationChanged(res);
});

// // fire after create
// notificationSchema.post("save", emitNotificationChanged);

// // fire after update operations
// notificationSchema.post("findOneAndUpdate", emitNotificationChanged);
// notificationSchema.post("updateMany", emitNotificationChanged);

// // fire after delete
// notificationSchema.post("findOneAndDelete", emitNotificationChanged);

module.exports = mongoose.model("Notification", notificationSchema);
