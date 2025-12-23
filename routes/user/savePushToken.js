// routes/user.routes.js (or same router file)
const express = require("express");
const router = express.Router();

const { savePushToken } = require("../../controller/user/push/savePushToken");
const verifyToken = require("../../middlewares/verifyToken");
router.post("/users/save-push-token", verifyToken, savePushToken);
module.exports = router;