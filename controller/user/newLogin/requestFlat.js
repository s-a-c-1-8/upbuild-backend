const User = require("../../../model/user/unapprovedUser");
const Apartment = require("../../../model/apartment/apartmentModel");
const Flat = require("../../../model/flat/flatModel");
const { notifyHOFOccupants } = require("../../../utils/notifyHOFOccupants");

exports.confirmJoinFlat = async (req, res) => {
  try {
    const { apartmentId, flatId, name, contactNumber } = req.body;
    const userId = req.user?._id; // from auth middleware

    if (!apartmentId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID and Flat ID are required",
      });
    }

    if (!name || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and Contact Number are required",
      });
    }

    // ✅ Validate apartment exists
    const apartment = await Apartment.findById(apartmentId).select("name");
    if (!apartment) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found" });
    }

    // ✅ Validate flat exists
    const flat = await Flat.findById(flatId).select("blockName flatName");
    if (!flat) {
      return res
        .status(404)
        .json({ success: false, message: "Flat not found" });
    }

    // ✅ Fetch and update unapproved user with name + flat
    const unapprovedUser = await User.findOneAndUpdate(
      { contactNumber },
      { $set: { name, flat: flatId } },
      { new: true }
    ).select("_id name contactNumber flat");

    if (!unapprovedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Unapproved user not found" });
    }

    // 🔔 Notify HOF occupants of this flat
    await notifyHOFOccupants({
      apartmentId,
      flatId,
      message: `${name} (${contactNumber}) has requested to join Flat ${flat.blockName}-${flat.flatName} in apartment "${apartment.name}".`,
      logId: unapprovedUser._id,
      logModel: "UnapprovedUser",
      link: `/apartment/approve/${unapprovedUser._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Join request has been sent to HOF occupants of the flat.",
      unapprovedUserId: unapprovedUser._id,
      updatedUser: unapprovedUser,
    });
  } catch (error) {
    console.error("❌ Error in confirmJoinFlat:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
