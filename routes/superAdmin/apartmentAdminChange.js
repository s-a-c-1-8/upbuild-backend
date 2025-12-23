// routes/apartmentAdmin.routes.js

const express = require("express");
const {
  getApartmentAdmins,
} = require("../../controller/superAdmin/apartmentAdminChange/getApartmentAdmins");
const verifyToken = require("../../middlewares/verifyToken");

const router = express.Router();

router.get(
  "/admin/get/apartment/:apartmentId/admins",
  verifyToken,
  getApartmentAdmins
);

module.exports = router;
