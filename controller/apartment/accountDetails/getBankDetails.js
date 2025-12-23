const BankDetails = require("../../../model/apartment/bankDetailsModel");

const getBankDetails = async (req, res) => {
  try {
    // const { apartment } = req.body;
    const apartment = req.auth?.apartmentId;

    if (!apartment) {
      return res.status(400).json({ message: "Apartment ID is required." });
    }

    const bankDetails = await BankDetails.find({ apartment }).sort({ createdAt: -1 });

    res.status(200).json({ bankDetails });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = getBankDetails;
