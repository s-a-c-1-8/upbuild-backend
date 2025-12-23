const Notification = require("../model/user/notification");

// Moves recipient(s) from `recipients` to `readRecipients` with timestamp
const markNotificationAsRead = async ({ logId, logModel, selectedRoleId }) => {
  try {
    if (selectedRoleId) {
      // ✅ Mark only the selected role as read
      await Notification.updateMany(
        { logId, logModel, recipients: selectedRoleId },
        {
          $pull: { recipients: selectedRoleId },
          $push: {
            readRecipients: {
              recipient: selectedRoleId,
              readAt: new Date(),
            },
          },
        }
      );
    } else {
      // ✅ Mark ALL recipients as read
      const notifications = await Notification.find({ logId, logModel });

      for (const n of notifications) {
        if (!n.recipients || n.recipients.length === 0) continue;

        const now = new Date();
        const updates = n.recipients.map(r => ({
          recipient: r,
          readAt: now,
        }));

        await Notification.updateOne(
          { _id: n._id },
          {
            $set: { recipients: [] },
            $push: { readRecipients: { $each: updates } },
          }
        );
      }
    }
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
};

module.exports = { markNotificationAsRead };
