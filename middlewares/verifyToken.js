const jwt = require("jsonwebtoken");
const SuperAdmin = require("../model/superAdmin/superAdmin");
const SubAdmin = require("../model/subAdmin/subAdmin");
const User = require("../model/user/userModel");
const UserRoleAssignment = require("../model/user/userRoleAssignment");
const UnapprovedUser = require("../model/user/unapprovedUser"); // ✅ ADD THIS LINE

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    switch (decoded.userType) {
      case "superAdmin": {
        const user = await SuperAdmin.findById(decoded.id);
        if (!user)
          return res.status(401).json({ message: "Invalid superadmin" });
        req.superAdmin = user;
        req.userRole = "superAdmin";
        break;
      }

      case "subAdmin": {
        const user = await SubAdmin.findById(decoded.id);
        if (!user) return res.status(401).json({ message: "Invalid subadmin" });
        req.subAdmin = user;
        req.userRole = "subAdmin";
        break;
      }

      case "user": {
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: "Invalid user" });

        req.user = user;
        req.userRole = "user";

        if (decoded.selectedRoleId) {
          const assignment = await UserRoleAssignment.findById(
            decoded.selectedRoleId
          )
            .populate("apartment", "name")
            .populate("flat", "flatName blockName")
            .populate("role", "name slug group"); // 👈 ADD THIS

          if (
            !assignment ||
            assignment.user.toString() !== user._id.toString()
          ) {
            return res.status(403).json({ message: "Invalid role access" });
          }

          req.activeRole = assignment;
          req.auth = {
            selectedRoleId: decoded.selectedRoleId,
            apartmentId: decoded.apartmentId || null,
            flatId: decoded.flatId || null,
          };
        } else {
          req.activeRole = null;
        }

        break;
      }

      case "unapprovedUser": {
        const user = await UnapprovedUser.findById(decoded.id);
        if (!user) {
          return res.status(401).json({ message: "Invalid unapproved user" });
        }

        req.user = user;
        req.userRole = "unapprovedUser";

        // ✅ Let unapproved users continue normally
        break;
      }

      default:
        return res.status(403).json({ message: "Unknown user type" });
    }

    // console.log("🔐 Access Log:", {
    //   userType: decoded.userType,
    //   id: decoded.id,
    //   selectedRoleId: decoded.selectedRoleId || null,
    //   roleTitle: req.activeRole?.role?.name || null,
    //   apartmentId: decoded.apartmentId || null,
    //   apartmentName: req.activeRole?.apartment?.name || null,
    //   flatId: decoded.flatId || null,
    //   flatLabel: req.activeRole?.flat
    //     ? `${req.activeRole.flat.flatName} - ${req.activeRole.flat.blockName}`
    //     : null,
    //   name:
    //     req.superAdmin?.name ||
    //     req.subAdmin?.name ||
    //     req.user?.name ||
    //     "Unknown",
    //   email:
    //     req.superAdmin?.email ||
    //     req.subAdmin?.email ||
    //     req.user?.email ||
    //     "Unknown",
    // });

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
