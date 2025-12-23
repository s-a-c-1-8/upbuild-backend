const { Expo } = require("expo-server-sdk");

const expo = new Expo();

async function sendExpoPush(tokens, title, body, data = {}) {
  const messages = [];

  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn("❌ Invalid Expo token:", token);
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log("📬 Push sent:", receipts);
    } catch (err) {
      console.error("❌ Push error:", err);
    }
  }
}

module.exports = sendExpoPush;
