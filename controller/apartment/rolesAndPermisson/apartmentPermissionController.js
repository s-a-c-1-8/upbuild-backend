// const ApartmentPermission = require("../../model/apartment/apartmentPermission");

// exports.addApartmentPermission = async (req, res) => {
//   try {
//     const { name, description, status, apartment, group } = req.body;

//     if (!name || !apartment || !group) {
//       return res.status(400).json({
//         message: "Permission name, group, and apartment ID are required",
//       });
//     }

//     const exists = await ApartmentPermission.findOne({ name, apartment });
//     if (exists) {
//       return res.status(400).json({
//         message: "Permission already exists for this apartment",
//       });
//     }

//     const permission = await ApartmentPermission.create({
//       name,
//       description,
//       status,
//       apartment,
//       group, // ✅ new
//     });

//     res.status(201).json(permission);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// exports.getAllApartmentPermissions = async (req, res) => {
//   try {
//     const { apartmentId } = req.params;

//     if (!apartmentId) {
//       return res.status(400).json({ message: "Apartment ID is required" });
//     }

//     const permissions = await ApartmentPermission.find({
//       apartment: apartmentId,
//     }).sort({ createdAt: 1 });

//     res.status(200).json(permissions);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

const Apartment = require("../../../model/apartment/apartmentModel");
const ApartmentPermission = require("../../../model/apartment/apartmentPermission");

// Add a new permission
exports.addApartmentPermission = async (req, res) => {
  try {
    const { name, description, status, group } = req.body;

    if (!name || !group) {
      return res.status(400).json({
        message: "Permission name and group are required",
      });
    }

    const exists = await ApartmentPermission.findOne({ name });
    if (exists) {
      return res.status(400).json({
        message: "Permission already exists",
      });
    }

    const permission = await ApartmentPermission.create({
      name,
      description,
      status,
      group,
    });

    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all permissions
exports.getAllApartmentPermissions = async (req, res) => {
  try {
    const permissions = await ApartmentPermission.find().sort({
      group: 1, // ⭐ alphabetical by group
      createdAt: -1, // ⭐ newest first inside each group
    });

    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllApartmentPermissionsBasedOnApartment = async (req, res) => {
  try {
    const apartmentId =
      req?.activeRole?.apartment?._id?.toString() ||
      req?.auth?.apartmentId ||
      null;

    if (!apartmentId) {
      return res.status(400).json({
        message: "apartmentId required",
      });
    }

    // Load apartment plan snapshot
    const apt = await Apartment.findById(apartmentId)
      .select("planSnapshot")
      .lean();

    if (!apt || !apt.planSnapshot) {
      return res.status(404).json({
        message: "Plan snapshot not found for this apartment",
      });
    }

    const allowedFeatures = (apt.planSnapshot.settings || [])
      .filter((s) => s.status === "Active")
      .map((s) => s.type);

    // Load all permissions
    // Load all permissions
    const allPermissions = await ApartmentPermission.find().sort({
      group: 1, // ⭐ SORT BY GROUP ALPHABETICALLY
      createdAt: -1, // ⭐ newest first inside each group
    });
    // Map groups to their controlling plan feature
    const groupToFeatureMap = {
      Maintenance: "Maintenance",
      Expense: "Maintenance", // Expense belongs under Maintenance Feature
      Visitors: "Visitors",
      Complaints: "Complaints",
      Amenities: "Amenities",
    };

    // Filter permissions based on feature eligibility
    const filtered = allPermissions.filter((perm) => {
      const controllingFeature = groupToFeatureMap[perm.group];

      // If group has NO controlling feature → always show
      if (!controllingFeature) return true;

      // Show only if the apartment's plan includes that feature
      return allowedFeatures.includes(controllingFeature);
    });

    return res.status(200).json(filtered);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
