const mongoose = require("mongoose");

const CommunityNoticeSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    groups: [{ type: String, required: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityNotice", CommunityNoticeSchema);
