const CommunityPoll = require("../../../../model/apartment/communityPoll");
const {
  notifyApartmentGroupUsers,
} = require("../../../../utils/notifyApartmentGroupUsers");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");

exports.createPoll = async (req, res) => {
  try {
    const auth = req.auth || req.user || {};
    const apartmentId = auth.apartmentId;
    const userId = auth.selectedRoleId;

    const { question, options, groups, startDateTime, endDateTime } = req.body;

    // VALIDATION
    if (!question?.trim()) {
      return res.status(400).json({ message: "Poll question is required." });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: "At least 2 options required." });
    }

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ message: "Select at least one group." });
    }

    if (!startDateTime || !endDateTime) {
      return res
        .status(400)
        .json({ message: "Start & End date-time required." });
    }

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      return res.status(400).json({
        message: "End time must be greater than start time.",
      });
    }

    // CREATE POLL
    const poll = await CommunityPoll.create({
      apartment: apartmentId,
      createdBy: userId,
      question,
      options: options.map((t) => ({ text: t })),
      groups,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
    });

    // 🔍 GET CREATOR NAME
    const roleAssign = await UserRoleAssignment.findById(userId).populate(
      "user",
      "name"
    );
    const creatorName = roleAssign?.user?.name || "Someone";

    // 🔔 SEND NOTIFICATION ONLY TO SELECTED GROUPS
    await notifyApartmentGroupUsers({
      apartmentId,
      groups,
      message: `${creatorName} has created a poll`,
      logId: poll._id,
      logModel: "CommunityPoll",
      link: `/apartment/community/poll/${poll._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Poll created successfully",
      poll,
    });
  } catch (err) {
    console.log("❌ createPoll error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
