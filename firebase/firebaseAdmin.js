const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function sendFCM(token, title, body, data = {}) {
  const message = {
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
  };

  return admin.messaging().send(message);
}

module.exports = { sendFCM };
