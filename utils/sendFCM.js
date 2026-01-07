// utils/sendFCM.js
const admin = require("../firebase/firebaseAdmin");
const PushToken = require("../model/PushToken");

async function sendFCM(token, title, body, data = {}) {
  const message = {
    token,

    // 🔔 System notification
    notification: {
      title: String(title),
      body: String(body),
    },

    // 📦 Extra data
    data: {
      notificationId: data.notificationId || "",
      flatId: data.flatId || "",
      apartmentId: data.apartmentId || "",
      type: data.type || "VISITOR",
    },

    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ FCM sent:", response);
    return response;
  } catch (err) {
    const code = err?.errorInfo?.code;
    console.error("❌ FCM send failed:", code);

    // 🔥 CLEAN DEAD TOKENS AUTOMATICALLY
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      console.warn("🧹 Removing invalid FCM token:", token);
      await PushToken.deleteOne({ fcmToken: token });
    }

    throw err;
  }
}

module.exports = sendFCM;
