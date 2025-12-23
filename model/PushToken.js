// models/PushToken.js
const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
    },
    apartmentId: mongoose.Schema.Types.ObjectId,
    flatId: mongoose.Schema.Types.ObjectId,
    device: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushToken", pushTokenSchema);
