const SuperAdmin = require("../model/superAdmin/superAdmin");
const SubAdmin = require("../model/subAdmin/subAdmin");

const superSubAdminsForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // 1️⃣ Check SuperAdmin first
    let user = await SuperAdmin.findOne({ email });
    let userType = "superadmin";

    // 2️⃣ If not SuperAdmin → check SubAdmin
    if (!user) {
      user = await SubAdmin.findOne({ email });
      userType = "subadmin";
    }

    // 3️⃣ If no user found
    if (!user) {
      return res.status(404).json({
        message: "Email not found. Cannot send reset link.",
      });
    }

    // 4️⃣ Build reset link using .env FRONTEND_URL
    const resetLink = `${process.env.FRONTEND_URL}admin/auth/resetPassword/${user._id}`;

    // 5️⃣ Save reset link in DB
    if (userType === "superadmin") {
      await SuperAdmin.findByIdAndUpdate(user._id, {
        forgotPassLink: resetLink,
      });
    } else {
      await SubAdmin.findByIdAndUpdate(user._id, {
        forgotPassLink: resetLink,
      });
    }

    // 6️⃣ Console for test instead of email sending
    console.log("🔗 PASSWORD RESET LINK (for testing only):", resetLink);

    return res.status(200).json({
      message: "Password reset link generated",
      resetLink, // return for testing
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { superSubAdminsForgotPassword };
