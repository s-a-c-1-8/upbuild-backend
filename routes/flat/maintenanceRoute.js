const express = require("express");
const {
  getFlatsByApartmentIdForMaintenance,
} = require("../../controller/flat/maintenance/getFlatsCount");

const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  addCorpusMaintenance,
} = require("../../controller/flat/maintenance/corpus/corpusMaintenanceContoller");
const {
  calculateCorpusMaintenanceByApartmentId,
} = require("../../controller/flat/maintenance/corpus/calculateCorpuseMaintenance");
const {
  getAllCorpusByApartmentId,
} = require("../../controller/flat/maintenance/corpus/getCorpusByApartmentId");
const {
  getCorpusEntryById,
} = require("../../controller/flat/maintenance/corpus/getDetailsByCorpusId");
const {
  markCorpusEntryPaid,
} = require("../../controller/flat/maintenance/corpus/markCorpusEntryPaid");
const {
  createEvent,
} = require("../../controller/flat/maintenance/event/createEvent");
const {
  getEventsByApartment,
} = require("../../controller/flat/maintenance/event/getEventsByApartment");
const {
  markEventContributionPaid,
} = require("../../controller/flat/maintenance/event/addContribution");

const getEventDetailsById = require("../../controller/flat/maintenance/event/getEventDetailsById");
const {
  waiveCorpusPenalty,
} = require("../../controller/flat/maintenance/corpus/waiveCorpusPenalty");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

router.get(
  "/get/flats/count/:apartmentId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getFlatsByApartmentIdForMaintenance
);

router.post(
  "/add/corpus/maintenance",
  verifyToken,
  checkPermission("can_add_maintenance"),
  requirePlanFeature("Maintenance"),
  addCorpusMaintenance
);

router.post(
  "/admin/calculate/corpus/maintenance",
  verifyToken,
  requirePlanFeature("Maintenance"),
  calculateCorpusMaintenanceByApartmentId
);

router.post(
  "/get/all/corpus/:apartmentId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getAllCorpusByApartmentId
);

router.get(
  "/get/corpus/entry/:entryId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getCorpusEntryById
);

router.put(
  "/corpus/mark/paid/:entryId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  markCorpusEntryPaid
);

router.post(
  "/maintenance/waive/corpus/penalty",
  verifyToken,
  checkPermission("can_add_maintenance"),
  requirePlanFeature("Maintenance"),
  waiveCorpusPenalty
);

router.post(
  "/add/event/maintenance",
  verifyToken,
  checkPermission("can_add_maintenance"),
  requirePlanFeature("Maintenance"),
  createEvent
);

// Get all events for an apartment
router.get(
  "/get/all/events/:apartmentId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getEventsByApartment
);

// Add a flat's contribution to an event
router.put(
  "/events/contribute/:eventId",
  verifyToken,
  requirePlanFeature("Maintenance"),
  markEventContributionPaid
);

router.get(
  "/get/event/details/:id",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getEventDetailsById
);

module.exports = router;
