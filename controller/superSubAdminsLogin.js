// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");
// const SuperAdmin = require("../model/superAdmin/superAdmin");
// const SubAdmin = require("../model/subAdmin/subAdmin");

// const superSubAdminsloginController = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required" });
//   }

//   try {
//     // Check SuperAdmin first
//     let user = await SuperAdmin.findOne({ email });
//     let userType = "superadmin";

//     if (!user) {
//       // If not SuperAdmin, check SubAdmin
//       user = await SubAdmin.findOne({ email }).populate("role");
//       userType = "subadmin";
//     }

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // 4️⃣ Check SubAdmin Active status
//     if (userType === "subadmin" && user.isActive === false) {
//       return res.status(403).json({
//         message: "Your profile is inactive. Contact the application admin.",
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: user._id, userType: user.userRole },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       userDetails: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         userRole: user.userRole,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// module.exports = { superSubAdminsloginController };

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const SuperAdmin = require("../model/superAdmin/superAdmin");
const SubAdmin = require("../model/subAdmin/subAdmin");

const superSubAdminsloginController = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 1️⃣ Check SuperAdmin
    let user = await SuperAdmin.findOne({ email });
    let userType = "superadmin";

    // 2️⃣ If not SuperAdmin → check SubAdmin
    if (!user) {
      user = await SubAdmin.findOne({ email }).populate("role");
      userType = "subadmin";
    }

    // 3️⃣ If no user found
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4️⃣ If user is SubAdmin but inactive
    if (userType === "subadmin" && user.isActive === false) {
      return res.status(403).json({
        message: "Your profile is inactive. Contact the application admin.",
      });
    }

    // 5️⃣ If SubAdmin has NO password stored → treat as expired
    if (userType === "subadmin" && !user.password) {
      return res.status(403).json({
        message: "Your password has expired. Please reset your password.",
        action: "password_expired",
      });
    }

    // 6️⃣ If SuperAdmin has no password (rare but safe check)
    if (userType === "superadmin" && !user.password) {
      return res.status(500).json({
        message: "Password not set for admin account. Contact system owner.",
      });
    }

    // 7️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 8️⃣ Generate Token
    const token = jwt.sign(
      { id: user._id, userType: user.userRole },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // 9️⃣ Login success
    return res.status(200).json({
      message: "Login successful",
      token,
      userDetails: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userRole: user.userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { superSubAdminsloginController };
