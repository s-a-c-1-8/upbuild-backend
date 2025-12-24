const admin = require("../firebase/firebaseAdmin");

async function sendFCM(token, title, body, data = {}) {
  const message = {
    token,
    data: {
      title: String(title),
      body: String(body),

      notificationId: String(data.notificationId),
      flatId: String(data.flatId),
      apartmentId: String(data.apartmentId),
      type: String(data.type || "VISITOR"),
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
