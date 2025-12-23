const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const router = express.Router();
const addBankDetails = require("../../controller/apartment/accountDetails/addBankDetails");
const getBankDetails = require("../../controller/apartment/accountDetails/getBankDetails");
const {
  updateMaintenanceAccounts,
  getMaintenanceAccounts,
} = require("../../controller/apartment/accountDetails/maintenanceAccount");
const {
  deleteBankDetails,
} = require("../../controller/apartment/accountDetails/deleteBankDetails");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

router.post(
  "/admin/add/bankDetails",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  addBankDetails
);

router.post(
  "/admin/get/bankDetails",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  getBankDetails
);

// POST /admin/set/maintenanceAccounts
router.post(
  "/admin/set/maintenanceAccounts",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  updateMaintenanceAccounts
);

// POST /admin/get/maintenanceAccounts
router.post(
  "/admin/get/maintenanceAccounts",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  getMaintenanceAccounts
);

router.delete(
  "/admin/delete/bank/details/:id",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  deleteBankDetails
);

module.exports = router;
