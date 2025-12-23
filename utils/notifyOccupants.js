const Flat = require("../model/flat/flatModel");
const UserRoleAssignment = require("../model/user/userRoleAssignment");
const Notification = require("../model/user/notification");
const PushToken = require("../model/PushToken");
const sendExpoPush = require("../utils/sendExpoPush");

module.exports = async function notifyOccupants({
  apartmentId,
  flatId,
  message,
  logId,
  logModel,
  link,
}) {
  try {
    if (!apartmentId || !flatId || !logId || !logModel || !message) {
      console.warn("⚠️ Missing required fields in notifyOccupants call");
      return;
    }

    // 🔹 1. Find flat
    const flat = await Flat.findById(flatId).lean();
    if (!flat) {
      console.warn(`⚠️ Flat ${flatId} not found`);
      return;
    }

    // 🔹 2. Decide relationship types
    const relationshipTypes =
      flat.ownerStaying === true
        ? ["owner", "owner_occupant"]
        : ["tenant", "tenant_occupant"];

    // 🔹 3. Find active assignments
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      flat: flatId,
      relationshipType: { $in: relationshipTypes },
      active: true,
    }).select("_id user"); // ⚠️ make sure `user` exists here

    const recipientAssignmentIds = assignments.map((a) => a._id);
    const recipientUserIds = assignments.map((a) => a.user);

    if (recipientAssignmentIds.length === 0) {
      console.log(
        `ℹ️ No active role assignments found for flat ${flatId} [${relationshipTypes.join(
          ", "
        )}]`
      );
      return;
    }

    // 🔹 4. Save notification in DB
    const notification = await Notification.create({
      apartmentId,
      flatId,
      message,
      logId,
      logModel,
      recipients: recipientAssignmentIds,
      link: link || null,
    });

    console.log(
      `📢 Notification created for flat ${flatId} → recipients: ${recipientAssignmentIds.length}`
    );

    // 🔹 5. Fetch Expo push tokens
    const pushTokens = await PushToken.find({
      userId: { $in: recipientUserIds },
      apartmentId,
      flatId,
      expoPushToken: { $exists: true },
    }).distinct("expoPushToken");

    if (!pushTokens.length) {
      console.log("⚠️ No Expo push tokens found for recipients");
      return;
    }

    // 🔹 6. Send PUSH notification 🚀
    await sendExpoPush(pushTokens, "New Visitor Alert", message, {
      notificationId: notification._id.toString(),
      flatId,
      apartmentId,
      link,
      type: logModel, // e.g. VISITOR_LOG
    });
  } catch (err) {
    console.error("❌ Failed to send occupant notification:", err);
  }
};
