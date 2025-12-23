// controllers/apartment.controller.js
const Apartment = require("../../model/apartment/apartmentModel");

exports.getAllApartments = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};
    // 🔍 Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "adminUser.name": { $regex: search, $options: "i" } },
      ];
    }

    // 🟡 Status filter
    if (status === "Approved") {
      query.approved = true;
    } else if (status === "Pending") {
      query.approved = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // ✅ Total counts (not just current page)
    const totalCount = await Apartment.countDocuments({});
    const approvedCount = await Apartment.countDocuments({ approved: true });
    const pendingCount = await Apartment.countDocuments({ approved: false });

    // ✅ Paginated query
    const apartments = await Apartment.find(query)
      // .populate("planId")
      .populate("propertyType")
      .populate("amenities")
      .populate("adminUser", "name email contactNumber role") // exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: apartments,
      totalCount,
      approvedCount,
      pendingCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
      currentPage: Number(page),
      pageSize: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching apartments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch apartments",
      error: error.message,
    });
  }
};


exports.getApartmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const apartment = await Apartment.findById(id)
      .populate("builder", "name") // populate builder name
      // .populate("planId", "planName tier") // only include relevant fields
      .populate("propertyType", "name")
      .populate("amenities", "name")
      .populate(
        "adminUser",
        "name email contactNumber isEmailVerified isMobileVerified"
      );

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    res.status(200).json(apartment);
  } catch (error) {
    console.error("Error fetching apartment:", error);
    res.status(500).json({
      message: "Failed to fetch apartment",
      error: error.message || error,
    });
  }
};
