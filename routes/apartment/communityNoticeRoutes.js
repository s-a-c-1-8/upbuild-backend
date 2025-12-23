const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const { createNotice } = require("../../controller/apartment/community/notice/createNotice");
const { getNotices } = require("../../controller/apartment/community/notice/getNotices");
const { getNoticeById } = require("../../controller/apartment/community/notice/getNoticeById");
const router = express.Router();


// CREATE NOTICE
router.post("/create/notice", verifyToken, createNotice);

router.get("/get/notice", verifyToken, getNotices);

router.get("/notice/:id", verifyToken, getNoticeById);

module.exports = router;
