const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true },

    title: { type: String, required: true },
    description: { type: String },
    complaintType: { type: String, required: true },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    attachments: [
      {
        fileName: { type: String },
        filePath: { type: String },
        type: { type: String },
      },
    ],
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },

    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    visibleInCommunity: {
      type: Boolean,
      default: false,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
    },
    assignmentDescription: {
      type: String,
    },
    assignedAt: {
      type: Date, // ✅ NEW
    },
    statusDescription: {
      type: String,
      default: "", // ✅ to store update notes/comments
    },
    statusChangedAt: {
      type: Date, // ✅ to track when the status was last changed
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
    },
assignmentHistory: [
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRoleAssignment",
    },
    assignedAt: {
      type: Date,
    },
    assignmentDescription: {
      type: String,
    },
  },
],
    // ✅ New: Comments array
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserRoleAssignment",
          required: true,
        },
        comment: {
          type: String,
          required: true,
        },
        images: [
          {
            type: String, // will store relative image path (e.g., complaint/filename.jpg)
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
