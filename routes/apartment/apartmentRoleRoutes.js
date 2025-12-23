const express = require("express");

const {
  addApartmentRole,
  getAllApartmentRoles,
  updateApartmentRolePermissions,
  getApartmentSubAdminRoles,
  getAllApartmentRolesExceptBoardMembers,
  getOnlyBoardMemberRoles,
  getOnlyStaffRoles,
} = require("../../controller/apartment/rolesAndPermisson/apartmentRoleController");
const { getRoleNameById } = require("../../controller/user/getRoleNameById");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getApartmentRoleGroups,
} = require("../../controller/apartment/rolesAndPermisson/getGroupedApartmentRoles");
const router = express.Router();

router.post(
  "/user/addRole",
  verifyToken,
  checkPermission("can_add_roles"),
  addApartmentRole
);

router.post(
  "/user/boardMembers/roles",
  verifyToken,
  checkPermission("can_add_board_members_roles"),
  addApartmentRole
);

router.get(
  "/user/getAllRoles/except/boardMembers/:apartmentId",
  verifyToken,
  checkPermission("can_view_role_page"),
  getAllApartmentRolesExceptBoardMembers
);

router.get(
  "/user/getRoles/boardMembers/:apartmentId",
  verifyToken,
  checkPermission("can_view_board_members_role_page"),
  getOnlyBoardMemberRoles
);

router.get("/user/getRoles/staff/:apartmentId", verifyToken, getOnlyStaffRoles);

router.put(
  "/user/updateRole/:roleId/apartment/:apartmentId",
  verifyToken,
  checkPermission("can_edit_permissions_for_role"),
  updateApartmentRolePermissions
);

router.put(
  "/user/updateRole/boardMembers/:roleId/apartment/:apartmentId",
  verifyToken,
  checkPermission("can_edit_permissions_for_board_members_role"),
  updateApartmentRolePermissions
);

router.get(
  "/user/getOnlySubAdminRoles/apartmentAdmin/:apartmentId",
  verifyToken,
  getApartmentSubAdminRoles
);

router.get("/user/apartment/get/role/:id", verifyToken, getRoleNameById);

router.get(
  "/get/groups/roles/:apartmentId",
  verifyToken,
  getApartmentRoleGroups
);

// router.get("/user/get/role/by/AparmentAdmin/:apartmentId",verifyToken, getAparmentAdminRoleForApartment);

module.exports = router;
