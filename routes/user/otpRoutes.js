const express = require("express");
const {
  generateOtp,
  verifyOtp,
} = require("../../controller/user/otp/OtpContoller");
const { verifyOtpLoginController } = require("../../controller/user/userController");
const router = express.Router();

router.post("/apartment/user/generate-otp", generateOtp);
router.post("/apartment/user/verify-otp", verifyOtp);
router.post("/apartment/user/login/otp", verifyOtpLoginController);

module.exports = router;
