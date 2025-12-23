// const mongoose = require("mongoose");
// const Complaint = require("../../../model/flat/complaint");
// const logAction = require("../../../utils/logAction");

// exports.getComplaintAssignmentDetails = async (req, res) => {
//   try {
//     const { id } = req.params; // complaint ID

//     if (!id) {
//       return res.status(400).json({ message: "Complaint ID is required" });
//     }

//     const complaint = await Complaint.findById(id)
//       .populate({
//         path: "assignedTo",
//         populate: {
//           path: "user role",
//           select: "name phone email",
//         },
//       })
//       .select("assignedTo assignmentDescription status");

//     if (!complaint) {
//       return res.status(404).json({ message: "Complaint not found" });
//     }

//     if (!complaint.assignedTo) {
//       return res.status(200).json({
//         message: "Complaint is not yet assigned",
//         assignedTo: null,
//         assignmentDescription: null,
//         status: complaint.status || "Pending",
//       });
//     }

//     const assigneeUser = complaint.assignedTo.user;
//     const assigneeRole = complaint.assignedTo.role;

//     const result = {
//       assignedTo: {
//         name: assigneeUser?.name || "",
//         phone: assigneeUser?.phone || "",
//         email: assigneeUser?.email || "",
//         role: assigneeRole?.name || "",
//       },
//       assignmentDescription: complaint.assignmentDescription || "",
//       status: complaint.status || "Pending",
//     };

//     return res.status(200).json({
//       message: "Assignment details fetched successfully",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error fetching assignment details:", error);
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };

const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../model/apartment/apartmentrole");
const Permission = require("../../../model/apartment/apartmentPermission");
const logAction = require("../../../utils/logAction");
const notification = require("../../../model/user/notification");

exports.getComplaintAssignmentDetails = async (req, res) => {
  try {
    const { id } = req.params; // complaint ID
    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Valid Complaint ID is required" });
    }

    // 🔐 Get role
    let roleSlug = null;
    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(
        selectedRoleId
      ).populate("role");
      roleSlug = roleAssignment?.role?.slug;
      if (!roleAssignment || !roleSlug) {
        return res
          .status(403)
          .json({ message: "Access denied. Invalid role." });
      }
    }

    // 🧾 Fetch complaint with populated fields
    const complaint = await Complaint.findById(id)
      .populate({
        path: "flat",
        select: "flatName blockName flatType",
      })
      .populate({
        path: "assignedTo",
        populate: {
          path: "user role",
          select: "name phone email",
        },
      })
      .populate({
        path: "assignmentHistory.assignedTo",
        populate: {
          path: "user role",
          select: "name phone email",
        },
      })
      .select("assignedTo assignmentDescription assignmentHistory status flat");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 🔒 Role-based Access Control
    let canAccess = false;

    if (["apartment-admin"].includes(roleSlug)) {
      canAccess = true;
    } else if (roleSlug === "occupants") {
      canAccess =
        complaint.flat &&
        flatIdFromToken &&
        complaint.flat._id.toString() === flatIdFromToken.toString();
    } else {
      canAccess =
        complaint.assignedTo &&
        complaint.assignedTo._id.toString() === selectedRoleId.toString();
    }

    if (!canAccess) {
      return res.status(403).json({
        message:
          "You are not authorized to view assignment details of this complaint",
      });
    }

    // ⏳ If not assigned
    if (!complaint.assignedTo) {
      return res.status(200).json({
        message: "Complaint is not yet assigned",
        assignedTo: null,
        assignmentDescription: null,
        status: complaint.status || "Pending",
        assignmentHistory: [],
      });
    }

    // ✅ Current assignee details
    const assigneeUser = complaint.assignedTo.user;
    const assigneeRole = complaint.assignedTo.role;

    const current = {
      assignedTo: {
        name: assigneeUser?.name || "",
        phone: assigneeUser?.phone || "",
        email: assigneeUser?.email || "",
        role: assigneeRole?.name || "",
      },
      assignmentDescription: complaint.assignmentDescription || "",
      status: complaint.status || "Pending",
    };

    // ✅ Assignment History (optional)
    const history = (complaint.assignmentHistory || []).map((entry) => ({
      assignedTo: {
        name: entry.assignedTo?.user?.name || "",
        phone: entry.assignedTo?.user?.phone || "",
        email: entry.assignedTo?.user?.email || "",
        role: entry.assignedTo?.role?.name || "",
      },
      assignmentDescription: entry.assignmentDescription || "",
      assignedAt: entry.assignedAt,
    }));

    return res.status(200).json({
      message: "Assignment details fetched successfully",
      data: {
        ...current,
        assignmentHistory: history,
      },
    });
  } catch (error) {
    console.error("Error fetching assignment details:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.assignComplaint = async (req, res) => {
  const { complaintId } = req.params;
  const { assignedTo, assignmentDescription } = req.body;

  if (!assignedTo) {
    return res.status(400).json({ message: "Assignee is required." });
  }

  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    return res.status(400).json({ message: "Invalid UserRoleAssignment ID." });
  }

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    // 🚫 Block assignment if already resolved or rejected
    if (["Resolved", "Rejected"].includes(complaint.status)) {
      return res.status(400).json({
        message: `Cannot assign a complaint that is already ${complaint.status.toLowerCase()}.`,
      });
    }

    // 🔍 Validate the assignedTo role exists
    const assignment = await UserRoleAssignment.findById(assignedTo);
    if (!assignment) {
      return res.status(404).json({ message: "Assigned user role not found." });
    }

    // ✅ Push previous assignment to history (if exists)
    if (complaint.assignedTo) {
      complaint.assignmentHistory = complaint.assignmentHistory || [];
      complaint.assignmentHistory.push({
        assignedTo: complaint.assignedTo,
        assignedAt: complaint.assignedAt,
        assignmentDescription: complaint.assignmentDescription,
      });
    }

    // ✅ Assign new values
    complaint.assignedTo = assignedTo;
    complaint.assignmentDescription = assignmentDescription || "";
    complaint.status = "In Progress";
    complaint.assignedAt = new Date();

    await complaint.save();

    // 🪵 Log the action
    await logAction({
      req,
      action: complaint.assignmentHistory?.length
        ? "REASSIGN_COMPLAINT"
        : "ASSIGN_COMPLAINT",
      description: `${
        complaint.assignmentHistory?.length ? "Reassigned" : "Assigned"
      } complaint ${complaint.complaintId} to userRole ${assignedTo}`,
      metadata: {
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        assignedTo,
        status: complaint.status,
        assignmentDescription,
      },
    });

    // 🔔 Notify the assignee (only him, not admins)
    await notification.create({
      apartmentId: complaint.apartment,
      message: `You have been assigned a complaint: ${complaint.title} (${complaint.complaintType}, Priority: ${complaint.priority}). Please review it, add comments if necessary, communicate with the occupants, and once the complaint is addressed, update its status to Resolved or Rejected.`,
      logId: complaint._id,
      logModel: "Complaint",
      flatId: complaint.flat,
      recipients: [assignedTo], // 👈 notify the user from UserRoleAssignment
      link: `${process.env.FRONTEND_URL}apartment/complaints/update/${complaint._id}`,
    });

    return res.status(200).json({
      message: complaint.assignmentHistory?.length
        ? "Complaint reassigned successfully."
        : "Complaint assigned successfully.",
      reassigned: !!complaint.assignmentHistory?.length,
    });
  } catch (err) {
    console.error("❌ Assign complaint error:", err);
    return res.status(500).json({ message: "Server error while assigning." });
  }
};
