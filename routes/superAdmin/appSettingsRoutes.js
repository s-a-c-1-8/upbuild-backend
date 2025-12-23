const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/verifyToken");
const {
  getOtpSettings,
  updateOtpSettings,
} = require("../../controller/superAdmin/settings/appOTPSettingsController");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getInactivitySettings,
  updateInactivitySettings,
} = require("../../controller/superAdmin/settings/popupAndAutoLogout");

router.get(
  "/admin/get/otp/settings",
  verifyToken,
  checkPermission("can_update_otpSettings"),
  getOtpSettings
);

// 🟩 POST to create or update OTP settings
router.post(
  "/admin/update/otp/settings",
  verifyToken,
  checkPermission("can_update_otpSettings"),
  updateOtpSettings
);

router.get("/admin/get/inactivity/settings", verifyToken, getInactivitySettings);
router.post("/admin/update/inactivity/settings", verifyToken, updateInactivitySettings);

module.exports = router;
