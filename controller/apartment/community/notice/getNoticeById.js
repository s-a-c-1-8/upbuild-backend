const CommunityNotice = require("../../../../model/apartment/communityNotice");
const moment = require("moment-timezone");

exports.getNoticeById = async (req, res) => {
  try {
    const auth = req.auth || {};
    const apartmentId = auth.apartmentId;
    const userGroup = req.activeRole?.role?.group;

    const noticeId = req.params.id;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment not found for this role" });
    }

    if (!userGroup) {
      return res.status(400).json({ message: "User group not assigned to role" });
    }

    if (!noticeId) {
      return res.status(400).json({ message: "Notice ID is required" });
    }

    /* -----------------------------
       FETCH NOTICE WITH RELATIONS
    ----------------------------- */
    const notice = await CommunityNotice.findOne({
      _id: noticeId,
      apartment: apartmentId,
      groups: userGroup, // group based access
    })
      .populate({
        path: "createdBy",
        populate: [
          { path: "user", select: "name email contactNumber image" },
          { path: "role", select: "name group" },
          { path: "flat", select: "flatName blockName" },
        ],
      })
      .lean();

    if (!notice) {
      return res.status(404).json({ message: "Notice not found or not accessible" });
    }

    /* -----------------------------
           FORMAT RESPONSE
    ----------------------------- */
    notice.createdAtFormatted = moment(notice.createdAt)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD hh:mm A");

    return res.status(200).json({
      success: true,
      notice,
    });

  } catch (err) {
    console.error("❌ Error fetching single notice:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
