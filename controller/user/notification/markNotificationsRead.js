// controllers/notificationController.js
const Notification = require("../../../model/user/notification");

exports.markMyNotificationsRead = async (req, res) => {
  try {
    const { ids } = req.body; // array of notification IDs to mark read
    const recipientId = req.auth?.selectedRoleId; // logged-in role assignment

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient role not found" });
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: "No notification IDs provided" });
    }

    // Update all given notifications:
    await Notification.updateMany(
      { _id: { $in: ids }, recipients: recipientId },
      {
        $addToSet: {
          readRecipients: { recipient: recipientId, readAt: new Date() },
        },
        $pull: { recipients: recipientId }, // ✅ remove from unread recipients
      }
    );

    return res.json({
      success: true,
      message: "Notifications marked as read",
      ids,
    });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
