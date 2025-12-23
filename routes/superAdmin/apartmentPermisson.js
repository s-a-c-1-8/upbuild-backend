const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const {
  getAllApartmentPermissions,
  addApartmentPermission,
} = require("../../controller/apartment/rolesAndPermisson/apartmentPermissionController");

const router = express.Router();

router.post(
  "/admin/apartment/addPermission",
  verifyToken,
  addApartmentPermission
);

router.get(
  "/admin/apartment/getAllPermissions",
  verifyToken,
  getAllApartmentPermissions
);

module.exports = router;
