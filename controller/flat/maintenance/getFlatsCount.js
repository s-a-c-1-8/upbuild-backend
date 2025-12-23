const Flat = require("../../../model/flat/flatModel");

exports.getFlatsByApartmentIdForMaintenance = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required.",
      });
    }

    const flats = await Flat.find({ apartmentId }).select(
      "_id flatName blockName squareFootage"
    );

    const mappedFlats = flats.map((flat) => ({
      _id: flat._id,
      flatNumber: `${flat.flatName}${flat.blockName ? "-" + flat.blockName : ""}`,
      areaSqFt: parseFloat(flat.squareFootage || "0"),
    }));

    res.status(200).json({
      success: true,
      count: mappedFlats.length,
      data: mappedFlats,
    });
  } catch (error) {
    console.error("❌ Error fetching flats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching flats.",
    });
  }
};
