// controllers/community/getComments.js
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost");

// GET /community/posts/:postId/comments?page=1&limit=10
exports.getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip  = (page - 1) * limit;

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(postId) } },
      { $project: { comments: 1 } },
      { $unwind: "$comments" }, // ok (has $)
      { $sort: { "comments.createdAt": -1, "comments._id": -1 } },
      {
        $facet: {
          total: [{ $count: "n" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "userroleassignments",
                localField: "comments.author",
                foreignField: "_id",
                as: "ura",
              },
            },
            { $unwind: { path: "$ura", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "users",
                localField: "ura.user",
                foreignField: "_id",
                as: "user",
              },
            },
            // ❗ Fix: prefix path with $
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: "$comments._id",
                text: "$comments.text",
                createdAt: "$comments.createdAt",
                author: {
                  id: "$ura._id",
                  name: { $ifNull: ["$user.name", "Member"] },
                  avatar: { $ifNull: ["$user.image", ""] },
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$total.n", 0] }, 0] },
        },
      },
    ];

    const result = await CommunityPost.aggregate(pipeline);
    const agg = result && result[0] ? result[0] : { data: [], total: 0 };
    const data  = Array.isArray(agg.data) ? agg.data : [];
    const total = typeof agg.total === "number" ? agg.total : 0;
    const hasMore = skip + data.length < total;

    return res.json({
      message: "Comments fetched.",
      data,
      page,
      limit,
      total,
      hasMore,
    });
  } catch (err) {
    console.error("getCommentsForPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
