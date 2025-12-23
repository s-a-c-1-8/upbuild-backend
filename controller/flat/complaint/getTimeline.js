// const Complaint = require("../../../model/flat/complaint");

// exports.getComplaintTimeline = async (req, res) => {
//   try {
//     const { complaintId } = req.params;
//     const flatIdFromToken = req.auth?.flatId || null;

//     if (!complaintId) {
//       return res.status(400).json({ message: "Complaint ID is required" });
//     }

//     const complaint = await Complaint.findById(complaintId)
//       .populate({
//         path: "flat",
//         select: "flatName blockName flatType",
//       })
//       .populate({
//         path: "assignedTo",
//         populate: {
//           path: "user",
//           select: "name",
//         },
//       });

//     if (!complaint) {
//       return res.status(404).json({ message: "Complaint not found" });
//     }

//     // 🔐 Restrict flat users to their own flat's complaints only
//     if (
//       flatIdFromToken &&
//       complaint.flat &&
//       complaint.flat._id.toString() !== flatIdFromToken.toString()
//     ) {
//       return res.status(403).json({
//         message: "Unauthorized access to timeline of this complaint",
//       });
//     }

//     const timeline = [];

//     // Created
//     timeline.push({
//       date: complaint.createdAt,
//       label: "Complaint Created",
//       comment: "",
//       isActive: false,
//     });

//     // Assigned
//     if (complaint.assignedTo && complaint.assignedAt) {
//       timeline.push({
//         date: complaint.assignedAt,
//         label: `Assigned to ${complaint.assignedTo.user?.name || "User"}`,
//         comment: complaint.assignmentDescription || "",
//         isActive: false,
//       });
//     }

//     // Status update
//     if (complaint.statusChangedAt && complaint.status !== "Pending") {
//       timeline.push({
//         date: complaint.statusChangedAt,
//         label: `Status changed to ${complaint.status}`,
//         comment: complaint.statusDescription || "",
//         isActive: true,
//       });
//     }

//     return res.status(200).json({
//       message: "Timeline fetched successfully",
//       data: {
//         flat: complaint.flat
//           ? `${complaint.flat.flatName}-${complaint.flat.blockName} (${complaint.flat.flatType})`
//           : "Flat",
//         title: complaint.title,
//         priority: complaint.priority,
//         createdAt: complaint.createdAt,
//         status: complaint.status,
//         timeline,
//       },
//     });
//   } catch (err) {
//     console.error("Error in getComplaintTimeline:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// const mongoose = require("mongoose");
// const Complaint = require("../../../model/flat/complaint");
// const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
// const Role = require("../../../model/apartment/apartmentRole");

// exports.getComplaintTimeline = async (req, res) => {
//   try {
//     const { complaintId } = req.params;
//     const flatIdFromToken = req.auth?.flatId || null;
//     const selectedRoleId = req.auth?.selectedRoleId || null;

//     if (!complaintId || !mongoose.Types.ObjectId.isValid(complaintId)) {
//       return res
//         .status(400)
//         .json({ message: "Valid Complaint ID is required" });
//     }

//     // 🔐 Get and validate role
//     let roleSlug = null;
//     let roleAssignment = null;
//     if (selectedRoleId) {
//       roleAssignment = await UserRoleAssignment.findById(
//         selectedRoleId
//       ).populate("role");
//       roleSlug = roleAssignment?.role?.slug;

//       if (!roleAssignment || !roleSlug) {
//         return res
//           .status(403)
//           .json({ message: "Access denied. Invalid role." });
//       }
//     }

//     // 🧾 Fetch complaint with required users
//     const complaint = await Complaint.findById(complaintId)
//       .populate({
//         path: "flat",
//         select: "flatName blockName flatType",
//       })
//       .populate({
//         path: "assignedTo",
//         populate: {
//           path: "user",
//           select: "name",
//         },
//       })
//       .populate({
//         path: "statusUpdatedBy",
//         populate: {
//           path: "user",
//           select: "name",
//         },
//       });

//     if (!complaint) {
//       return res.status(404).json({ message: "Complaint not found" });
//     }

//     // 🔒 Access Control
//     let canView = false;

//     if (roleSlug === "apartment-admin") {
//       canView = true;
//     } else if (roleSlug === "occupants") {
//       canView =
//         flatIdFromToken &&
//         complaint.flat &&
//         complaint.flat._id.toString() === flatIdFromToken.toString();
//     } else if (
//       complaint.assignedTo &&
//       complaint.assignedTo._id.toString() === selectedRoleId.toString()
//     ) {
//       canView = true;
//     }

//     // 🔁 Only fallback: check for full-access permission
//     if (!canView && roleAssignment?.role?._id) {
//       const fullRole = await Role.findById(roleAssignment.role._id).populate({
//         path: "permissions",
//         match: { status: "Active" },
//         select: "name",
//       });

//       const permissionNames = fullRole.permissions.map((p) => p.name);

//       if (permissionNames.includes("can_view_complaint_page_with_all_data")) {
//         canView = true;
//       }
//     }

//     if (!canView) {
//       return res.status(403).json({
//         message: "Access denied to this complaint's timeline",
//       });
//     }

//     // 🧱 Construct timeline
//     const timeline = [];

//     timeline.push({
//       date: complaint.createdAt,
//       label: "Complaint Created",
//       comment: "",
//       isActive: false,
//     });

//     if (complaint.assignedTo && complaint.assignedAt) {
//       const isReassigned = complaint.assignmentHistory?.length > 0;

//       timeline.push({
//         date: complaint.assignedAt,
//         label: `${isReassigned ? "Reassigned to" : "Assigned to"} ${
//           complaint.assignedTo.user?.name || "User"
//         }`,
//         comment: complaint.assignmentDescription || "",
//         isActive: false,
//       });
//     }

//     if (complaint.statusChangedAt && complaint.status !== "Pending") {
//       const updater = complaint.statusUpdatedBy?.user?.name;
//       timeline.push({
//         date: complaint.statusChangedAt,
//         label: `Status changed to ${complaint.status}${
//           updater ? ` by ${updater}` : ""
//         }`,
//         comment: complaint.statusDescription || "",
//         isActive: true,
//       });
//     }

//     return res.status(200).json({
//       message: "Timeline fetched successfully",
//       data: {
//         flat: complaint.flat
//           ? `${complaint.flat.flatName}-${complaint.flat.blockName} (${complaint.flat.flatType})`
//           : "Flat",
//         title: complaint.title,
//         priority: complaint.priority,
//         createdAt: complaint.createdAt,
//         status: complaint.status,
//         timeline,
//       },
//     });
//   } catch (err) {
//     console.error("Error in getComplaintTimeline:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const Role = require("../../../model/apartment/apartmentRole");

exports.getComplaintTimeline = async (req, res) => {
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
        return res.status(403).json({ message: "Access denied. Invalid role." });
      }
    }

    // 🧾 Fetch complaint with required users and roles
    const complaint = await Complaint.findById(complaintId)
      .populate({
        path: "flat",
        select: "flatName blockName flatType",
      })
      .populate({
        path: "assignedTo",
        populate: [
          { path: "user", select: "name" },
          { path: "role", select: "name" },
        ],
      })
      .populate({
        path: "statusUpdatedBy",
        populate: {
          path: "user",
          select: "name",
        },
      });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 🔒 Access Control
    let canView = false;

    if (roleSlug === "apartment-admin") {
      canView = true;
    } else if (roleSlug === "occupants") {
      canView =
        flatIdFromToken &&
        complaint.flat &&
        complaint.flat._id.toString() === flatIdFromToken.toString();
    } else if (
      complaint.assignedTo &&
      complaint.assignedTo._id.toString() === selectedRoleId.toString()
    ) {
      canView = true;
    }

    // 🔁 Only fallback: check for full-access permission
    if (!canView && roleAssignment?.role?._id) {
      const fullRole = await Role.findById(roleAssignment.role._id).populate({
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      });

      const permissionNames = fullRole.permissions.map((p) => p.name);
      if (permissionNames.includes("can_view_complaint_page_with_all_data")) {
        canView = true;
      }
    }

    if (!canView) {
      return res.status(403).json({
        message: "Access denied to this complaint's timeline",
      });
    }

    // 🧱 Construct timeline
    const timeline = [];

    // Complaint created
    timeline.push({
      date: complaint.createdAt,
      label: "Complaint Created",
      comment: "",
      isActive: false,
    });

    // Assigned or reassigned
    if (complaint.assignedTo && complaint.assignedAt) {
      const isReassigned = complaint.assignmentHistory?.length > 0;
      const assigneeName = complaint.assignedTo?.user?.name || "User";
      const assigneeRole = complaint.assignedTo?.role?.name || "Role";

      timeline.push({
        date: complaint.assignedAt,
        label: `${isReassigned ? "Reassigned to" : "Assigned to"} ${assigneeRole} - ${assigneeName}`,
        comment: complaint.assignmentDescription || "",
        isActive: false,
      });
    }

    // Status changed
    if (complaint.statusChangedAt && complaint.status !== "Pending") {
      const updater = complaint.statusUpdatedBy?.user?.name;
      timeline.push({
        date: complaint.statusChangedAt,
        label: `Status changed to ${complaint.status}${updater ? ` by ${updater}` : ""}`,
        comment: complaint.statusDescription || "",
        isActive: true,
      });
    }

    return res.status(200).json({
      message: "Timeline fetched successfully",
      data: {
        flat: complaint.flat
          ? `${complaint.flat.flatName}-${complaint.flat.blockName} (${complaint.flat.flatType})`
          : "Flat",
        title: complaint.title,
        priority: complaint.priority,
        createdAt: complaint.createdAt,
        status: complaint.status,
        timeline,
      },
    });
  } catch (err) {
    console.error("Error in getComplaintTimeline:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
