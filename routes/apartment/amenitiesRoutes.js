// routes/apartmentRoutes.js
const express = require("express");
const {
  getApartmentWithAllAmenities,
} = require("../../controller/apartment/amenitiesGet");
const verifyToken = require("../../middlewares/verifyToken");
const {
  updateApartmentAmenities,
} = require("../../controller/apartment/amenities/updateApartmentAmenities");
const checkPermission = require("../../middlewares/checkPermission");
const {
  markAmenityUnderMaintenance,
} = require("../../controller/apartment/amenities/markAmenityUnderMaintenance");
const {
  checkAmenityMaintenance,
} = require("../../controller/apartment/amenities/getActiveAmenityMaintenance");
const {
  getApartmentAmenitiesForOccupants,
} = require("../../controller/apartment/amenities/forOccupants/getApartmentAmenities");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");
const router = express.Router();

// GET amenities for apartment
router.get(
  "/get/apatrment/amenities/:id",
  verifyToken,
  checkPermission("can_change_amenities_settings"),
  requirePlanFeature("Amenities"),
  getApartmentWithAllAmenities
);

router.post(
  "/update/apartment/amenities/:id",
  verifyToken,
  checkPermission("can_change_amenities_settings"),
  requirePlanFeature("Amenities"),
  updateApartmentAmenities
);

router.post(
  "/amenity/markMaintenance/:id",
  verifyToken,
  checkPermission("can_change_amenities_settings"),
  requirePlanFeature("Amenities"),
  markAmenityUnderMaintenance
);

router.post(
  "/apartment/:id/check/maintenance",
  verifyToken,
  requirePlanFeature("Amenities"),
  checkAmenityMaintenance
);

router.get(
  "/get/amenities/for/occupants/:apartmentId",
  verifyToken,
  requirePlanFeature("Amenities"),
  getApartmentAmenitiesForOccupants
);

module.exports = router;
