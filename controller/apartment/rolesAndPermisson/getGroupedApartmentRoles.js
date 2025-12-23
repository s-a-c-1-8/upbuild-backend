const ApartmentRole = require("../../../model/apartment/apartmentrole");

const getApartmentRoleGroups = async (req, res) => {
  const { apartmentId } = req.params;

  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    // Get distinct group names from roles of this apartment
    const groups = await ApartmentRole.distinct("group", {
      apartment: apartmentId,
    });

    return res.status(200).json(groups);
  } catch (err) {
    console.error("Error fetching role groups:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getApartmentRoleGroups };
