const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const {
  createBooking,
} = require("../../controller/apartment/amenities/forOccupants/bookingAmenityController");
const {
  getMyBookings,
} = require("../../controller/apartment/amenities/forOccupants/getMyAmenitiesBookings");
const {
  cancelBooking,
} = require("../../controller/apartment/amenities/forOccupants/cancelBooking");
const {
  getAllBookings,
} = require("../../controller/apartment/amenities/getAllAmenitiesBookings");
const checkPermission = require("../../middlewares/checkPermission");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");
const router = express.Router();

// 🧩 Route → Create new booking (directly completed)
router.post(
  "/create/booking",
  verifyToken,
  requirePlanFeature("Amenities"),
  createBooking
);

router.get(
  "/get/my/booking",
  verifyToken,
  requirePlanFeature("Amenities"),
  getMyBookings
);

router.patch(
  "/cancel/booking/:id",
  verifyToken,
  requirePlanFeature("Amenities"),
  cancelBooking
);

router.get(
  "/get/all/booking",
  verifyToken,
  checkPermission("can_see_amenities_booking"),
  requirePlanFeature("Amenities"),
  getAllBookings
);

module.exports = router;
