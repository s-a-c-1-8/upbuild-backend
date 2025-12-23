const BankDetails = require("../../../model/apartment/bankDetailsModel");
const Apartment = require("../../../model/apartment/apartmentModel");

const addBankDetails = async (req, res) => {
  try {
    const apartment = req.auth?.apartmentId;

    const { bankName, accountNumber, ifscCode, referenceName } = req.body;

    if (
      !apartment ||
      !bankName ||
      !accountNumber ||
      !ifscCode ||
      !referenceName
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if apartment exists
    const apartmentExists = await Apartment.findById(apartment);
    if (!apartmentExists) {
      return res.status(404).json({ message: "Apartment not found." });
    }

    // Check if reference name already exists for the apartment
    const existing = await BankDetails.findOne({ apartment, referenceName });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Reference name must be unique." });
    }

    // Save bank details
    const newBankDetails = new BankDetails({
      apartment,
      bankName,
      accountNumber,
      ifscCode,
      referenceName,
    });

    await newBankDetails.save();

    res.status(201).json({
      message: "Bank details added successfully.",
      bankDetails: newBankDetails,
    });
  } catch (err) {
    console.error("Error adding bank details:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = addBankDetails;
