// controllers/community/likePost.js
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost");

// POST /community/posts/:postId/like  (toggle like, no counts)
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const likedBy = req?.auth?.selectedRoleId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }
    if (!likedBy || !mongoose.isValidObjectId(likedBy)) {
      return res.status(400).json({ message: "Invalid liker id" });
    }

    // Ensure post exists (optional but clearer errors)
    const postExists = await CommunityPost.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already liked by this role
    const already = await CommunityPost.exists({ _id: postId, likedBy });

    if (already) {
      // UNLIKE: remove role id from likedBy
      await CommunityPost.updateOne(
        { _id: postId },
        { $pull: { likedBy } }
      );
      return res.json({ liked: false });
    } else {
      // LIKE: add role id to likedBy
      await CommunityPost.updateOne(
        { _id: postId },
        { $addToSet: { likedBy } }
      );
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error("likePost error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
