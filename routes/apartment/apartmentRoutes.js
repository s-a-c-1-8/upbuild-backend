const express = require("express");
const {
  onboardApartment,
} = require("../../controller/apartment/apartmentCreate");
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const {
  getAllApartments,
  getApartmentById,
} = require("../../controller/apartment/getApartments");
const approveApartmentById = require("../../controller/apartment/approveApartmentById");
const {
  updateApartment,
} = require("../../controller/apartment/apartmentUpdate");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const { markPlanPaid } = require("../../controller/apartment/markPlanPaid");
const {
  checkApartmentValidity,
  checkApartmentState,
} = require("../../controller/apartment/checkApartmentValidity");

const router = express.Router();

router.post(
  "/admin/apartment/onboard",
  upload.fields([
    { name: "apartmentPhotos", maxCount: 10 },
    { name: "apartmentPolicies", maxCount: 10 },
  ]),
  compressFile,
  verifyToken,
  onboardApartment
);

router.get("/admin/get/apartments/list", verifyToken, getAllApartments);

router.get("/admin/get/apartment/by/id/:id", verifyToken, getApartmentById);

router.put("/apartment/plan/mark-paid/:id", verifyToken, markPlanPaid);

router.get("/get/apartment/by/id/:id", verifyToken, getApartmentById);

router.patch(
  "/admin/apartment/approve/:id",
  verifyToken,
  checkPermission("can_approve_apartments"),
  approveApartmentById
);

router.post(
  "/admin/apartment/update/:id",
  upload.fields([
    { name: "apartmentPhotos", maxCount: 10 },
    { name: "apartmentPolicies", maxCount: 10 },
  ]),
  compressFile,
  verifyToken,
  updateApartment
);

router.get(
  "/check/apartment/state/:apartmentId",
  verifyToken,
  checkApartmentState
);

module.exports = router;
