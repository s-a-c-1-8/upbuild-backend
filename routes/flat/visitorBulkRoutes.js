const express = require("express");

const { upload, compressFile } = require("../../middlewares/uploadMiddleware");

const {
  addFlatBulkVisitor,
} = require("../../controller/flat/visitor/bulk/bulkVisitorController");
const {
  getVisitorsFromApartmentIdBulk,
} = require("../../controller/flat/visitor/bulk/getBulkVisitors");
const {
  exportBulkVisitorsPDF,
} = require("../../controller/flat/visitor/bulk/exportBulk");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getVisitorsBulkById,
} = require("../../controller/flat/visitor/bulk/getBulkVisitorById");
const {
  addBulkVisitorInfo,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/addBulkVisitorInfo");
const {
  getAllVisitorsBulkDetailsById,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/getAllDetailsByBulkVisitorId");
const {
  getBulkVisitorLink,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/copyLink");
const {
  getBulkVisitorByVisitorId,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/getBulkVisitorInfoById");
const {
  updateBulkVisitorStatus,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/updateBulkVisitorStatus");
const {
  acceptWihtClockInBulkVisitorOccupant,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/occpantAcceptPeople");
const {
  approveBulkVisitorOccupant,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/occupantApprovePeople");
const {
  notifyOccupant,
} = require("../../controller/flat/visitor/bulk/bulkVisitorPeople/notifyOccupant");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

//bulk
router.post(
  "/visitor/add/bulk",
  verifyToken,
  requirePlanFeature("Visitors"),
  addFlatBulkVisitor
);

router.post(
  "/get/visitor/in/bulk/:apartmentId",
  verifyToken,
  requirePlanFeature("Visitors"),
  getVisitorsFromApartmentIdBulk
);

router.post(
  "/export/visitors/bulk/pdf",
  verifyToken,
  checkPermission("can_export_visitors_data"),
  requirePlanFeature("Visitors"),
  exportBulkVisitorsPDF
);

router.get(
  "/get/flat/bulk/visitor/:id/copy/link",
  verifyToken,
  requirePlanFeature("Visitors"),
  getBulkVisitorLink
);

router.get("/get/visitorsbulk/for/formFill/by/:id", getVisitorsBulkById);

router.get(
  "/get/visitorsbulk/by/:id",
  verifyToken,
  requirePlanFeature("Visitors"),
  getAllVisitorsBulkDetailsById
);

router.post(
  "/bulk/visitor/add/info",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 },
  ]),
  compressFile, // optional, if you use it
  addBulkVisitorInfo
);

router.get(
  "/visitor/info/of/bulVisitor/:visitorId",
  verifyToken, // Optional based on your app
  requirePlanFeature("Visitors"),
  getBulkVisitorByVisitorId
);

router.put(
  "/visitor/update-status/:visitorId",
  verifyToken,
  requirePlanFeature("Visitors"),
  updateBulkVisitorStatus
);

router.put(
  "/approve/people/form/:visitorId",
  verifyToken,
  requirePlanFeature("Visitors"),
  approveBulkVisitorOccupant
);

router.put(
  "/accept/people/form/:visitorId",
  verifyToken,
  requirePlanFeature("Visitors"),
  acceptWihtClockInBulkVisitorOccupant
);

router.post(
  "/notify/occupant/:id", // :id = visitorId
  verifyToken,
  requirePlanFeature("Visitors"),
  notifyOccupant
);

module.exports = router;
