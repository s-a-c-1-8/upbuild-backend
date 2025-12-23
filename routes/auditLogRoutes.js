// routes/auditLogRoutes.js
const express = require("express");
const { getAllAuditLogs } = require("../controller/getAllAuditLogs");
const verifyToken = require("../middlewares/verifyToken");
const checkPermission = require("../middlewares/checkPermission");
const router = express.Router();

router.post("/get/all/audit/logs", verifyToken,checkPermission("can_view_auditLogs_page"),getAllAuditLogs); 

module.exports = router;
