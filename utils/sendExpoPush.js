const { sendFCM } = require("../firebase/firebaseAdmin");

await sendFCM(user.fcmToken, "New Visitor", "Someone is waiting at the gate", {
  visitorId,
});
