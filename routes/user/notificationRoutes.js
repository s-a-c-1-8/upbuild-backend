const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const {
  getMyNotifications,
} = require("../../controller/user/notification/getNotification");
const {
  markMyNotificationsRead,
} = require("../../controller/user/notification/markNotificationsRead");
const router = express.Router();

router.get("/get/notifications", verifyToken, getMyNotifications);
router.post("/notifications/mark-read", verifyToken, markMyNotificationsRead);

module.exports = router; // ✅ export router object, not function
