const Notification = require("../../../model/user/notification");

exports.getMyNotifications = async (req, res) => {
  const selectedRoleId = req.auth?.selectedRoleId;
  if (!selectedRoleId) {
    return res.status(403).json({ message: "Access denied. No role selected." });
  }

  try {
    // Fetch notifications where the selectedRoleId is still in recipients
    const notifications = await Notification.find({
      recipients: selectedRoleId,
    })
      .sort({ createdAt: -1 }) // latest first
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
      count: notifications.length, // ✅ added count
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
