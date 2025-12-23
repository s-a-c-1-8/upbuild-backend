const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../model/user/userModel");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const Apartment = require("../../model/apartment/apartmentModel");
const ApartmentRole = require("../../model/apartment/apartmentRole");
const UnapprovedUser = require("../../model/user/unapprovedUser");

exports.userLoginController = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const query = isEmail
      ? { email: email.toLowerCase() }
      : { contactNumber: email };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res
        .status(401)
        .json({ message: "Password not set for this user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Get role assignments
    const roles = await UserRoleAssignment.find({ user: user._id })
      .populate("apartment", "name")
      .populate("flat", "flatName blockName")
      .populate("role", "name slug");

    const selectedRole = roles[0]; // default to first
    const selectedRoleId = selectedRole?._id;

    const token = jwt.sign(
      {
        id: user._id,
        userType: "user",
        selectedRoleId: selectedRoleId,
        apartmentId: selectedRole?.apartment?._id,
        flatId: selectedRole?.flat?._id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      userDetails: {
        _id: user._id,
        name: user.name,
        email: user.email,
        contactNumber: user.contactNumber,
        roles: roles.map((r) => ({
          _id: r._id, // ✅ ADD THIS — unique ID for the user-role assignment
          roleId: r.role?._id,
          role: r.role?.name,
          slug: r.role?.slug,
          apartmentId: r.apartment?._id,
          apartmentName: r.apartment?.name,
          flatId: r.flat?._id,
          flatName: r.flat?.flatName,
          blockName: r.flat?.blockName,
        })),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.verifyOtpLoginController = async (req, res) => {
  const { identifier, otp } = req.body;

  if (!identifier || !otp) {
    return res
      .status(400)
      .json({ message: "Phone/Email and OTP are required" });
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const query = isEmail ? { email: identifier } : { contactNumber: identifier };

  try {
    // ✅ 1. Check in approved users
    let user = await User.findOne(query);

    let userType = "user"; // Default type
    let isApproved = true;

    // ✅ 2. If not found, check in unapproved users
    if (!user) {
      user = await UnapprovedUser.findOne(query);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      isApproved = false;
      userType = "unapprovedUser";
    }

    // ✅ 3. Check OTP
    if (user.otp === "N/A") {
      return res
        .status(410)
        .json({ message: "OTP expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ 4. Clear OTP
    user.otp = "N/A";
    await user.save();

    // ✅ 5. Approved User Case → issue token + roles
    if (isApproved) {
      const roles = await UserRoleAssignment.find({ user: user._id })
        .populate("apartment", "name")
        .populate("flat", "flatName blockName")
        .populate("role", "name slug");

      const selectedRole = roles[0];
      const selectedRoleId = selectedRole?._id;

      const token = jwt.sign(
        {
          id: user._id,
          userType: "user",
          selectedRoleId,
          apartmentId: selectedRole?.apartment?._id,
          flatId: selectedRole?.flat?._id || null,
          roleSlug: selectedRole?.role?.slug,
          roleName: selectedRole?.role?.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.status(200).json({
        message: "OTP login successful",
        token,
        userDetails: {
          _id: user._id,
          name: user.name,
          email: user.email,
          contactNumber: user.contactNumber,
          roles: roles.map((r) => ({
            _id: r._id,
            roleId: r.role?._id,
            role: r.role?.name,
            slug: r.role?.slug,
            apartmentId: r.apartment?._id,
            apartmentName: r.apartment?.name,
            flatId: r.flat?._id,
            flatName: r.flat?.flatName,
            blockName: r.flat?.blockName,
          })),
        },
      });
    }

    // ✅ 6. Unapproved User → Generate limited token
    const token = jwt.sign(
      {
        id: user._id,
        userType: "unapprovedUser",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // short token for unapproved access
    );

    return res.status(200).json({
      message: "OTP verified! Awaiting approval.",
      token,
      userDetails: {
        _id: user._id,
        name: user.name,
        email: user.email,
        contactNumber: user.contactNumber,
        isApproved: false,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// exports.verifyOtpLoginController = async (req, res) => {
//   const { identifier, otp } = req.body;

//   if (!identifier || !otp) {
//     return res
//       .status(400)
//       .json({ message: "Phone/Email and OTP are required" });
//   }

//   const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
//   const query = isEmail ? { email: identifier } : { contactNumber: identifier };

//   try {
//     const user = await User.findOne(query);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.otp === "N/A") {
//       return res
//         .status(410)
//         .json({ message: "OTP expired. Please request a new one." });
//     }

//     if (user.otp !== otp) {
//       return res.status(401).json({ message: "Invalid OTP" });
//     }

//     // ✅ Clear OTP
//     user.otp = "N/A";
//     await user.save();

//     const roles = await UserRoleAssignment.find({ user: user._id })
//       .populate("apartment", "name")
//       .populate("flat", "flatName blockName")
//       .populate("role", "name slug");

//     const selectedRole = roles[0];
//     const selectedRoleId = selectedRole?._id;

//     const token = jwt.sign(
//       {
//         id: user._id,
//         userType: "user",
//         selectedRoleId,
//         apartmentId: selectedRole?.apartment?._id,
//         flatId: selectedRole?.flat?._id || null,
//         roleSlug: selectedRole?.role?.slug,
//         roleName: selectedRole?.role?.name,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     return res.status(200).json({
//       message: "OTP login successful",
//       token,
//       userDetails: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         contactNumber: user.contactNumber,
//         roles: roles.map((r) => ({
//           _id: r._id, // ✅ ADD THIS — unique ID for the user-role assignment
//           roleId: r.role?._id,
//           role: r.role?.name,
//           slug: r.role?.slug,
//           apartmentId: r.apartment?._id,
//           apartmentName: r.apartment?.name,
//           flatId: r.flat?._id,
//           flatName: r.flat?.flatName,
//           blockName: r.flat?.blockName,
//         })),
//       },
//     });
//   } catch (error) {
//     console.error("OTP verification error:", error);
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all role assignments for this user
    const roles = await UserRoleAssignment.find({ user: id })
      .populate("apartment", "name")
      .populate("flat", "flatName blockName")
      .populate("role", "name slug");

    res.status(200).json({
      user,
      roles,
    });
  } catch (error) {
    console.error("Get User by ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
