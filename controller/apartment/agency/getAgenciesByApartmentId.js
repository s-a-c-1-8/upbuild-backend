const Agency = require("../../../model/flat/agency");

exports.getAgenciesByApartmentId = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    const agencies = await Agency.find({ apartmentId }).sort({ createdAt: -1 });

    res.status(200).json({ agencies });
  } catch (err) {
    console.error("❌ Failed to fetch agencies:", err);
    res.status(500).json({ message: "Failed to fetch agencies." });
  }
};
