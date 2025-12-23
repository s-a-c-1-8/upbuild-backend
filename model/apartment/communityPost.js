const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({ filePath: String }, { _id: false });

const CommentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CommunityPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment" },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
    },

    likedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "UserRoleAssignment" },
    ],

    media: [MediaSchema],
    comments: [CommentSchema], // ← plural
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityPost", CommunityPostSchema);
