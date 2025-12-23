const express = require("express");

const {
  saveMaintenanceFineSettings,
} = require("../../controller/flat/maintenance/settings/addMaintenanceSettings");
const {
  getMaintenanceFineSettings,
} = require("../../controller/flat/maintenance/settings/getMaintenanceSettings");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  saveLineItems,
} = require("../../controller/flat/maintenance/lineItems/addMaintenanceLineItems");
const {
  getAllLineItemsNames,
  getMaintenanceLineItemById,
} = require("../../controller/flat/maintenance/lineItems/getLineItems");
const {
  updateLineItems,
} = require("../../controller/flat/maintenance/lineItems/updateLineItems");
const {
  setDefaultLineItem,
} = require("../../controller/flat/maintenance/lineItems/setDefaultLineItem");
const {
  getDefaultLineItem,
} = require("../../controller/flat/maintenance/lineItems/getDefaultLineItem");
const {
  setMaintenanceType,
  getMaintenanceType,
} = require("../../controller/flat/maintenance/settings/setMaintenanceType");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

router.post(
  "/admin/add/maintenance/settings",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  saveMaintenanceFineSettings
);

// GET /api/settings/fine
router.post(
  "/admin/get/maintenance/settings",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  getMaintenanceFineSettings
);

router.post(
  "/admin/maintenance/add/line/items",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  saveLineItems
);

router.get(
  "/get/maintenance/line/items/name",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  getAllLineItemsNames
);

router.get(
  "/get/maintenance/line/items/:id",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  getMaintenanceLineItemById
);

router.put(
  "/admin/maintenance/update/line/items/:id",
  verifyToken,
  checkPermission("can_see_and_edit_maintenance_settings"),
  requirePlanFeature("Maintenance"),
  updateLineItems
);

router.post(
  "/admin/set/default/lineitem",
  verifyToken,
  requirePlanFeature("Maintenance"),
  setDefaultLineItem
);
router.get(
  "/admin/get/default/lineitem",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getDefaultLineItem
);
router.post(
  "/admin/set/maintenance/type",
  verifyToken,
  requirePlanFeature("Maintenance"),
  setMaintenanceType
);
router.get(
  "/admin/get/maintenance/type",
  verifyToken,
  requirePlanFeature("Maintenance"),
  getMaintenanceType
);

module.exports = router;
