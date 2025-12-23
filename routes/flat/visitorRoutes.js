const express = require("express");
const {
  addVisitor,
  updateVisitorStatus,
} = require("../../controller/flat/visitor/visitorController");
const { upload, compressFile } = require("../../middlewares/uploadMiddleware");
const {
  getVisitorsFromApartmentId,
  getVisitorById,
} = require("../../controller/flat/visitor/getVisitorContoller");
const {
  searchVisitors,
} = require("../../controller/flat/visitor/searchVisitor");
const {
  exportVisitorsPDF,
} = require("../../controller/flat/visitor/exportVisitors");
const {
  updateOccupantAcceptStatus,
} = require("../../controller/flat/visitor/updateOccupantAcceptStatus");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getFlatsByApartmentIdForVisitor,
} = require("../../controller/flat/visitor/getFlatForVisitor");
const {
  markVisitorCheckedInIfAccepted,
} = require("../../controller/flat/visitor/markVisitorCheckedInIfAccepted");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

router.post(
  "/get/flat/by/apartment/for/visitor/:apartmentId",
  verifyToken,
  requirePlanFeature("Visitors"),
  getFlatsByApartmentIdForVisitor
);

router.post(
  "/visitor/add",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 },
  ]),
  compressFile,
  verifyToken,
  requirePlanFeature("Visitors"),
  addVisitor
);

router.post(
  "/get/visitors/by/apartmentId/:apartmentId",
  verifyToken,
  requirePlanFeature("Visitors"),
  getVisitorsFromApartmentId
);

router.get(
  "/get/visitor/by/id/:id",
  verifyToken,
  requirePlanFeature("Visitors"),
  getVisitorById
);

router.put(
  "/update/visitor/status/:id",
  verifyToken,
  requirePlanFeature("Visitors"),
  updateVisitorStatus
);

router.put(
  "/visitor/check-in-if-accepted/:id",
  verifyToken,
  requirePlanFeature("Visitors"),
  markVisitorCheckedInIfAccepted
);

router.post(
  "/visitor/search",
  verifyToken,
  requirePlanFeature("Visitors"),
  searchVisitors
);

router.post(
  "/export/visitors/pdf",
  verifyToken,
  checkPermission("can_export_visitors_data"),
  requirePlanFeature("Visitors"),
  exportVisitorsPDF
);

router.patch(
  "/visitor/occupant/response/:id",
  verifyToken,
  requirePlanFeature("Visitors"),
  updateOccupantAcceptStatus
);

module.exports = router;
