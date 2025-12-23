const mongoose = require("mongoose");
const AuditLog = require("../model/auditLog");
const Apartment = require("../model/apartment/apartmentModel");

exports.getAllAuditLogs = async (req, res) => {
  try {
    const { apartmentId, search = "", limit = 10, page = 1 } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    // ✅ Ensure ObjectId match works
    const apartmentObjectId = new mongoose.Types.ObjectId(apartmentId);

    // ✅ Fetch apartment details once
    const apartment = await Apartment.findById(apartmentObjectId).select("name address");

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found." });
    }

    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);
    const skip = (numericPage - 1) * numericLimit;

    const searchRegex = new RegExp(search, "i");

    const pipeline = [
      {
        $match: { apartmentId: apartmentObjectId },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "flats",
          localField: "flatId",
          foreignField: "_id",
          as: "flatId",
        },
      },
      { $unwind: { path: "$flatId", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          flatLabel: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$flatId.flatName", false] },
                  { $ifNull: ["$flatId.blockName", false] },
                ],
              },
              { $concat: ["$flatId.flatName", "-", "$flatId.blockName"] },
              "",
            ],
          },
        },
      },
      {
        $match: {
          $or: [
            { "userId.name": searchRegex },
            { "flatId.flatName": searchRegex },
            { "flatId.blockName": searchRegex },
            { flatLabel: searchRegex },
            { role: searchRegex },
            { action: searchRegex },
            { description: searchRegex },
          ],
        },
      },
      {
        $facet: {
          logs: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: numericLimit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await AuditLog.aggregate(pipeline);

    const logs = result[0]?.logs || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    res.status(200).json({
      message: "Audit logs fetched successfully",
      apartment, // ✅ apartment info added here
      logs,
      total,
      page: numericPage,
      limit: numericLimit,
    });
  } catch (error) {
    console.error("❌ Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs." });
  }
};
