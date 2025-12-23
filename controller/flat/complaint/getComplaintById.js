const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const Role = require("../../../model/apartment/apartmentRole");

exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Valid Complaint ID is required" });
    }

    // 🔐 Fetch role
    let roleAssignment = null;
    let roleSlug = null;
    if (selectedRoleId) {
      roleAssignment = await UserRoleAssignment.findById(
        selectedRoleId
      ).populate("role");
      roleSlug = roleAssignment?.role?.slug;

      if (!roleAssignment || !roleSlug) {
        return res
          .status(403)
          .json({ message: "Access denied. Invalid role." });
      }
    }

    // 🧾 Fetch complaint and populate references
    const complaint = await Complaint.findById(id)
      .populate({
        path: "flat",
        select: "flatName blockName flatType",
      })
      .populate({
        path: "submittedBy",
        populate: {
          path: "user",
          select: "name phone email",
        },
      })
      .populate({
        path: "assignedTo",
        populate: [
          { path: "user", select: "name phone email" },
          { path: "role", select: "name" },
        ],
      })
      .populate({
        path: "statusUpdatedBy",
        populate: [
          { path: "user", select: "name phone email" },
          { path: "role", select: "name" },
        ],
      })
      .populate({
        path: "assignmentHistory.assignedTo",
        populate: [
          { path: "user", select: "name phone email" },
          { path: "role", select: "name" },
        ],
      });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 🔒 Access Control Logic
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

    // 🔁 Only one fallback permission now (view all)
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
      return res
        .status(403)
        .json({ message: "You are not authorized to view this complaint." });
    }

    // ✅ Format response
    const formattedComplaint = {
      complaintId: complaint.complaintId,
      title: complaint.title,
      complaintType: complaint.complaintType,
      description: complaint.description,
      priority: complaint.priority,
      status: complaint.status,
      visibleInCommunity: complaint.visibleInCommunity,
      submittedBy: complaint.submittedBy?.user
        ? {
            name: complaint.submittedBy.user.name,
            phone: complaint.submittedBy.user.phone,
            email: complaint.submittedBy.user.email,
          }
        : null,
      assignedTo: complaint.assignedTo?.user
        ? {
            name: complaint.assignedTo.user.name,
            phone: complaint.assignedTo.user.phone,
            email: complaint.assignedTo.user.email,
            role: complaint.assignedTo.role?.name || "",
          }
        : null,
      assignmentHistory: (complaint.assignmentHistory || []).map((entry) => ({
        assignedTo: entry.assignedTo?.user
          ? {
              name: entry.assignedTo.user.name,
              phone: entry.assignedTo.user.phone,
              email: entry.assignedTo.user.email,
              role: entry.assignedTo.role?.name || "",
            }
          : null,
        assignedAt: entry.assignedAt,
        assignmentDescription: entry.assignmentDescription || "",
      })),

      assignmentDescription: complaint.assignmentDescription || "",
      assignedAt: complaint.assignedAt || null,
      statusDescription: complaint.statusDescription || "",
      statusChangedAt: complaint.statusChangedAt || null,
      statusUpdatedBy: complaint.statusUpdatedBy?.user
        ? {
            name: complaint.statusUpdatedBy.user.name,
            email: complaint.statusUpdatedBy.user.email,
            phone: complaint.statusUpdatedBy.user.phone,
            role: complaint.statusUpdatedBy.role?.name || "",
          }
        : null,
      flat: complaint.flat
        ? {
            flatName: complaint.flat.flatName,
            blockName: complaint.flat.blockName,
            flatType: complaint.flat.flatType,
          }
        : null,
      attachments: Array.isArray(complaint.attachments)
        ? complaint.attachments
        : [],

      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
    };

    return res.status(200).json({
      message: "Complaint fetched successfully",
      data: formattedComplaint,
    });
  } catch (error) {
    console.error("❌ Error fetching complaint:", error);
    return res.status(500).json({
      message: "Server error while fetching complaint",
      error: error.message,
    });
  }
};
