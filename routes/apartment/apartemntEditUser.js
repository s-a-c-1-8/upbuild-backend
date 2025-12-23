const express = require("express");

const {
  getApartmentById,
} = require("../../controller/apartment/getApartments");
const {
  getActivePropertyTypes,
} = require("../../controller/superAdmin/propertyTypeController");
const {
  getAllBuilders,
} = require("../../controller/superAdmin/builderNameController");
const {
  getAllActivePlans,
} = require("../../controller/superAdmin/planController");
const {
  getAllAmenities,
} = require("../../controller/superAdmin/amenityController");
const {
  updateApartment,
} = require("../../controller/apartment/apartmentUpdate");
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");

const router = express.Router();

router.get("/user/get/apartment/by/id/:id", verifyToken, getApartmentById);
router.get("/user/getAllProperty/active", verifyToken, getActivePropertyTypes);
router.get("/user/getAllBuilders", verifyToken, getAllBuilders);
router.get("/user/get/activePlans", verifyToken, getAllActivePlans);
router.get("/user/getAllAmenities", verifyToken, getAllAmenities);
router.post(
  "/user/apartment/update/:id",
  upload.fields([
    { name: "apartmentPhotos", maxCount: 10 },
    { name: "apartmentPolicies", maxCount: 10 },
  ]),
  compressFile,
  verifyToken,
  checkPermission("can_edit_apartment"),
  updateApartment
);

module.exports = router;
