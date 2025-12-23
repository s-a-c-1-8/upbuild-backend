const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const Role = require("../../../model/apartment/apartmentRole");
const User = require("../../../model/user/userModel");

exports.getOccupantsUsers = async (req, res) => {
  try {
    const apartmentId =
      req.params.apartmentId || req.query.apartmentId || req?.auth?.apartmentId;

    if (!apartmentId) {
      return res.status(400).json({
        message: "Apartment ID is required",
      });
    }

    const search = req.query.search?.trim() || "";

    // 1️⃣ Find "Occupants" role
    const occupantsRole = await Role.findOne({ name: "Occupants" }).lean();

    if (!occupantsRole) {
      return res.status(404).json({
        message: "Global Occupants role not found",
      });
    }

    // 2️⃣ Get user assignments
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: occupantsRole._id,
      active: true,
    })
      .populate("user", "name contactNumber email image status")
      .populate("flat", "flatName blockName")
      .lean();

    // 3️⃣ Build user list
    let users = assignments.map((item) => {
      const flatName = item.flat?.flatName || "";
      const blockName = item.flat?.blockName || "";

      return {
        ...item.user,
        flat: item.flat || null,
        fullFlat: flatName && blockName ? `${flatName}-${blockName}` : flatName,
      };
    });

    // 4️⃣ 🔍 Apply SEARCH FILTER
    if (search) {
      const s = search.toLowerCase();

      users = users.filter((u) => {
        const nameMatch = u.name?.toLowerCase().includes(s);
        const phoneMatch = u.contactNumber?.toLowerCase().includes(s);

        const flatName = u.flat?.flatName?.toLowerCase() || "";
        const blockName = u.flat?.blockName?.toLowerCase() || "";
        const fullFlat = u.fullFlat?.toLowerCase() || "";

        const flatNameMatch = flatName.includes(s);
        const blockNameMatch = blockName.includes(s);
        const fullFlatMatch = fullFlat.includes(s);

        return (
          nameMatch ||
          phoneMatch ||
          flatNameMatch ||
          blockNameMatch ||
          fullFlatMatch
        );
      });

      // Return only filtered data
      return res.status(200).json(users);
    }

    // 5️⃣ If no search, return all
    return res.status(200).json(users);

  } catch (error) {
    console.error("Error fetching occupants:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
