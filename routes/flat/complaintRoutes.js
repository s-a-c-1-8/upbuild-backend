const express = require("express");
const router = express.Router();
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const {
  addComplaint,
  getAllComplaints,
} = require("../../controller/flat/complaint/complaintController");
const {
  getComplaintAssignees,
} = require("../../controller/flat/complaint/getAssignPpl");
const {
  getComplaintById,
} = require("../../controller/flat/complaint/getComplaintById");
const {
  assignComplaint,
  getComplaintAssignmentDetails,
} = require("../../controller/flat/complaint/assignComplaint");
const {
  updateComplaintStatus,
  getComplaintStatus,
} = require("../../controller/flat/complaint/updateStatus");
const {
  getComplaintTimeline,
} = require("../../controller/flat/complaint/getTimeline");
const {
  addComplaintComment,
  getComplaintComments,
} = require("../../controller/flat/complaint/comment");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  isComplaintAssignedToMe,
} = require("../../controller/flat/complaint/isComplaintAssignedToUser");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

router.post(
  "/complaint/add",
  verifyToken,
  upload.fields([{ name: "attachment", maxCount: 10 }]), // ✅ Fix here
  compressFile,
  requirePlanFeature("Complaints"),
  addComplaint
);

router.post(
  "/get/all/complaint",
  verifyToken,
  requirePlanFeature("Complaints"),
  getAllComplaints
);

router.get(
  "/get/assignees/:apartmentId",
  verifyToken,
  checkPermission("can_assign_complaint_to_others"),
  requirePlanFeature("Complaints"),
  getComplaintAssignees
);

router.get(
  "/get/complaint/by/id/:id",
  verifyToken,
  requirePlanFeature("Complaints"),
  getComplaintById
);

router.post(
  "/assign/complaint/:complaintId",
  verifyToken,
  checkPermission("can_assign_complaint_to_others"),
  requirePlanFeature("Complaints"),
  assignComplaint
);

router.get(
  "/get/complaint/assignment/:id",
  verifyToken,
  requirePlanFeature("Complaints"),
  getComplaintAssignmentDetails
);

router.post(
  "/update/complaint/status/:complaintId",
  verifyToken,
  // checkPermission("can_update_complaint_status"),
  requirePlanFeature("Complaints"),
  updateComplaintStatus
);

router.get(
  "/get/complaint/status/:complaintId",
  verifyToken,
  requirePlanFeature("Complaints"),
  getComplaintStatus
);

router.get(
  "/get/complaint/timeline/:complaintId",
  verifyToken,
  requirePlanFeature("Complaints"),
  getComplaintTimeline
);

router.post(
  "/comment/add/complaint/:complaintId",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 5 }]), // 🖼️ multiple image uploads
  compressFile,
  requirePlanFeature("Complaints"),
  addComplaintComment
);

router.get(
  "/get/complaint/comments/:complaintId",
  verifyToken,
  requirePlanFeature("Complaints"),
  getComplaintComments
);

router.get(
  "/complaints/has-assigned",
  verifyToken,
  requirePlanFeature("Complaints"),
  isComplaintAssignedToMe
);

module.exports = router;
