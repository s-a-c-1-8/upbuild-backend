const express = require("express");
const {
  sendOtp,
  verifyOtp,
} = require("../../controller/apartment/otpPhoneController");
const verifyToken = require("../../middlewares/verifyToken");
const { sendEmailOtp, verifyEmailOtp } = require("../../controller/apartment/otpEmailContoller");

const router = express.Router();

router.post("/send/otp", verifyToken, sendOtp);
router.post("/verify/otp", verifyToken, verifyOtp);

router.post("/send/otp/email", verifyToken, sendEmailOtp);
router.post("/verify/otp/email", verifyToken, verifyEmailOtp);


module.exports = router;
