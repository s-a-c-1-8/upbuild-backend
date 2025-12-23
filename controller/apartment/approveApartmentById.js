const Apartment = require("../../model/apartment/apartmentModel");

const approveApartmentById = async (req, res) => {
  const { id } = req.params;
  const { approved, status } = req.body; // we receive approved + status

  try {
    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    // VALIDATIONS
    if (approved !== undefined && typeof approved !== "boolean") {
      return res.status(400).json({
        message: "Invalid 'approved' value. Must be true or false.",
      });
    }

    if (status !== undefined && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid 'status' value. Must be 'Active' or 'Inactive'.",
      });
    }

    // UPDATE ONLY THE FIELDS PASSED
    if (approved !== undefined) {
      apartment.approved = approved;
    }

    if (status !== undefined) {
      apartment.status = status;
    }

    await apartment.save();

    res.status(200).json({
      message: "Apartment approval/status updated successfully",
      approved: apartment.approved,
      status: apartment.status,
    });
  } catch (error) {
    console.error("Error updating apartment:", error);
    res.status(500).json({
      message: "Error updating apartment",
      error: error.message || error,
    });
  }
};

module.exports = approveApartmentById;
