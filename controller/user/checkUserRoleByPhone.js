const User = require("../../model/user/userModel");
const ApartmentRole = require("../../model/apartment/apartmentrole");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");

exports.checkUserByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    // Step 1: Find user by contact number
    const user = await User.findOne({ contactNumber: phone });
    if (!user) return res.status(200).json({ exists: false });

    // Step 2: Get all role assignments for this user
    const roleAssignments = await UserRoleAssignment.find({ user: user._id })
      .populate("role")
      .populate("apartment")
      .populate("flat")
      .lean();

    const roles = roleAssignments.map((r) => ({
      role: {
        name: r.role?.name,
        slug: r.role?.slug,
      },
      relationshipType: r.relationshipType,
      apartment: {
        id: r.apartment?._id,
        name: r.apartment?.name || r.apartment?.apartmentName,
      },
      flat: {
        id: r.flat?._id,
        name: r.flat?.flatName,
        blockName: r.flat?.blockName,
      },
    }));

    return res.status(200).json({
      exists: true,
      user: {
        name: user.name,
        phone: user.contactNumber,
        roles,
      },
    });
  } catch (err) {
    console.error("Phone check failed:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
