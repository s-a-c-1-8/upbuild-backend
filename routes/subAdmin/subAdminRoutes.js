const express = require("express");
const {
  createSubAdmin,
  getAllSubAdmins,
} = require("../../controller/subAdmin/subAdminController");
const {
  updateSubAdminStatus,
  getSubAdminById,
} = require("../../controller/subAdmin/edtSubAdminStatus");

const {
  updateSubAdminById,
  changeSubAdminPassword,
} = require("../../controller/subAdmin/profileSubAdmin");
const checkPermission = require("../../middlewares/checkPermission");
const verifyToken = require("../../middlewares/verifyToken");
const router = express.Router();

router.post(
  "/admin/subAdmin/add",
  verifyToken,
  checkPermission("can_add_subadmins"),
  createSubAdmin
);
// router.post("/admin/generateCredentials", generateSubadminCredentials);
router.post("/admin/all/subadmins", verifyToken, getAllSubAdmins);
router.patch(
  "/admin/update/subadmin/status",
  verifyToken,
  checkPermission("can_edit_subadmin_status"),
  updateSubAdminStatus
);
router.get("/admin/subadmin/id/:id", getSubAdminById);
router.patch("/admin/subadmin/update/:id", verifyToken, updateSubAdminById);
router.patch(
  "/admin/subadmin/change-password/:id",
  verifyToken,
  changeSubAdminPassword
);

module.exports = router;
