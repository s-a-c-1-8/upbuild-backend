const admin = require("../firebase/firebaseAdmin");

async function sendFCM(token, title, body, data = {}) {
  return admin.messaging().send({
    token,
    notification: {
      title,
      body,
    },
    data,
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
  });
}

module.exports = sendFCM;
