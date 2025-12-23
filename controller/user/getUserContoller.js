const User = require("../../model/user/userModel");
const ApartmentRole = require("../../model/apartment/apartmentRole");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");


exports.getAllUsers = async (req, res) => {
  try {
    const apartmentId = req.query.apartmentId || req.auth?.apartmentId || null;
    const match = apartmentId ? { apartment: apartmentId } : {};

    const assignments = await UserRoleAssignment.find(match)
      .populate("user", "name contactNumber email createdAt")
      .populate("role", "name slug")
      .populate("apartment", "name apartmentId")
      .sort({ createdAt: -1 });

    const userMap = new Map();
    for (const assign of assignments) {
      if (!assign.user) continue; // guard
      const userId = String(assign.user._id);
      if (!userMap.has(userId)) {
        userMap.set(userId, { ...assign.user.toObject(), roles: [] });
      }
      userMap.get(userId).roles.push({
        role: assign.role,
        apartment: assign.apartment,
        flat: assign.flat || null,
        active: assign.active,
        startDate: assign.startDate,
        endDate: assign.endDate,
      });
    }
    return res.status(200).json(Array.from(userMap.values()));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStaffUsers = async (req, res) => {
  try {
    const apartmentId =
      req.query.apartmentId || req.auth?.apartmentId || null;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    // 1️⃣ Get ONLY staff roles for this apartment
    const staffRoles = await ApartmentRole.find({
      apartment: apartmentId,
      group: "Staff",
    })
      .select("_id name slug")
      .lean();

    if (!staffRoles.length) {
      return res.status(200).json([]);
    }

    const staffRoleIds = staffRoles.map((r) => String(r._id));

    // 2️⃣ Get all assignments for this apartment
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: { $in: staffRoleIds },   // ✔ only staff roles
      active: true,
    })
      .populate("user", "name contactNumber email status image")
      .populate("role", "name slug group")
      .populate("apartment", "name apartmentId")
      .populate("flat", "flatNumber block")
      .populate("agency", "agencyName")
      .sort({ createdAt: -1 })
      .lean();

    // 3️⃣ Group by user (same user may have multiple staff roles)
    const userMap = new Map();

    for (const a of assignments) {
      if (!a.user || !a.role) continue;

      const userId = String(a.user._id);

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          ...a.user,
          roles: [],
          flats: [],
          apartments: [],
          agencies: [],
        });
      }

      const entry = userMap.get(userId);
      entry.roles.push(a.role);
      if (a.flat) entry.flats.push(a.flat);
      if (a.apartment) entry.apartments.push(a.apartment);
      if (a.agency) entry.agencies.push(a.agency);
    }

    // 4️⃣ Convert map → array
    const result = Array.from(userMap.values());

    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ Error fetching staff users:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSubAdminApartment = async (req, res) => {
  try {
    const apartmentId = req.query.apartmentId || req.auth?.apartmentId || null;

    const roleQuery = apartmentId
      ? { slug: "apartment-sub-admin", apartment: apartmentId }
      : { slug: "apartment-sub-admin" };

    const subAdminRole = await ApartmentRole.findOne(roleQuery).select("_id name").lean();
    if (!subAdminRole) return res.status(200).json([]);

    const assignmentMatch = apartmentId ? { role: subAdminRole._id, apartment: apartmentId }
                                        : { role: subAdminRole._id };

    const assignments = await UserRoleAssignment.find(assignmentMatch)
      .populate("user", "name contactNumber email")
      .populate("apartment", "name apartmentId")
      .populate("role", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    const users = assignments
      .filter(a => a && a.user && a.apartment && a.role)
      .map(a => ({ user: a.user, apartment: a.apartment, role: a.role }));

    return res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching sub-admins:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
