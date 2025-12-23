const express = require("express");
const {
  getAllStates,
  getCitiesByState,
  getApartmentsByLocation,
  getFlatsByApartmentForNewUser,
} = require("../../controller/user/newLogin/apartmentFlowFetch");
const verifyToken = require("../../middlewares/verifyToken");
const {
  requestNewFlat,
} = require("../../controller/user/newLogin/requestNewFlat");
const {
  confirmJoinFlat,
} = require("../../controller/user/newLogin/requestFlat");
const { getUnapprovedUserById } = require("../../controller/user/newLogin/getUnapprovedUserById");
const { approveUnapprovedUser } = require("../../controller/user/newLogin/approveUnapprovedUser");
const router = express.Router();

router.get("/admin/get/all/states", verifyToken, getAllStates);

router.get(
  "/admin/get/cities/from-apartment/:state",
  verifyToken,
  getCitiesByState
);

// routes/apartmentRoutes.js
router.get(
  "/admin/get/apartments/by-location",
  verifyToken,
  getApartmentsByLocation
);

router.get(
  "/admin/get/flats/by-apartment/:apartmentId",
  verifyToken,
  getFlatsByApartmentForNewUser
);

router.post("/user/request/join/flat", verifyToken, confirmJoinFlat);

router.post("/user/request/new/flat", verifyToken, requestNewFlat);

router.get("/get/unapproved/user/:id", verifyToken, getUnapprovedUserById);

router.post("/approve/user", verifyToken, approveUnapprovedUser);


module.exports = router;
