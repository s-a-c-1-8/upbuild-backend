const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../model/apartment/apartmentrole");

exports.getComplaintAssignees = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    // Step 1: Get role IDs with matching slugs
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      slug: { $in: ["security", "house-keeping", "apartment-sub-admin"] },
      status: "Active",
    });

    const roleIds = roles.map((r) => r._id);

    // Step 2: Get user-role assignments
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: { $in: roleIds },
      active: true,
    })
      .populate("user", "name phone")
      .populate("role", "name");

    // Step 3: Format response to include only necessary fields
    const formatted = assignments.map((a) => ({
      _id: a._id,
      user: {
        name: a.user?.name || "",
        phone: a.user?.phone || "",
      },
      role: {
        name: a.role?.name || "",
      },
    }));

    return res.status(200).json({
      message: "Assignee list fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching assignees:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
