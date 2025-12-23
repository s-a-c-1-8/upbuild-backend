const CommunityNotice = require("../../../../model/apartment/communityNotice");
const moment = require("moment-timezone");

exports.getNotices = async (req, res) => {
  try {
    const auth = req.auth || {};
    const apartmentId = auth.apartmentId;
    const userGroup = req.activeRole?.role?.group;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment not found for this role" });
    }

    if (!userGroup) {
      return res.status(400).json({ message: "User group not assigned to role" });
    }

    /* -----------------------------
          PAGINATION INPUT
    ----------------------------- */
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    /* -----------------------------
               COUNT
    ----------------------------- */
    const total = await CommunityNotice.countDocuments({
      apartment: apartmentId,
      groups: userGroup, // group based filter like polls
    });

    /* -----------------------------
             FETCH DATA
    ----------------------------- */
    const notices = await CommunityNotice.find({
      apartment: apartmentId,
      groups: userGroup,
    })
      .populate({
        path: "createdBy",
        populate: [
          { path: "user", select: "name email contactNumber image" },
          { path: "role", select: "name group" },
          { path: "flat", select: "flatName blockName" }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = notices.map((n) => ({
      ...n,
      createdAtFormatted: moment(n.createdAt)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD hh:mm A"),
    }));

    /* -----------------------------
               RESPONSE
    ----------------------------- */
    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      notices: formatted,
    });

  } catch (err) {
    console.error("❌ Error fetching notices:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
