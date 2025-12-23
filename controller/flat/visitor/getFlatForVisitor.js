const Flat = require("../../../model/flat/flatModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");

exports.getFlatsByApartmentIdForVisitor = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { search = "", occupied, page = 1, limit = 10 } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    const query = { apartmentId };
    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    // 🔒 Restrict occupants to their own flat
    if (selectedRoleId && flatIdFromToken) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");
      const roleSlug = roleAssignment?.role?.slug;

      if (roleSlug === "occupants") {
        query._id = flatIdFromToken;
      }
    }

    const searchString = search.trim();
    const skip = (page - 1) * limit;
    // 🔍 Search user-role assignments for matching user names, emails, or phones
    let flatIdsFromNameMatch = [];
    if (searchString !== "") {
      const regex = new RegExp(searchString, "i");

      const matchedAssignments = await UserRoleAssignment.find({ apartment: apartmentId })
        .populate({
          path: "user",
          match: {
            $or: [{ name: regex }, { email: regex }, { contactNumber: regex }],
          },
        })
        .lean();

      flatIdsFromNameMatch = matchedAssignments
        .filter((a) => a.user !== null)
        .map((a) => a.flat.toString());
    }

    // 📦 Add search filters
    if (searchString !== "") {
      const regex = new RegExp(searchString, "i");
      const searchParts = searchString.split("-");

      query.$or = [
        { flatName: regex },
        { blockName: regex },
        { fullAddress: regex },
        { _id: { $in: flatIdsFromNameMatch } },
      ];

      if (searchParts.length === 2) {
        query.$or.push({
          $expr: {
            $regexMatch: {
              input: { $concat: ["$flatName", "-", "$blockName"] },
              regex: searchString,
              options: "i",
            },
          },
        });
      }
    }

    // 🏘️ Occupied filter
    if (occupied === true) {
      query.apartmentStatus = "occupied";
    } else if (occupied === false) {
      query.apartmentStatus = { $ne: "occupied" };
    }

    // 🔄 Fetch flats and enrich
    const [flats, totalCount] = await Promise.all([
      Flat.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Flat.countDocuments(query),
    ]);

    const flatIds = flats.map((f) => f._id);

    const roleAssignments = await UserRoleAssignment.find({
      flat: { $in: flatIds },
      apartment: apartmentId,
    })
      .populate("user")
      .populate("role")
      .lean();

    const groupedAssignments = {};
    for (const assign of roleAssignments) {
      const flatId = assign.flat.toString();
      if (!groupedAssignments[flatId]) groupedAssignments[flatId] = [];
      groupedAssignments[flatId].push(assign);
    }

    const enrichedFlats = flats.map((flat) => {
      const assignments = groupedAssignments[flat._id.toString()] || [];

      const owner = assignments.find((a) => a.relationshipType === "owner");
      const tenant = assignments.find((a) => a.relationshipType === "tenant");

      const ownerOccupants = assignments.filter((a) => a.relationshipType === "owner_occupant");
      const tenantOccupants = assignments.filter((a) => a.relationshipType === "tenant_occupant");

      return {
        ...flat,
        ownerName: owner?.user?.name || null,
        ownerPhoneNumber: owner?.user?.contactNumber || null,
        ownerEmail: owner?.user?.email || null,
        tenantDetails:
          !flat.ownerStaying && tenant
            ? {
                tenantName: tenant.user.name,
                tenantPhoneNumber: tenant.user.contactNumber,
                tenantEmail: tenant.user.email,
                occupants: tenantOccupants.map((o) => ({
                  name: o.user.name,
                  phoneNumber: o.user.contactNumber,
                })),
              }
            : undefined,
        occupantsData:
          flat.ownerStaying && ownerOccupants.length
            ? ownerOccupants.map((o) => ({
                name: o.user.name,
                phoneNumber: o.user.contactNumber,
              }))
            : [],
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      message: "Flats fetched successfully",
      flats: enrichedFlats,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("❌ Error fetching flats:", error);
    res.status(500).json({
      message: "Failed to fetch flats",
      error: error.message,
    });
  }
};
