// controllers/community/addComment.js
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost");

// POST /community/posts/:postId/comment
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const author = req?.auth?.selectedRoleId; // current role id
    const textRaw = (req.body?.text ?? "").trim();

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }
    if (!author || !mongoose.isValidObjectId(author)) {
      return res.status(400).json({ message: "Invalid author id" });
    }
    if (!textRaw) {
      return res.status(400).json({ message: "Comment text required" });
    }

    const update = {
      $push: {
        comments: {
          author,
          text: textRaw,
          createdAt: new Date(),
        },
      },
    };

    const updated = await CommunityPost.findByIdAndUpdate(
      postId,
      update,
      { new: true, select: "comments" }
    );

    if (!updated) {
      return res.status(404).json({ message: "Post not found" });
    }

    const created = updated.comments[updated.comments.length - 1];

    return res.json({
      message: "Comment added",
      comment: created,
      totalComments: updated.comments.length,
    });
  } catch (err) {
    console.error("addComment error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
