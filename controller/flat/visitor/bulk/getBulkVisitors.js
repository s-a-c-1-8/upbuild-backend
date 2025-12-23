// const FlatBulkVisitor = require("../../../../model/flat/visitorBulk");
// const Flat = require("../../../../model/flat/flatModel");

// exports.getVisitorsFromApartmentIdBulk = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = "",
//       fromDate,
//       toDate,
//     } = req.body;

//     const apartmentId = req.params.apartmentId;
//     if (!apartmentId) {
//       return res.status(400).json({ message: "Apartment ID is required" });
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const query = { apartmentId };

//     // Date filtering
//     if (fromDate && toDate) {
//       const from = new Date(fromDate);
//       const to = new Date(toDate);
//       to.setHours(23, 59, 59, 999);
//       query.createdAt = { $gte: from, $lte: to };
//     }

//     // Fetch entries
//     let bulkVisitors = await FlatBulkVisitor.find(query)
//       .populate("flatId", "flatName blockName")
//       .sort({ createdAt: -1 });

//     // Filter by search
//     if (search) {
//       const searchRegex = new RegExp(search, "i");
//       bulkVisitors = bulkVisitors.filter((entry) => {
//         const flat = entry.flatId || {};
//         const flatCombo = `${flat.flatName || ""}-${flat.blockName || ""}`;
//         const formatDate = (d) =>
//   d ? new Date(d).toLocaleDateString("en-GB") : "";

// const formattedVisitDate = formatDate(entry.visitDate);
// const formattedFromDate = formatDate(entry.fromDate);
// const formattedToDate = formatDate(entry.toDate);
//        return (
//   searchRegex.test(entry.eventPurpose || "") ||
//   searchRegex.test(flat.flatName || "") ||
//   searchRegex.test(flat.blockName || "") ||
//   searchRegex.test(flatCombo) ||
//   formattedVisitDate.includes(search) ||
//   formattedFromDate.includes(search) ||
//   formattedToDate.includes(search)
// );
//       });
//     }

//     const total = bulkVisitors.length;
//     const paginated = bulkVisitors.slice(skip, skip + parseInt(limit));

//     const response = paginated.map((entry) => {
//       const flat = entry.flatId || {};
//       return {
//         _id: entry._id,
//         flatName: flat.flatName || "",
//         blockName: flat.blockName || "",
//         isForEntireApartment: entry.isForEntireApartment || false,
//         eventPurpose: entry.eventPurpose,
//         expectedCount: entry.expectedCount,
//         isMultipleDays: entry.isMultipleDays,
//         visitDate: entry.visitDate,
//         fromDate: entry.fromDate,
//         toDate: entry.toDate,
//         fromTime: entry.fromTime,
//         toTime: entry.toTime,
//         notes: entry.notes || "",
//         createdAt: entry.createdAt,
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
//     console.error("Error in getVisitorsFromApartmentIdBulk:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const mongoose = require("mongoose");
const FlatBulkVisitor = require("../../../../model/flat/visitorBulk");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../../model/apartment/apartmentrole");

exports.getVisitorsFromApartmentIdBulk = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", fromDate, toDate } = req.body;

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

    // 🚫 Block unauthorized roles
    if (
      !hasPermission &&
      !["apartment-admin", "occupants", "security"].includes(roleSlug)
    ) {
      return res.status(403).json({
        message:
          "Access denied. You are not authorized to view bulk visitor logs.",
      });
    }

    // 🎯 Build query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { apartmentId };

    // 👮 Security: only today's data
    if (!hasPermission && roleSlug === "security") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: todayStart, $lte: todayEnd };
    }

    // 🏠 Occupant: only their flat
    if (!hasPermission && roleSlug === "occupants" && flatIdFromToken) {
      query.flatId = new mongoose.Types.ObjectId(flatIdFromToken);
    }

    // 🗓️ Admins: apply date filter
    if (
      !hasPermission &&
      roleSlug === "apartment-admin" &&
      fromDate &&
      toDate
    ) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: from, $lte: to };
    }

    // 📦 Fetch entries
    let bulkVisitors = await FlatBulkVisitor.find(query)
      .populate("flatId", "flatName blockName ownerStaying")
      .sort({ createdAt: -1 });

    // 🔍 Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString("en-GB") : "";

      bulkVisitors = bulkVisitors.filter((entry) => {
        const flat = entry.flatId || {};
        const flatCombo = `${flat.flatName || ""}-${flat.blockName || ""}`;

        return (
          searchRegex.test(entry.eventPurpose || "") ||
          searchRegex.test(flat.flatName || "") ||
          searchRegex.test(flat.blockName || "") ||
          searchRegex.test(flatCombo) ||
          searchRegex.test(entry.bulkVisitorId || "") || // ✅ search by ID
          formatDate(entry.visitDate).includes(search) ||
          formatDate(entry.fromDate).includes(search) ||
          formatDate(entry.toDate).includes(search)
        );
      });
    }

    const total = bulkVisitors.length;
    const paginated = bulkVisitors.slice(skip, skip + parseInt(limit));

    const response = paginated.map((entry) => {
      const flat = entry.flatId || {};
      return {
        _id: entry._id,
        bulkVisitorId: entry.bulkVisitorId, // 👈 Include visitor id here
        flatName: flat.flatName || "",
        blockName: flat.blockName || "",
        isForEntireApartment: entry.isForEntireApartment || false,
        eventPurpose: entry.eventPurpose,
        expectedCount: entry.expectedCount,
        isMultipleDays: entry.isMultipleDays,
        visitDate: entry.visitDate,
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
        notes: entry.notes || "",
        createdAt: entry.createdAt,
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
    console.error("Error in getVisitorsFromApartmentIdBulk:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
