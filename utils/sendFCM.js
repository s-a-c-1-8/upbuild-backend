const admin = require("../firebase/firebaseAdmin");

/**
 * Send FCM push notification
 * - Shows system notification (notification block)
 * - Sends extra data for in-app handling (data block)
 */
async function sendFCM(token, title, body, data = {}) {
  const message = {
    token,

    // 🔔 REQUIRED: This makes the notification SHOW in Android UI
    notification: {
      title: String(title),
      body: String(body),
    },

    // 📦 OPTIONAL: Silent data for app navigation / logic
    data: {
      notificationId: data.notificationId ? String(data.notificationId) : "",
      flatId: data.flatId ? String(data.flatId) : "",
      apartmentId: data.apartmentId ? String(data.apartmentId) : "",
      type: data.type ? String(data.type) : "VISITOR",
    },

    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
  };

  return admin.messaging().send(message);
}

module.exports = sendFCM;
