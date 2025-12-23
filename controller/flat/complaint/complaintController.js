const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const Flat = require("../../../model/flat/flatModel");
const Apartment = require("../../../model/apartment/apartmentModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const Role = require("../../../model/apartment/apartmentrole");
const logAction = require("../../../utils/logAction"); // ✅ Import logAction
const notifyApartmentAdmins = require("../../../utils/notifyApartmentAdmin"); // ✅ add util

exports.addComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      complaintType,
      priority,
      apartment,
      flat,
      visibleInCommunity,
      userId,
    } = req.body;

    // 🔒 Basic validation
    if (!title || !complaintType || !apartment || !userId || !flat) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const flatId = flat.toString().trim();
    if (
      !flatId ||
      flatId === "undefined" ||
      flatId === "null" ||
      !mongoose.Types.ObjectId.isValid(flatId)
    ) {
      return res.status(403).json({
        message:
          "Access denied. Please log in as an occupant to raise a complaint.",
      });
    }

    // 🔍 1. Get flat & apartment details
    const [flatDoc, apartmentDoc] = await Promise.all([
      Flat.findById(flatId).select("flatName blockName"),
      Apartment.findById(apartment).select("apartmentId name"),
    ]);

    if (!flatDoc || !apartmentDoc) {
      return res.status(404).json({ message: "Flat or Apartment not found." });
    }

    const flatPrefix = `${flatDoc.flatName}${flatDoc.blockName}`;
    const apartmentIdCode =
      apartmentDoc.apartmentId || apartment.toString().slice(-4);
    const complaintPrefix = `CMP-${apartmentIdCode}-${flatPrefix}`;

    // 🔍 2. Find latest complaint with matching prefix
    const latestComplaint = await Complaint.findOne({
      complaintId: { $regex: `^${complaintPrefix}(\\d+)$` },
    })
      .sort({ createdAt: -1 })
      .select("complaintId");

    let nextNumber = 1;
    if (latestComplaint?.complaintId) {
      const numberPart = latestComplaint.complaintId.replace(
        complaintPrefix,
        ""
      );
      const parsed = parseInt(numberPart, 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }

    const complaintId = `${complaintPrefix}${nextNumber}`;

    // 🔍 3. Find correct UserRoleAssignment ID
    const userRoleAssignment = await UserRoleAssignment.findOne({
      user: userId,
      apartment,
      flat,
      active: true,
    }).sort({ createdAt: -1 });

    if (!userRoleAssignment) {
      return res.status(400).json({
        message:
          "Role assignment not found for user in this apartment and flat.",
      });
    }

    // ✅ 4. Handle attachments & validate size
    const MAX_FILE_SIZE_MB = 10;
    const raw = req.processedUploads?.attachment;
    const attachments = Array.isArray(raw) ? raw : raw ? [raw] : [];

    for (const file of attachments) {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({
          message: `Attachment '${file.originalname}' exceeds 10MB limit.`,
          fileSize: `${sizeInMB.toFixed(2)} MB`,
        });
      }
    }

    // 🧾 5. Prepare complaint payload
    const complaintData = {
      complaintId,
      title,
      description,
      complaintType,
      priority,
      apartment,
      flat: flatId,
      submittedBy: userRoleAssignment._id,
      visibleInCommunity:
        visibleInCommunity === "Yes" || visibleInCommunity === true,
      attachments: attachments.map((file) => ({
        fileName: file.originalname,
        filePath: file.path
          .replace(/\\/g, "/")
          .replace(/^.*uploads\//, "uploads/"),
        type: file.type,
      })),
    };

    // 💾 6. Save complaint
    const savedComplaint = await Complaint.create(complaintData);

    // 🪵 Log the action
    await logAction({
      req,
      action: "ADD_COMPLAINT",
      description: `User submitted complaint "${title}" for flat ${flatDoc.flatName}, block ${flatDoc.blockName}`,
      metadata: {
        complaintId: savedComplaint.complaintId,
        apartmentId: apartment,
        flatId: flat,
        userRoleAssignmentId: userRoleAssignment._id,
        priority,
        complaintType,
        visibleInCommunity: !!visibleInCommunity,
        hasAttachments: attachments.length > 0,
      },
    });
    // 🔔 8. Notify admins
    await notifyApartmentAdmins({
      apartmentId: apartment,
      message: `New complaint submitted: ${title} (${complaintType}, Priority: ${priority}). Please assign this complaint to a staff member.`,
      logId: savedComplaint._id,
      logModel: "Complaint",
      link: `${process.env.FRONTEND_URL}apartment/complaints/assign/${savedComplaint._id}`,
    });
    
    return res.status(201).json({
      message: "Complaint submitted successfully.",
      savedComplaint,
    });
  } catch (err) {
    console.error("❌ Error in addComplaint:", err);
    return res.status(500).json({
      message: "Server error while saving complaint.",
      error: err?.message,
    });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const {
      apartment,
      status,
      priority,
      complaintType,
      fromDate,
      toDate,
      search = "",
      page = 1,
      limit = 10,
    } = req.body;

    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!apartment) {
      return res.status(400).json({ message: "Apartment ID required" });
    }

    // 🔐 Fetch and validate role slug
    let roleSlug = null;
    let roleAssignment = null;

    if (selectedRoleId) {
      roleAssignment = await UserRoleAssignment.findById(
        selectedRoleId
      ).populate("role");
      roleSlug = roleAssignment?.role?.slug;

      if (!roleAssignment || !roleSlug) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied. Invalid role." });
      }
    }

    let apartmentObjectId;
    try {
      apartmentObjectId = new mongoose.Types.ObjectId(apartment);
    } catch {
      return res.status(400).json({ message: "Invalid Apartment ID format" });
    }

    const matchConditions = { apartment: apartmentObjectId };

    if (status) matchConditions.status = status;
    if (priority) matchConditions.priority = priority;
    if (complaintType) matchConditions.complaintType = complaintType;

    // 🔐 Access filter logic
    // 🔐 Access filter logic with permission fallback

    let canViewAll = false;

    if (roleSlug === "apartment-admin") {
      canViewAll = true;
    } else if (roleSlug === "occupants") {
      if (flatIdFromToken) {
        matchConditions.flat = new mongoose.Types.ObjectId(flatIdFromToken);
      } else {
        return res
          .status(403)
          .json({ message: "Flat ID missing. Access denied." });
      }
    } else {
      // Check permission for others
      const fullRole = await Role.findById(roleAssignment.role._id).populate({
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      });

      const permissionNames = fullRole.permissions.map((p) => p.name);
      canViewAll = permissionNames.includes(
        "can_view_complaint_page_with_all_data"
      );

      if (!canViewAll) {
        matchConditions.assignedTo = new mongoose.Types.ObjectId(
          selectedRoleId
        );
      }
    }

    if (fromDate || toDate) {
      matchConditions.createdAt = {};
      if (fromDate) matchConditions.createdAt.$gte = new Date(fromDate);
      if (toDate) matchConditions.createdAt.$lte = new Date(toDate);
    }

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const aggregatePipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "flats",
          localField: "flat",
          foreignField: "_id",
          as: "flat",
        },
      },
      { $unwind: "$flat" },
      {
        $lookup: {
          from: "userroleassignments",
          localField: "submittedBy",
          foreignField: "_id",
          as: "submittedBy",
        },
      },
      { $unwind: { path: "$submittedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "submittedBy.user",
          foreignField: "_id",
          as: "submittedUser",
        },
      },
      { $unwind: { path: "$submittedUser", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const orConditions = [
        { complaintId: { $regex: searchRegex } },
        { "flat.flatName": { $regex: searchRegex } },
        { "flat.blockName": { $regex: searchRegex } },
        { "submittedUser.name": { $regex: searchRegex } },
      ];

      if (search.includes("-")) {
        const [flatPart, blockPart] = search.split("-").map((s) => s.trim());
        const andCondition = [];
        if (flatPart)
          andCondition.push({
            "flat.flatName": { $regex: new RegExp(flatPart, "i") },
          });
        if (blockPart)
          andCondition.push({
            "flat.blockName": { $regex: new RegExp(blockPart, "i") },
          });
        if (andCondition.length > 0) {
          orConditions.push({ $and: andCondition });
        }
      }

      aggregatePipeline.push({ $match: { $or: orConditions } });
    }

    const countPipeline = [...aggregatePipeline, { $count: "total" }];

    aggregatePipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (pageNumber - 1) * pageSize },
      { $limit: pageSize }
    );

    const [complaints, countResult, tabCountsRaw] = await Promise.all([
      Complaint.aggregate(aggregatePipeline),
      Complaint.aggregate(countPipeline),
      Complaint.aggregate([
        { $match: { apartment: apartmentObjectId } }, // Only apartment filter
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const filteredCount = countResult[0]?.total || 0;

    const formatted = complaints.map((c) => ({
      _id: c._id,
      complaintId: c.complaintId,
      title: c.title,
      priority: c.priority,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt, // ✅ ADDED HERE
      flat: {
        flatName: c.flat?.flatName || "",
        blockName: c.flat?.blockName || "",
        flatType: c.flat?.flatType || "",
      },
      submittedBy: {
        name: c.submittedUser?.name || "",
      },
    }));

    const tabCounts = {
      All: tabCountsRaw.reduce((sum, item) => sum + item.count, 0),
      Pending: tabCountsRaw.find((s) => s._id === "Pending")?.count || 0,
      InProgress: tabCountsRaw.find((s) => s._id === "In Progress")?.count || 0,
      Resolved: tabCountsRaw.find((s) => s._id === "Resolved")?.count || 0,
      Rejected: tabCountsRaw.find((s) => s._id === "Rejected")?.count || 0,
    };

    res.json({
      complaints: formatted,
      totalCount: filteredCount,
      tabCounts,
    });
  } catch (err) {
    console.error("❌ Error fetching complaints:", err);
    res.status(500).json({ message: "Failed to load complaints" });
  }
};
