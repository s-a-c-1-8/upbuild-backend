const mongoose = require("mongoose");

const PollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

const PollSchema = new mongoose.Schema(
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

    question: { type: String, required: true },

    options: [PollOptionSchema],

    groups: [{ type: String, required: true }], // ✅ NEW FIELD

    startDateTime: { type: Date, required: true }, // ✅ NEW FIELD
    endDateTime: { type: Date, required: true }, // ✅ NEW FIELD

    votedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserRoleAssignment",
        },
        optionId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],
    // status: {
    //   type: String,
    //   enum: ["Active", "Closed"],
    //   default: "Active",
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityPoll", PollSchema);
