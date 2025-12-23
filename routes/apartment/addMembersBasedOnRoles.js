const express = require("express");
const { addStaff } = require("../../controller/apartment/addStaff");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getStaffUsers,
  getSubAdminApartment,
} = require("../../controller/user/getUserContoller");
const router = express.Router();

router.post(
  "/user/apartment/addStaff",
  verifyToken,
  checkPermission("can_add_Staff"),
  addStaff
);

router.get(
  "/apartment/user/get/all/staff/users",
  verifyToken,
  checkPermission("can_view_addStaff_page"),
  getStaffUsers
);

router.post(
  "/user/apartment/addSubAdmin",
  verifyToken,
  checkPermission("can_add_subAdmins"),
  addStaff
);

router.get(
  "/apartment/user/get/all/subAdmin",
  verifyToken,
  checkPermission("can_view_subAdmins_page"),
  getSubAdminApartment
);

module.exports = router;
