// const User = require("../../../model/user/userModel");
// const UnapprovedUser = require("../../../model/user/unapprovedUser");

// exports.generateOtp = async (req, res) => {
//   try {
//     const { identifier } = req.body;
//     if (!identifier) {
//       return res.status(400).json({ message: "Phone or Email is required." });
//     }

//     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
//     const query = isEmail
//       ? { email: identifier.toLowerCase() }
//       : { contactNumber: identifier };

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();
//     const now = new Date();

//     const processUser = async (user, isUnapproved = false) => {
//       const attempts = user.otpAttempts || { count: 0, lastAttemptTime: null };
//       const last = attempts.lastAttemptTime ? new Date(attempts.lastAttemptTime) : null;
//       const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

//       if (last && last > oneHourAgo) {
//         if (attempts.count >= 5) {
//           return res.status(429).json({
//             message: "OTP limit reached. Try after 1 hour.",
//             remainingAttempts: 0,
//           });
//         }
//         attempts.count += 1;
//       } else {
//         attempts.count = 1;
//       }

//       attempts.lastAttemptTime = now;
//       user.otp = otp;
//       user.lastOtpSentAt = now;
//       user.otpAttempts = attempts;
//       await user.save();

//       const Model = isUnapproved ? UnapprovedUser : User;

//       setTimeout(async () => {
//         await Model.updateOne({ _id: user._id, otp }, { $set: { otp: "N/A" } });
//       }, 60000);

//       return res.status(200).json({
//         message: "OTP sent successfully.",
//         expiresIn: "60 seconds",
//         remainingAttempts: 5 - attempts.count,
//       });
//     };

//     let user = await User.findOne(query);
//     if (user) return await processUser(user);

//     let unapproved = await UnapprovedUser.findOne(query);
//     if (unapproved) return await processUser(unapproved, true);

//     // Create new UnapprovedUser
//     const newUnapproved = new UnapprovedUser({
//       ...(isEmail ? { email: identifier.toLowerCase() } : { contactNumber: identifier }),
//       otp,
//       lastOtpSentAt: now,
//       otpAttempts: { count: 1, lastAttemptTime: now },
//     });
//     await newUnapproved.save();

//     setTimeout(async () => {
//       await UnapprovedUser.updateOne(query, { $set: { otp: "N/A" } });
//     }, 60000);

//     return res.status(200).json({
//       message: "OTP sent successfully.",
//       expiresIn: "60 seconds",
//       remainingAttempts: 4,
//     });
//   } catch (error) {
//     console.error("❌ Error generating OTP:", error);
//     return res.status(500).json({
//       message: "Failed to generate OTP.",
//       error: error.message,
//     });
//   }
// };

const User = require("../../../model/user/userModel");
const UnapprovedUser = require("../../../model/user/unapprovedUser");
const AppSettings = require("../../../model/superAdmin/appSettingsModel");

exports.generateOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "Phone or Email is required." });
    }

    // ✅ Load OTP settings from unified AppSettings model
    const settingsDoc = await AppSettings.findOne();
    const otpSettings = settingsDoc?.settings?.otp || {};
    const otpMaxAttempts = otpSettings.otpMaxAttempts ?? 5;
    const otpCooldownTime = otpSettings.otpCooldownTime ?? 60000;
    const otpWindow = otpSettings.otpWindow ?? 60 * 60 * 1000;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const query = isEmail
      ? { email: identifier.toLowerCase() }
      : { contactNumber: identifier };

    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = "12345"; // 👈 force OTP for testing

    const now = new Date();
    console.log("Generated OTP for", identifier, ":", otp); // 👈👈 LOG IT HERE

    const processUser = async (user, isUnapproved = false) => {
      const attempts = user.otpAttempts || { count: 0, lastAttemptTime: null };
      const last = attempts.lastAttemptTime
        ? new Date(attempts.lastAttemptTime)
        : null;
      const windowAgo = new Date(now.getTime() - otpWindow);

      if (last && last > windowAgo) {
        if (attempts.count >= otpMaxAttempts) {
          const waitMs = last.getTime() + otpWindow - now.getTime();
          const waitMinutes = Math.ceil(waitMs / (60 * 1000));

          return res.status(429).json({
            message: `OTP limit reached. Try again in ${waitMinutes} minute${
              waitMinutes !== 1 ? "s" : ""
            }.`,
            remainingAttempts: 0,
            retryAfter: waitMinutes,
          });
        }

        attempts.count += 1;
      } else {
        attempts.count = 1;
      }

      attempts.lastAttemptTime = now;
      user.otp = otp;
      console.log("Sending OTP (existing user):", otp); // 👈 LOG
      user.lastOtpSentAt = now;
      user.otpAttempts = attempts;
      await user.save();

      const Model = isUnapproved ? UnapprovedUser : User;

      // ❗ Invalidate OTP after cooldown
      setTimeout(async () => {
        await Model.updateOne({ _id: user._id, otp }, { $set: { otp: "N/A" } });
      }, otpCooldownTime);

      return res.status(200).json({
        message: "OTP sent successfully.",
        expiresIn: `${otpCooldownTime / 1000} seconds`,
        attemptWindow: `${otpWindow / (60 * 1000)} minutes`,
        remainingAttempts: otpMaxAttempts - attempts.count,
      });
    };

    let user = await User.findOne(query);
    if (user) return await processUser(user);

    let unapproved = await UnapprovedUser.findOne(query);
    if (unapproved) return await processUser(unapproved, true);

    // 🆕 Create new UnapprovedUser
    const newUnapproved = new UnapprovedUser({
      ...(isEmail
        ? { email: identifier.toLowerCase() }
        : { contactNumber: identifier }),
      otp,
      lastOtpSentAt: now,
      otpAttempts: { count: 1, lastAttemptTime: now },
    });
    await newUnapproved.save();
    console.log("Sending OTP (new unapproved):", otp); // 👈 LOG

    setTimeout(async () => {
      await UnapprovedUser.updateOne(query, { $set: { otp: "N/A" } });
    }, otpCooldownTime);

    return res.status(200).json({
      message: "OTP sent successfully.",
      expiresIn: `${otpCooldownTime / 1000} seconds`,
      attemptWindow: `${otpWindow / (60 * 1000)} minutes`,
      remainingAttempts: otpMaxAttempts - 1,
    });
  } catch (error) {
    console.error("❌ Error generating OTP:", error);
    return res.status(500).json({
      message: "Failed to generate OTP.",
      error: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res
        .status(400)
        .json({ message: "Phone/Email and OTP are required." });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const query = isEmail
      ? { email: identifier.toLowerCase() }
      : { contactNumber: identifier };

    // Try User first, then UnapprovedUser
    let user = await User.findOne(query);
    let isUnapproved = false;

    if (!user) {
      user = await UnapprovedUser.findOne(query);
      isUnapproved = true;
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isOtpExpired =
      !user.lastOtpSentAt ||
      new Date() - new Date(user.lastOtpSentAt) > 60000 ||
      user.otp === "N/A";

    if (isOtpExpired || user.otp !== otp) {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }

    user.otp = "N/A";
    user.isMobileVerified = true;
    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully.",
      userId: user._id,
      userType: isUnapproved ? "unapproved" : "approved",
      verified: true,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      message: "Failed to verify OTP.",
      error: error.message,
    });
  }
};
