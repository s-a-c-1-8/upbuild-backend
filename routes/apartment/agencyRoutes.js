const express = require("express");
const router = express.Router();

const {
  addAgency,
} = require("../../controller/apartment/agency/addAgencyController");
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const { updateAgency } = require("../../controller/apartment/agency/updateAgency");
const { getAgencyById } = require("../../controller/apartment/agency/getAgencyByAgencyId");
const { getAgenciesByApartmentId } = require("../../controller/apartment/agency/getAgenciesByApartmentId");

// Route to add an agency with file upload and compression
router.post(
  "/agency/add",
  upload.fields([{ name: "agreementFile", maxCount: 1 }]), // ✅ fix here
  compressFile,
  verifyToken,
  checkPermission("can_add_agencies"),
  addAgency
);

router.get(
  "/agency/by-apartment/:apartmentId",
  verifyToken,
  checkPermission("can_view_agencies_page"),
  getAgenciesByApartmentId
);

router.get(
  "/agency/by-apartment/list/:apartmentId",
  verifyToken,
  getAgenciesByApartmentId
);

router.get("/get/agency/by/:id", verifyToken,getAgencyById);

router.put(
  "/update/agency/by/:id",
  upload.fields([{ name: "agreementFile", maxCount: 1 }]), // ✅ fix here
  compressFile,
  verifyToken,
  checkPermission("can_add_agencies"),
  updateAgency
);

module.exports = router;
