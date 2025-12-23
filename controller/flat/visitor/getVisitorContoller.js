// exports.getVisitorsFromApartmentId = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = "",
//       status = "",
//       fromDate,
//       toDate,
//       occupantAcceptStatus, // ✅ new filter
//     } = req.body;

//     const apartmentId = req.params.apartmentId;
//     if (!apartmentId) {
//       return res.status(400).json({ message: "Apartment ID is required" });
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const query = { apartment: apartmentId };

//     if (status) query.status = status;
//     if (occupantAcceptStatus) query.occupantAcceptStatus = occupantAcceptStatus; // ✅ add this filter

//     if (fromDate && toDate) {
//       const from = new Date(fromDate);
//       const to = new Date(toDate);
//       to.setHours(23, 59, 59, 999);
//       query.createdAt = { $gte: from, $lte: to };
//     }

//     let logs = await VisitorLog.find(query)
//       .populate("visitor")
//       .populate("flatId")
//       .sort({ createdAt: -1 });

//     // Collect flat IDs
//     const flatIds = [
//       ...new Set(logs.map((log) => log.flatId?._id?.toString()).filter(Boolean)),
//     ];

//     const assignments = await UserRoleAssignment.find({
//       apartment: apartmentId,
//       flat: { $in: flatIds },
//     })
//       .populate("user", "name contactNumber")
//       .lean();

//     // Build occupant map
//     const flatOccupantsMap = {};
//     for (const a of assignments) {
//       const flatId = a.flat?.toString();
//       if (!flatOccupantsMap[flatId]) flatOccupantsMap[flatId] = [];
//       flatOccupantsMap[flatId].push({
//         name: a.user?.name || "",
//         phone: a.user?.contactNumber || "",
//         role: a.relationshipType,
//       });
//     }

//     // Now perform search filtering
//     if (search) {
//       const searchRegex = new RegExp(search, "i");

//       logs = logs.filter((log) => {
//         const visitor = log.visitor || {};
//         const flat = log.flatId || {};
//         const flatBlockCombo = `${flat.flatName || ""}-${flat.blockName || ""}`;
//         const flatId = flat._id?.toString();
//         const occupants = flatOccupantsMap[flatId] || [];

//         const occupantMatch = occupants.some(
//           (o) => searchRegex.test(o.name || "") || searchRegex.test(o.phone || "")
//         );

//         const matchText =
//           searchRegex.test(visitor.name || "") ||
//           searchRegex.test(visitor.phoneNumber || "") ||
//           searchRegex.test(log.visitorLogId || "") ||
//           searchRegex.test(log.vehicleNumber || "") ||
//           searchRegex.test(flat.flatName || "") ||
//           searchRegex.test(flat.blockName || "") ||
//           searchRegex.test(flatBlockCombo);

//         const formattedDate = new Date(log.clockInTime).toLocaleDateString("en-GB");

//         return matchText || occupantMatch || formattedDate.includes(search);
//       });
//     }

//     const total = logs.length;
//     const paginated = logs.slice(skip, skip + parseInt(limit));

//     const response = paginated.map((log) => {
//       const visitor = log.visitor || {};
//       const flat = log.flatId || {};
//       const occupants = flatOccupantsMap[flat._id?.toString()] || [];

//       let occupant = null;
//       if (flat.ownerStaying) {
//         occupant = occupants.find((o) => o.role === "owner");
//       } else {
//         occupant = occupants.find((o) => o.role === "tenant");
//       }

//       return {
//         _id: log._id,
//         visitorLogId: log.visitorLogId || "",
//         name: visitor.name || "",
//         phone: visitor.phoneNumber || "",
//         vehicleNumber: log.vehicleNumber || "",
//         flatId: {
//           flatName: flat.flatName || "",
//           blockName: flat.blockName || "",
//           occupantName: occupant?.name || "",
//           occupantPhone: occupant?.phone || "",
//         },
//         type: log.visitorType || "",
//         status: log.status || "",
//         occupantAcceptStatus: log.occupantAcceptStatus || "", // ✅ include in response
//         clockInTime: log.clockInTime,
//         clockOutTime: log.clockOutTime || null,
//         photo: visitor.photo || "",
//       };
//     });

//     return res.status(200).json({
//       visitors: response,
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(total / parseInt(limit)),
//     });
//   } catch (error) {
//     console.error("Error fetching visitors:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const mongoose = require("mongoose");
const VisitorLog = require("../../../model/flat/visitorLogModel");
const Visitor = require("../../../model/flat/visitorModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const User = require("../../../model/user/userModel");
const ApartmentRole = require("../../../model/apartment/apartmentRole");

exports.getVisitorsFromApartmentId = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      fromDate,
      toDate,
      occupantAcceptStatus,
    } = req.body;

    const apartmentId = req.params.apartmentId;
    const selectedRoleId = req.auth?.selectedRoleId || null;
    const flatIdFromToken = req.auth?.flatId || null;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    // 🔐 Get role + permissions
    let roleSlug = "";
    let hasPermission = false;

    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(
        selectedRoleId
      ).populate("role");
      const role = roleAssignment?.role;

      if (!roleAssignment || !role) {
        return res
          .status(403)
          .json({ message: "Access denied. Invalid role." });
      }

      roleSlug = role.slug;

      const fullRole = await ApartmentRole.findById(role._id).populate({
        path: "permissions",
        match: { status: "Active" },
        select: "name",
      });

      const permissionNames = fullRole.permissions.map((perm) => perm.name);
      hasPermission = permissionNames.includes(
        "can_view_visitors_page_with_all_data"
      );
    }

    // ❌ Block others
    if (
      !hasPermission &&
      !["apartment-admin", "occupants", "security"].includes(roleSlug)
    ) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to view visitor logs.",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { apartment: apartmentId };

    // 🔒 Apply role-based restrictions if permission not granted
    if (!hasPermission) {
      if (roleSlug === "security") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }

      if (roleSlug === "occupants" && flatIdFromToken) {
        query.flatId = new mongoose.Types.ObjectId(flatIdFromToken);
      }

      if (roleSlug === "apartment-admin" && fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: from, $lte: to };
      }
    }

    if (status) query.status = status;
    if (occupantAcceptStatus) query.occupantAcceptStatus = occupantAcceptStatus;

    let logs = await VisitorLog.find(query)
      .populate("visitor")
      .populate("flatId")
      .sort({ createdAt: -1 });

    const flatIds = [
      ...new Set(
        logs.map((log) => log.flatId?._id?.toString()).filter(Boolean)
      ),
    ];

    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      flat: { $in: flatIds },
    })
      .populate("user", "name contactNumber")
      .lean();

    const flatOccupantsMap = {};
    for (const a of assignments) {
      const flatId = a.flat?.toString();
      if (!flatOccupantsMap[flatId]) flatOccupantsMap[flatId] = [];
      flatOccupantsMap[flatId].push({
        name: a.user?.name || "",
        phone: a.user?.contactNumber || "",
        role: a.relationshipType,
      });
    }

    // 🔍 Search filtering
    if (search) {
      const searchRegex = new RegExp(search, "i");
      logs = logs.filter((log) => {
        const visitor = log.visitor || {};
        const flat = log.flatId || {};
        const flatBlockCombo = `${flat.flatName || ""}-${flat.blockName || ""}`;
        const flatId = flat._id?.toString();
        const occupants = flatOccupantsMap[flatId] || [];

        const occupantMatch = occupants.some(
          (o) =>
            searchRegex.test(o.name || "") || searchRegex.test(o.phone || "")
        );

        const matchText =
          searchRegex.test(visitor.name || "") ||
          searchRegex.test(visitor.phoneNumber || "") ||
          searchRegex.test(log.visitorLogId || "") ||
          searchRegex.test(log.vehicleNumber || "") ||
          searchRegex.test(flat.flatName || "") ||
          searchRegex.test(flat.blockName || "") ||
          searchRegex.test(flatBlockCombo);

        const formattedDate = new Date(log.clockInTime).toLocaleDateString(
          "en-GB"
        );

        return matchText || occupantMatch || formattedDate.includes(search);
      });
    }

    const total = logs.length;
    const paginated = logs.slice(skip, skip + parseInt(limit));

    const response = paginated.map((log) => {
      const visitor = log.visitor || {};
      const flat = log.flatId || {};
      const occupants = flatOccupantsMap[flat._id?.toString()] || [];

      let occupant = null;
      if (flat.ownerStaying) {
        occupant = occupants.find((o) => o.role === "owner");
      } else {
        occupant = occupants.find((o) => o.role === "tenant");
      }

      return {
        _id: log._id,
        visitorLogId: log.visitorLogId || "",
        name: visitor.name || "",
        phone: visitor.phoneNumber || "",
        vehicleNumber: log.vehicleNumber || "",
        scheduleDate: log.scheduleDate || "",
        scheduleFrom: log.scheduleFrom || "",
        scheduleTo: log.scheduleTo || "",
        flatId: {
          flatName: flat.flatName || "",
          blockName: flat.blockName || "",
          occupantName: occupant?.name || "",
          occupantPhone: occupant?.phone || "",
        },
        type: log.visitorType || "",
        status: log.status || "",
        occupantAcceptStatus: log.occupantAcceptStatus || "",
        clockInTime: log.clockInTime,
        clockOutTime: log.clockOutTime || null,
        photo: visitor.photo || "",
        createdAt: log.createdAt,
      };
    });

    return res.status(200).json({
      visitors: response,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;

    const visitorLog = await VisitorLog.findById(id)
      .populate("visitor", "name phoneNumber address gender photo")
      .populate("flatId");

    if (!visitorLog) {
      return res.status(404).json({ message: "Visitor log not found" });
    }

    const flat = visitorLog.flatId;
    const flatId = flat?._id;

    let occupantName = "";
    let occupantPhoneNumber = "";

    if (flatId) {
      const relationshipType = flat.ownerStaying ? "owner" : "tenant";

      const occupant = await UserRoleAssignment.findOne({
        flat: flatId,
        apartment: visitorLog.apartment,
        relationshipType,
      })
        .populate("user", "name contactNumber")
        .lean();

      occupantName = occupant?.user?.name || "";
      occupantPhoneNumber = occupant?.user?.contactNumber || "";
    }

    const response = {
      _id: visitorLog._id,
      visitorLogId: visitorLog.visitorLogId,
      visitor: visitorLog.visitor,
      clockInTime: visitorLog.clockInTime,
      clockOutTime: visitorLog.clockOutTime,
      purpose: visitorLog.purpose,
      visitorType: visitorLog.visitorType,
      vehicleType: visitorLog.vehicleType,
      vehicleNumber: visitorLog.vehicleNumber,
      vehiclePhoto: visitorLog.vehiclePhoto,
      qrCode: visitorLog.qrCode || null, // ✅ include QR Code
      status: visitorLog.status,
      occupantAcceptStatus: visitorLog.occupantAcceptStatus,
           scheduleDate: visitorLog.scheduleDate || "",
        scheduleFrom: visitorLog.scheduleFrom || "",
        scheduleTo: visitorLog.scheduleTo || "",
      flatId: {
        flatName: flat?.flatName || "",
        blockName: flat?.blockName || "",
        occupantName,
        occupantPhoneNumber,
      },
    };

    return res.status(200).json({ visitor: response });
  } catch (error) {
    console.error("Error fetching visitor by ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
