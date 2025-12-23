const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const User = require("../../../model/user/userModel");
const Role = require("../../../model/apartment/apartmentRole");
const logAction = require("../../../utils/logAction");
const notifyOccupants = require("../../../utils/notifyOccupants");
const notification = require("../../../model/user/notification");

exports.addComplaintComment = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { userId, apartment, flat, userType, comment } = req.body;

    if (!complaintId || !userId || !apartment || !comment || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userRole = await UserRoleAssignment.findOne({
      user: userId,
      apartment,
      ...(flat && mongoose.Types.ObjectId.isValid(flat)
        ? { flat }
        : { flat: null }),
    })
      .populate("user", "name")
      .populate("role", "name slug");

    if (!userRole) {
      return res.status(404).json({ message: "UserRoleAssignment not found" });
    }

    const complaint = await Complaint.findById(complaintId).populate(
      "flat assignedTo"
    );

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const roleSlug = userRole.role?.slug;
    let canComment = false;

    if (roleSlug === "apartment-admin") {
      canComment = true;
    } else if (
      roleSlug === "occupants" &&
      complaint.flat &&
      complaint.flat._id.toString() === userRole.flat?.toString()
    ) {
      canComment = true;
    } else if (
      complaint.assignedTo &&
      complaint.assignedTo._id.toString() === userRole._id.toString()
    ) {
      canComment = true;
    }

    if (!canComment) {
      const fullRole = await Role.findById(userRole.role._id).populate({
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      });

      const permissionNames = fullRole.permissions.map((p) => p.name);
      canComment = permissionNames.includes("can_add_comments_in_complaints");
    }

    if (!canComment) {
      return res.status(403).json({
        message: "You are not authorized to comment on this complaint",
      });
    }

    const MAX_FILE_SIZE_MB = 10;
    const files = req.processedUploads?.images || [];

    for (const file of files) {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({
          message: `Image '${file.originalname}' exceeds 10MB limit.`,
          fileSize: `${sizeInMB.toFixed(2)} MB`,
        });
      }
    }

    const imageUrls = files.map((f) => f.path.replace("uploads/", ""));

    const commentData = {
      user: userRole._id,
      comment,
      images: imageUrls,
      createdAt: new Date(),
    };

    complaint.comments.push(commentData);
    await complaint.save();

    await logAction({
      req,
      action: "ADD_COMPLAINT_COMMENT",
      description: `Added comment on complaint ${complaint.complaintId} by ${userRole.user.name}`,
      metadata: {
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        commentText: comment,
        userRoleId: userRole._id,
        userName: userRole.user.name,
        role: userRole.role?.name || null,
        imageCount: imageUrls.length,
      },
    });


    // notification logic
    if (roleSlug === "occupants") {
      if (complaint.assignedTo) {
        await notification.create({
          apartmentId: complaint.apartment,
          flatId: complaint.flat,
          message: `New comment from ${userRole.user.name} on complaint "${complaint.title}"`,
          logId: complaint._id,
          logModel: "Complaint",
          recipients: [complaint.assignedTo._id],
          link: `${process.env.FRONTEND_URL}apartment/complaints/update/${complaint._id}`,
        });
      }
    } else if (
      complaint.assignedTo &&
      complaint.assignedTo._id.toString() === userRole._id.toString()
    ) {
      await notifyOccupants({
        apartmentId: complaint.apartment,
        flatId: complaint.flat,
        message: `New reply from ${userRole.user.name} on complaint "${complaint.title}"`,
        logId: complaint._id,
        logModel: "Complaint",
        link: `${process.env.FRONTEND_URL}apartment/complaints/update/${complaint._id}`,
      });
    } else {
      const recipients = [];
      if (complaint.assignedTo) {
        recipients.push(complaint.assignedTo._id);
      }

      await notifyOccupants({
        apartmentId: complaint.apartment,
        flatId: complaint.flat,
        message: `New comment from ${userRole.user.name} on complaint "${complaint.title}"`,
        logId: complaint._id,
        logModel: "Complaint",
        link: `${process.env.FRONTEND_URL}apartment/complaints/update/${complaint._id}`,
      });

      if (recipients.length > 0) {
        await notification.create({
          apartmentId: complaint.apartment,
          flatId: complaint.flat,
          message: `New comment from ${userRole.user.name} on complaint "${complaint.title}"`,
          logId: complaint._id,
          logModel: "Complaint",
          recipients,
          link: `${process.env.FRONTEND_URL}apartment/complaints/update/${complaint._id}`,
        });
      }
    }

    return res.status(200).json({
      message: "Comment added successfully",
      data: {
        comment,
        images: imageUrls,
        user: {
          name: userRole.user.name,
          role: userRole.role?.name || "",
        },
        createdAt: commentData.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ Error adding comment:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};


// exports.getComplaintComments = async (req, res) => {
//   try {
//     const { complaintId } = req.params;

//     if (!complaintId) {
//       return res.status(400).json({ message: "Complaint ID is required" });
//     }

//     const complaint = await Complaint.findById(complaintId).populate({
//       path: "comments.user",
//       populate: [
//         { path: "user", select: "name" },
//         { path: "role", select: "name" },
//       ],
//     });

//     if (!complaint) {
//       return res.status(404).json({ message: "Complaint not found" });
//     }

//     const formattedComments = (complaint.comments || []).map((c) => ({
//       _id: c._id,
//       userName: c.user?.user?.name || "Unknown",
//       role: c.user?.role?.name || "",
//       message: c.comment,
//       images: c.images || [], // ✅ include image paths if available
//       createdAt: c.createdAt,
//     }));

//     return res.status(200).json({
//       message: "Comments fetched successfully",
//       data: formattedComments,
//     });
//   } catch (err) {
//     console.error("❌ Error fetching comments:", err);
//     return res.status(500).json({
//       message: "Server error while fetching comments",
//       error: err.message,
//     });
//   }
// };

exports.getComplaintComments = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!complaintId || !mongoose.Types.ObjectId.isValid(complaintId)) {
      return res
        .status(400)
        .json({ message: "Valid Complaint ID is required" });
    }

    // 🔐 Get and validate role
    let roleSlug = null;
    let roleAssignment = null;

    if (selectedRoleId) {
      roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");
      roleSlug = roleAssignment?.role?.slug;

      if (!roleAssignment || !roleSlug) {
        return res
          .status(403)
          .json({ message: "Access denied. Invalid role." });
      }
    }

    // 🧾 Fetch complaint with comments and related user info
    const complaint = await Complaint.findById(complaintId)
      .populate("flat", "flatName blockName flatType")
      .populate({
        path: "assignedTo",
        select: "_id",
      })
      .populate({
        path: "comments.user",
        populate: [
          { path: "user", select: "name" },
          { path: "role", select: "name" },
        ],
      });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 🔒 Access control (3 role-based + 1 permission fallback)
    let canView = false;

    // 1. Occupants can view comments if complaint is from their flat
    if (roleSlug === "occupants") {
      canView =
        flatIdFromToken &&
        complaint.flat &&
        complaint.flat._id.toString() === flatIdFromToken.toString();
    }

    // 2. Admins can always view
    else if (roleSlug === "apartment-admin") {
      canView = true;
    }

    // 3. Assigned staff can view
    else if (
      complaint.assignedTo &&
      complaint.assignedTo._id.toString() === selectedRoleId.toString()
    ) {
      canView = true;
    }

    // 4. Fallback — check if role has permission `can_view_comments_in_complaint`
    if (!canView) {
      const fullRole = await Role.findById(roleAssignment.role._id).populate({
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      });

      const permissionNames = fullRole.permissions.map((p) => p.name);
      canView = permissionNames.includes("can_view_comments_in_complaint");
    }

    if (!canView) {
      return res.status(403).json({
        message: "You are not authorized to view comments of this complaint",
      });
    }

    // 💬 Format comments
    const formattedComments = (complaint.comments || []).map((c) => ({
      _id: c._id,
      userName: c.user?.user?.name || "Unknown",
      role: c.user?.role?.name || "",
      message: c.comment,
      images: c.images || [],
      createdAt: c.createdAt,
    }));

    return res.status(200).json({
      message: "Comments fetched successfully",
      data: formattedComments,
    });
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    return res.status(500).json({
      message: "Server error while fetching comments",
      error: err.message,
    });
  }
};
