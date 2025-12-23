// controller/apartment/community/communityController.js
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost");

exports.getCommunityPostsByApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { q = "", page = 1, limit = 10 } = req.query;

    if (!apartmentId || !mongoose.Types.ObjectId.isValid(apartmentId)) {
      return res.status(400).json({ message: "Invalid apartmentId." });
    }

    const likerId = req?.auth?.selectedRoleId ? String(req.auth.selectedRoleId) : null;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = { apartment: apartmentId };
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const [items, total] = await Promise.all([
      CommunityPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        // keep likedBy & comments for computing counts; we’ll strip them in the response
        .populate({
          path: "submittedBy",
          select: "user flat role apartment",
          populate: [
            { path: "user", select: "name image" },
            { path: "flat", select: "blockName flatName" },
            { path: "role", select: "title name" },
          ],
        })
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);

    const shaped = items.map((it) => {
      const s = it.submittedBy || null;
      const u = s?.user || {};
      const f = s?.flat || {};
      const r = s?.role || {};

      const block = f?.blockName ?? null;
      const number = f?.flatName ?? null;

      // pull arrays locally; remove from the outgoing object
      const { likedBy = [], comments = [], ...rest } = it;

      const userHasLiked =
        !!likerId && Array.isArray(likedBy) && likedBy.some((id) => String(id) === likerId);

      const likedCount = Array.isArray(likedBy) ? likedBy.length : 0;
      const commentCount = Array.isArray(comments) ? comments.length : 0;

      return {
        ...rest,                 // ← does NOT include likedBy or comments
        likedCount,
        commentCount,
        userHasLiked,
        author: s
          ? {
              id: s._id || null,
              name: u?.name || "Community Member",
              avatar: u?.image || "",
              role: r?.title || r?.name || "",
              flat: f?._id
                ? { id: f._id, block, number }
                : null,
            }
          : { id: null, name: "Community Member", avatar: "", role: "", flat: null },
      };
    });

    return res.json({
      message: "Community posts fetched.",
      data: shaped,
      page: pageNum,
      limit: limitNum,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (err) {
    console.error("❌ getCommunityPostsByApartment:", err);
    return res.status(500).json({ message: "Server error", error: err?.message });
  }
};
