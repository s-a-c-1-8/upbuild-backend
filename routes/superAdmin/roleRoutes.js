const express = require("express");
const {
  addRole,
  getAllRoles,
  updateRolePermissions,
  getSubAdminRole,
} = require("../../controller/superAdmin/roleController");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const router = express.Router();

router.post("/admin/addRole", verifyToken,checkPermission("can_add_roles"), addRole);
router.get("/admin/getAllRoles", verifyToken, getAllRoles);
router.put(
  "/admin/updateRole/:roleId",
  verifyToken,checkPermission("can_edit_roles"),
  updateRolePermissions
);
router.get("/admin/get/role/by/SubAdmin",verifyToken, getSubAdminRole);
// router.get("/admin/get/role/by/AparmentAdmin",verifyToken, getAparmentAdminRole);

module.exports = router;
