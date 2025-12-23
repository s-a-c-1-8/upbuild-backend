const express = require("express");
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const {
  addExpense,
  updateExpense,
} = require("../../controller/apartment/expense/expenseAddUpdate");
const {
  getExpensesByApartment,
  getMonthlyExpenseDetailsById,
} = require("../../controller/apartment/expense/getExpense");
const checkPermission = require("../../middlewares/checkPermission");
const verifyToken = require("../../middlewares/verifyToken");
const { requirePlanFeature } = require("../../middlewares/requirePlanFeature");

const router = express.Router();

router.post(
  "/add/maintenance/expense",
  upload.fields([{ name: "invoice", maxCount: 1 }]),
  compressFile,
  verifyToken,
  checkPermission("can_add_expense"),
  requirePlanFeature("Maintenance"),
  addExpense
);

// Fetch expenses for apartment or month
router.get(
  "/get/maintenance/expense/:apartmentId",
  verifyToken,
  checkPermission("can_view_expense_page"),
  requirePlanFeature("Maintenance"),
  getExpensesByApartment
);

// GET /get/maintenance/expense/details/:id
router.get(
  "/get/maintenance/expense/details/:id",
  verifyToken,
  checkPermission("can_view_monthly_expense"),
  requirePlanFeature("Maintenance"),
  getMonthlyExpenseDetailsById
);

router.put(
  "/update/maintenance/expense/:expenseId",
  upload.fields([{ name: "invoice", maxCount: 1 }]),
  compressFile,
  verifyToken,
  checkPermission("can_edit_monthly_expense"),
  requirePlanFeature("Maintenance"),
  updateExpense
);

module.exports = router;
