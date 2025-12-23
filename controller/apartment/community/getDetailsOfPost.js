// controller/apartment/community/getDetailsOfPost.js
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post id." });
    }

    const likerId = req?.auth?.selectedRoleId ? String(req.auth.selectedRoleId) : null;

    const doc = await CommunityPost.findById(id)
      .populate({
        path: "submittedBy",
        select: "user flat role apartment",
        populate: [
          { path: "user", select: "name image" },
          { path: "flat", select: "blockName flatName" },
          { path: "role", select: "title name" },
        ],
      })
      .populate({
        path: "comments.author",
        select: "user flat role apartment",
        populate: [
          { path: "user", select: "name image" },
          { path: "flat", select: "blockName flatName" },
          { path: "role", select: "title name" },
        ],
      })
      .lean();

    if (!doc) {
      return res.status(404).json({ message: "Post not found." });
    }

    const s = doc.submittedBy || null;
    const u = s?.user || {};
    const f = s?.flat || {};
    const r = s?.role || {};

    const block = f?.blockName ?? null;
    const number = f?.flatName ?? null;

    const likedBy = Array.isArray(doc.likedBy) ? doc.likedBy : [];

    // ✅ NEW: sort comments by createdAt DESC so latest appears first
    const comments = Array.isArray(doc.comments)
      ? [...doc.comments].sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
      : [];

    const userHasLiked = !!likerId && likedBy.some((x) => String(x) === likerId);

    const shapedComments = comments.map((c) => {
      const ca = c.author || null;
      const cu = ca?.user || {};
      const cf = ca?.flat || {};
      const cr = ca?.role || {};
      const cBlock = cf?.blockName ?? null;
      const cNumber = cf?.flatName ?? null;

      return {
        _id: String(c._id),
        text: c.text,
        createdAt: c.createdAt,
        author: ca
          ? {
              id: ca._id || null,
              name: cu?.name || "Member",
              avatar: cu?.image || "",
              role: cr?.title || cr?.name || "",
              flat: cf?._id ? { id: cf._id, block: cBlock, number: cNumber } : null,
            }
          : null,
      };
    });

    const shaped = {
      _id: String(doc._id),
      title: doc.title,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      apartment: doc.apartment ? String(doc.apartment) : null,

      author: s
        ? {
            id: s._id || null,
            name: u?.name || "Community Member",
            avatar: u?.image || "",
            role: r?.title || r?.name || "",
            flat: f?._id ? { id: f._id, block, number } : null,
          }
        : { id: null, name: "Community Member", avatar: "", role: "", flat: null },

      media: Array.isArray(doc.media)
        ? doc.media.map((m) => ({ filePath: m.filePath }))
        : [],

      likedCount: likedBy.length,
      commentCount: comments.length,
      userHasLiked,

      comments: shapedComments,
    };

    return res.json({ message: "Post fetched.", data: shaped });
  } catch (err) {
    console.error("❌ getPostById:", err);
    return res.status(500).json({ message: "Server error", error: err?.message });
  }
};
