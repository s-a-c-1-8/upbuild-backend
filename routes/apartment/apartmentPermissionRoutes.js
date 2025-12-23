const express = require("express");
const {
  getAllApartmentPermissions,
  getAllApartmentPermissionsBasedOnApartment,
} = require("../../controller/apartment/rolesAndPermisson/apartmentPermissionController");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const { getMyPermissions } = require("../../controller/user/userGetPermissonBasedonLogin");
const router = express.Router();

router.get(
  "/user/apartment/getAllPermissions",
  verifyToken,
  getAllApartmentPermissions
);

router.get(
  "/user/apartment/getAllPermissions/on/apartmenetId",
  verifyToken,
  getAllApartmentPermissionsBasedOnApartment
);

// router.get(
//   "/user/apartment/getAllPermissions/for/role/add",
//   verifyToken,
//   checkPermission("can_add_roles"),
//   getAllApartmentPermissions
// );

router.get(
  "/user/apartment/getAllPermissions/for/role/add/on/apartmenetId",
  verifyToken,
  checkPermission("can_view_role_page"),
  getAllApartmentPermissionsBasedOnApartment
);

router.get(
  "/user/apartment/getAllPermissions/for/boardMembers/add/on/apartmenetId",
  verifyToken,
  checkPermission("can_view_board_members_role_page"),
  getAllApartmentPermissionsBasedOnApartment
);

router.get(
  "/user/get/my/permissions",
  verifyToken,
  getMyPermissions
);


module.exports = router;
