const express = require("express");

const {
  addMonthlyMaintenance,
} = require("../../controller/flat/maintenance/maintenanceContoller");
const {
  getAllMaintenanceByApartmentId,
} = require("../../controller/flat/maintenance/getMaintenanceByApartmentId");
const {
  getMaintenanceEntryById,
} = require("../../controller/flat/maintenance/getDetailsByMaintenanceId");
const {
  markMaintenanceEntryPaid,
} = require("../../controller/flat/maintenance/markMaintenanceEntryPaid");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");

const {
  calculateMaintenance,
} = require("../../controller/flat/maintenance/calculateMaintenance");
const {
  waiveMonthlyPenalty,
} = require("../../controller/flat/maintenance/waiveMonthlyPenalty");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

router.post(
  "/admin/calculate/maintenance",
  verifyToken,
  requirePlanFeature("Maintenance"),
  calculateMaintenance
);

router.post(
  "/add/monthly/maintenance",
  verifyToken,
  checkPermission("can_add_maintenance"),
  requirePlanFeature("Maintenance"),
  addMonthlyMaintenance
);

router.post(
  "/get/all/maintenance/:apartmentId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getAllMaintenanceByApartmentId
);

router.get(
  "/get/maintenance/entry/:entryId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getMaintenanceEntryById
);

router.put(
  "/maintenance/mark/paid/:entryId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  markMaintenanceEntryPaid
);

router.post(
  "/maintenance/waive/monthly/penalty",
  verifyToken,
  checkPermission("can_add_maintenance"),
  requirePlanFeature("Maintenance"),
  waiveMonthlyPenalty
);

module.exports = router;
