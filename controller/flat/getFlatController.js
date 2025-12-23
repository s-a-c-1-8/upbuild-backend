const Flat = require("../../model/flat/flatModel");
const User = require("../../model/user/userModel");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const ApartmentRole = require("../../model/apartment/apartmentRole");

// GET FLATS BY APARTMENT ID
// exports.getFlatsByApartmentId = async (req, res) => {
//   console.log("req body", req.body);
//   try {
//     const { apartmentId } = req.params;
//     const { search = "", occupied, page = 1, limit = 10 } = req.body;

//     if (!apartmentId) {
//       return res.status(400).json({ message: "Apartment ID is required." });
//     }

//     const query = { apartmentId };
//     const searchString = search.trim();
//     const skip = (page - 1) * limit;

//     // 👇 Name-based flat matching (owner/tenant/occupants)
//     let flatIdsFromNameMatch = [];
//     if (searchString !== "") {
//       const regex = new RegExp(searchString, "i");

//       // Find role assignments matching the search string in name/email/phone
//       const matchedAssignments = await UserRoleAssignment.find({
//         apartment: apartmentId,
//       })
//         .populate({
//           path: "user",
//           match: {
//             $or: [
//               { name: regex },
//               { email: regex },
//               { contactNumber: regex },
//             ],
//           },
//         })
//         .lean();

//       // Extract flat IDs from valid matches
//       flatIdsFromNameMatch = matchedAssignments
//         .filter((a) => a.user !== null)
//         .map((a) => a.flat.toString());
//     }

//     // 🧠 Flat + block + full address + flatName-blockName
//     if (searchString !== "") {
//       const regex = new RegExp(searchString, "i");
//       const searchParts = searchString.split("-");

//       query.$or = [
//         { flatName: regex },
//         { blockName: regex },
//         { fullAddress: regex },
//         { _id: { $in: flatIdsFromNameMatch } }, // 👈 Include name-based matching
//       ];

//       if (searchParts.length === 2) {
//         query.$or.push({
//           $expr: {
//             $regexMatch: {
//               input: { $concat: ["$flatName", "-", "$blockName"] },
//               regex: searchString,
//               options: "i",
//             },
//           },
//         });
//       }
//     }

//     // Occupied status
//     if (occupied === true) {
//       query.apartmentStatus = "occupied";
//     } else if (occupied === false) {
//       query.apartmentStatus = { $ne: "occupied" };
//     }

//     // Flats + Count
//     const [flats, totalCount] = await Promise.all([
//       Flat.find(query)
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Flat.countDocuments(query),
//     ]);

//     const flatIds = flats.map((f) => f._id);

//     const roleAssignments = await UserRoleAssignment.find({
//       flat: { $in: flatIds },
//       apartment: apartmentId,
//     })
//       .populate("user")
//       .populate("role")
//       .lean();

//     const groupedAssignments = {};
//     for (const assign of roleAssignments) {
//       const flatId = assign.flat.toString();
//       if (!groupedAssignments[flatId]) groupedAssignments[flatId] = [];
//       groupedAssignments[flatId].push(assign);
//     }

//     const enrichedFlats = flats.map((flat) => {
//       const assignments = groupedAssignments[flat._id.toString()] || [];

//       const owner = assignments.find((a) => a.relationshipType === "owner");
//       const tenant = assignments.find((a) => a.relationshipType === "tenant");

//       const ownerOccupants = assignments.filter(
//         (a) => a.relationshipType === "owner_occupant"
//       );
//       const tenantOccupants = assignments.filter(
//         (a) => a.relationshipType === "tenant_occupant"
//       );

//       return {
//         ...flat,
//         ownerName: owner?.user?.name || null,
//         ownerPhoneNumber: owner?.user?.contactNumber || null,
//         ownerEmail: owner?.user?.email || null,

//         tenantDetails:
//           !flat.ownerStaying && tenant
//             ? {
//                 tenantName: tenant.user.name,
//                 tenantPhoneNumber: tenant.user.contactNumber,
//                 tenantEmail: tenant.user.email,
//                 occupants: tenantOccupants.map((o) => ({
//                   name: o.user.name,
//                   phoneNumber: o.user.contactNumber,
//                 })),
//               }
//             : undefined,

//         occupantsData:
//           flat.ownerStaying && ownerOccupants.length
//             ? ownerOccupants.map((o) => ({
//                 name: o.user.name,
//                 phoneNumber: o.user.contactNumber,
//               }))
//             : [],
//       };
//     });

//     const totalPages = Math.ceil(totalCount / limit);

//     res.status(200).json({
//       message: "Flats fetched successfully",
//       flats: enrichedFlats,
//       totalPages,
//       currentPage: page,
//       totalCount,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching flats:", error);
//     res.status(500).json({
//       message: "Failed to fetch flats",
//       error: error.message,
//     });
//   }
// };


//udpated based on role

exports.getFlatsByApartmentId = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { search = "", occupied, page = 1, limit = 10 } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    // 🔐 Role check and permission logic
    let roleSlug = "";
    let hasPermission = false;

    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");

      if (!roleAssignment || !roleAssignment.role) {
        return res.status(403).json({ message: "Access denied: invalid role." });
      }

      roleSlug = roleAssignment.role.slug;

      if (
        roleSlug === "apartment-admin" ||
        roleSlug === "occupants"
      ) {
        hasPermission = true;
      } else {
        const fullRole = await ApartmentRole.findById(roleAssignment.role._id).populate({
          path: "permissions",
          match: { status: "Active" },
          select: "name",
        });

        const permissionNames = fullRole.permissions.map((perm) => perm.name);
        hasPermission = permissionNames.includes("can_view_flats_page_with_all_data");
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to view flats.",
      });
    }

    // 🧠 Build base query
    const query = { apartmentId };
    const searchString = search.trim();
    const skip = (page - 1) * limit;

    // 🔍 Name-based search (from user role assignments)
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

    // 🔒 Restrict occupant to their own flat
    if (roleSlug === "occupants" && flatIdFromToken) {
      query._id = flatIdFromToken;
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


// GET FLAT BY ID
exports.getFlatById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Flat ID is required." });
    }

    const flat = await Flat.findById(id).lean();
    if (!flat) {
      return res.status(404).json({ message: "Flat not found." });
    }

    // 🛡️ Role-based access logic
    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    let roleSlug = "";
    let hasPermission = false;

    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");

      if (!roleAssignment || !roleAssignment.role) {
        return res.status(403).json({ message: "Access denied: invalid role." });
      }

      roleSlug = roleAssignment.role.slug;

      if (
        roleSlug === "apartment-admin"
      ) {
        hasPermission = true;
      } else if (roleSlug === "occupants") {
        // Only allow access to their own flat
        if (flatIdFromToken && flat._id.toString() === flatIdFromToken.toString()) {
          hasPermission = true;
        }
      } else {
        const fullRole = await ApartmentRole.findById(roleAssignment.role._id).populate({
          path: "permissions",
          match: { status: "Active" },
          select: "name",
        });

        const permissionNames = fullRole.permissions.map((perm) => perm.name);
        hasPermission = permissionNames.includes("can_view_individual_flats_information");
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to view this flat.",
      });
    }

    // 🔍 Fetch user role assignments for this flat
    const roleAssignments = await UserRoleAssignment.find({
      flat: flat._id,
      apartment: flat.apartmentId,
    })
      .populate("user")
      .populate("role")
      .lean();

    const owner = roleAssignments.find((a) => a.relationshipType === "owner");
    const tenant = roleAssignments.find((a) => a.relationshipType === "tenant");

    const ownerOccupants = roleAssignments.filter(
      (a) => a.relationshipType === "owner_occupant"
    );
    const tenantOccupants = roleAssignments.filter(
      (a) => a.relationshipType === "tenant_occupant"
    );

    const flatDetails = {
      flatData: {
        flatNumber: flat.flatName,
        flatType: flat.flatType,
        blockName: flat.blockName,
        apartmentStatus: flat.apartmentStatus,
        facing: flat.facing,
        squareFootage: flat.squareFootage,
        powerMeter: flat.powerMeterNumber,
        waterMeter: flat.stpMeterNumber,
        additionalDetails: flat.additionalDetails,
      },
      addressData: {
        fullAddress: flat.fullAddress,
        city: flat.city,
        state: flat.state,
        landmark: flat.landmark,
      },
      ownerData: owner
        ? {
            ownerName: owner.user.name,
            age: owner.user.age || "",
            gender: owner.user.gender || "",
            contactNumber: owner.user.contactNumber,
            email: owner.user.email || "",
          }
        : {},
      occupants: flat.ownerStaying
        ? ownerOccupants.map((o) => ({
            name: o.user.name,
            phoneNumber: o.user.contactNumber,
          }))
        : [],
      tenantData:
        !flat.ownerStaying && tenant
          ? {
              name: tenant.user.name,
              phoneNumber: tenant.user.contactNumber,
              email: tenant.user.email || "",
              active: tenant.active ?? false,
              startDate: tenant.startDate,
              endDate: tenant.endDate,
              agreementFile: tenant.agreementFile || "",
              occupants: tenantOccupants.map((o) => ({
                name: o.user.name,
                phoneNumber: o.user.contactNumber,
              })),
            }
          : null,

      saleDeedFile: flat.saleDeedFile || "",
      parkingFiles: flat.parkingFiles || [],
    };

    return res.status(200).json(flatDetails);
  } catch (error) {
    console.error("❌ Error fetching flat:", error);
    return res.status(500).json({ message: "Failed to fetch flat", error: error.message });
  }
};

