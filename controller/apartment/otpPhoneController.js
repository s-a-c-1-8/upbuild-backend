const phoneOtp = require("../../model/apartment/otpPhone");

// utility to generate random 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /api/send-otp
 */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res.status(400).json({ message: "Phone number required" });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await phoneOtp.findOneAndUpdate(
      { phone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // 🔹 Integrate SMS provider (Twilio, MSG91, etc.)
    console.log(`OTP for ${phone}: ${otp}`); // TODO: send via SMS API

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/verify-otp
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    const record = await phoneOtp.findOne({ phone });
    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Verified → delete OTP record
    await phoneOtp.deleteOne({ phone });

    return res.json({ message: "Phone verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
