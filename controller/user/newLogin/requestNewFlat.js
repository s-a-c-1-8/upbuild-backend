const Apartment = require("../../../model/apartment/apartmentModel");
const notifyApartmentAdmins = require("../../../utils/notifyApartmentAdmin");

exports.requestNewFlat = async (req, res) => {
  try {
    const { apartmentId, name, contactNumber, blockName, flatName } = req.body;
    const userId = req.user?._id; // from auth middleware

    if (!apartmentId || !name || !contactNumber || !blockName || !flatName) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID, Name, Contact Number, Block and Flat are required",
      });
    }

    // ✅ Validate apartment exists
    const apartment = await Apartment.findById(apartmentId).select("name");
    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found",
      });
    }

    // 🔔 Notify apartment admins
    await notifyApartmentAdmins({
      apartmentId,
      message: `${name} (${contactNumber}) has requested admin to add a new flat: Block ${blockName}, Flat ${flatName} in apartment "${apartment.name}".`,
      logId: userId || null,
      logModel: "UnapprovedUser",
      link: null,
    });

    return res.status(200).json({
      success: true,
      message: "Request has been sent to apartment admins.",
    });
  } catch (error) {
    console.error("❌ Error in requestNewFlat:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};
