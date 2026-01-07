// controller/user/push/savePushToken.js
const PushToken = require("../../../model/PushToken");

const savePushToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fcmToken, apartmentId, flatId } = req.body;

    if (!fcmToken || !apartmentId || !flatId) {
      return res.status(400).json({
        message: "fcmToken, apartmentId and flatId are required",
      });
    }

    // 🔥 IMPORTANT:
    // One active token per user + flat + device
    const saved = await PushToken.findOneAndUpdate(
      {
        userId,
        apartmentId,
        flatId,
        device: "android",
      },
      {
        fcmToken,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log("✅ FCM token upserted:", saved.fcmToken);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ savePushToken error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { savePushToken };
