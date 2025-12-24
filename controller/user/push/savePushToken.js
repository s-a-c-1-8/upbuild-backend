// // controller/user/push/savePushToken.js
// const PushToken = require("../../../model/PushToken");

// const savePushToken = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { token, apartmentId, flatId } = req.body;
//     console.log("✅ Expo Push Token: ExponentPushToken[...]", token);
    
//     if (!token) {
//       return res.status(400).json({ message: "Push token is required" });
//     }

//     // Remove token if already used by another user
//     await PushToken.findOneAndDelete({
//       expoPushToken: token,
//       userId: { $ne: userId },
//     });

//     const saved = await PushToken.findOneAndUpdate(
//       { userId },
//       {
//         expoPushToken: token,
//         apartmentId,
//         flatId,
//         device: req.headers["user-agent"]?.includes("Android")
//           ? "android"
//           : "ios",
//       },
//       { upsert: true, new: true }
//     );

//     return res.json({
//       success: true,
//       message: "Push token saved",
//       data: saved,
//     });
//   } catch (err) {
//     console.error("savePushToken error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// module.exports = { savePushToken };
// controller/user/push/savePushToken.js
const PushToken = require("../../../model/PushToken");

const savePushToken = async (req, res) => {
  console.log("🔥 savePushToken HIT");
  console.log("User:", req.user);
  console.log("Body:", req.body);

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fcmToken, apartmentId, flatId } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }

  const saved = await PushToken.findOneAndUpdate(
    { userId },
    { fcmToken, apartmentId, flatId, device: "android" },
    { upsert: true, new: true }
  );

  console.log("✅ Push token saved:", saved);
  res.json({ success: true });
};



module.exports = { savePushToken };
