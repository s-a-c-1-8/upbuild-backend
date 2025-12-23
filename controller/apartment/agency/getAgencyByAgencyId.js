
const Agency = require("../../../model/flat/agency");

exports.getAgencyById = async (req, res) => {
  try {
    const { id } = req.params;

    const agency = await Agency.findById(id);

    if (!agency) {
      return res.status(404).json({ message: "Agency not found." });
    }

    res.status(200).json({ agency });
  } catch (err) {
    console.error("❌ Failed to fetch agency:", err);
    res.status(500).json({ message: "Failed to fetch agency." });
  }
};
