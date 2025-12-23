// controllers/apartmentAdmin.controller.js

const ApartmentRole = require("../../../model/apartment/apartmentRole");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");

exports.getApartmentAdmins = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required",
      });
    }

    // 1️⃣ Get Apartment Admin role for this apartment
    const adminRole = await ApartmentRole.findOne({
      apartment: apartmentId,
      slug: "apartment-admin",
      status: "Active",
    });

    if (!adminRole) {
      return res.status(404).json({
        success: false,
        message: "Apartment Admin role not found",
      });
    }

    // 2️⃣ Get users assigned to this role
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: adminRole._id,
      active: true,
    })
      .populate("user", "name contactNumber email image status")
      .populate("flat", "flatNumber");

    // 3️⃣ Extract only user data
    const admins = assignments.map((a) => ({
      assignmentId: a._id,
      user: a.user,
      flat: a.flat || null,
      startDate: a.startDate,
    }));

    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("❌ getApartmentAdmins error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
