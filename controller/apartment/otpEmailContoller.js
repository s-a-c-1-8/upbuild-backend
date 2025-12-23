const EmailOtp = require("../../model/apartment/otpEmail"); // create this model similar to phoneOtp

// utility to generate random 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /api/send-email-otp
 */
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await EmailOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // 🔹 Just log OTP for now (integration with email provider can be added later)
    console.log(`OTP for ${email}: ${otp}`);

    return res.json({ message: "OTP sent to email successfully" });
  } catch (err) {
    console.error("Error sending email OTP:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/verify-email-otp
 */
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const record = await EmailOtp.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Verified → delete OTP record
    await EmailOtp.deleteOne({ email });

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Error verifying email OTP:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
