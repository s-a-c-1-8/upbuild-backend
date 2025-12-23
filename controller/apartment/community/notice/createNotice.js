const CommunityNotice = require("../../../../model/apartment/communityNotice");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const {
  notifyApartmentGroupUsers,
} = require("../../../../utils/notifyApartmentGroupUsers");

exports.createNotice = async (req, res) => {
  try {
    const auth = req.auth || req.user || {};
    const apartmentId = auth.apartmentId;
    const createdBy = auth.selectedRoleId;

    const { title, message, groups } = req.body;

    // VALIDATION
    if (!title?.trim() || !message?.trim()) {
      return res
        .status(400)
        .json({ message: "Title and message are required." });
    }

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res
        .status(400)
        .json({ message: "Select at least one group." });
    }

    // CREATE NOTICE
    const notice = await CommunityNotice.create({
      apartment: apartmentId,
      createdBy,
      title: title.trim(),
      message: message.trim(),
      groups,
    });

    // 🔍 GET CREATOR NAME
    const roleAssign = await UserRoleAssignment.findById(createdBy).populate(
      "user",
      "name"
    );
    const creatorName = roleAssign?.user?.name || "Someone";

    // 🔔 SEND NOTIFICATION TO SELECTED GROUPS
    await notifyApartmentGroupUsers({
      apartmentId,
      groups,
      message: `${creatorName} has posted a new notice`,
      logId: notice._id,
      logModel: "CommunityNotice",
      link: `/apartment/community/notice/${notice._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Notice created successfully",
      notice,
    });
  } catch (err) {
    console.error("❌ createNotice Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
