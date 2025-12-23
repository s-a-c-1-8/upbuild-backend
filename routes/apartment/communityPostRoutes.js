const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/verifyToken");
const { upload, compressFile } = require("../../middlewares/uploadMiddleware");
const {
  addCommunityPost,
} = require("../../controller/apartment/community/addCommunityPost");
const {
  getCommunityPostsByApartment,
} = require("../../controller/apartment/community/getCommunityPost");
const { likePost } = require("../../controller/apartment/community/likePost");
const {
  addComment,
} = require("../../controller/apartment/community/addComment");
const {
  getCommentsForPost,
} = require("../../controller/apartment/community/getCommentsForPost");
const {
  getPostById,
} = require("../../controller/apartment/community/getDetailsOfPost");
// CREATE (reads apt + role from token, not body)
router.post(
  "/community/create",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 5 },
  ]),
  compressFile,
  addCommunityPost
);

// READ by apartmentId (from FE)
router.get(
  "/get/community/by/:apartmentId",
  verifyToken,
  getCommunityPostsByApartment
);

router.post("/community/posts/:postId/like", verifyToken, likePost);
router.post("/community/posts/:postId/comment", verifyToken, addComment);
router.get(
  "/community/posts/:postId/comments",
  verifyToken,
  getCommentsForPost
);
router.get("/get/community/post/:id", verifyToken, getPostById);

module.exports = router;
