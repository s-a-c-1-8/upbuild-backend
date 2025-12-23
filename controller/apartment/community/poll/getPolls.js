const CommunityPoll = require("../../../../model/apartment/communityPoll");
const moment = require("moment-timezone");

exports.getPolls = async (req, res) => {
  try {
    const auth = req.auth || {};
    const apartmentId = auth.apartmentId;
    const userGroup = req.activeRole?.role?.group;
    const userRoleId = auth.selectedRoleId;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment not found for this role" });
    }

    if (!userGroup) {
      return res.status(400).json({ message: "User group not assigned to role" });
    }

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    const total = await CommunityPoll.countDocuments({
      apartment: apartmentId,
      groups: userGroup,
    });

    const polls = await CommunityPoll.find({
      apartment: apartmentId,
      groups: userGroup,
    })
      .populate({
        path: "createdBy",
        populate: [
          { path: "user", select: "name email contactNumber image" },
          { path: "role", select: "name group" },
          { path: "flat", select: "flatName blockName" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Always use IST for timing comparison & formatting
    const nowIST = moment().tz("Asia/Kolkata");

    const formattedPolls = polls.map((p) => {
      let alreadyVoted = false;
      let votedOptionId = null;

      if (Array.isArray(p.votedUsers)) {
        const vote = p.votedUsers.find(
          (v) => v.user?.toString() === userRoleId?.toString()
        );
        if (vote) {
          alreadyVoted = true;
          votedOptionId = vote.optionId?.toString() || null;
        }
      }

      // Count total votes
      let totalVotes = 0;
      const optionsWithCounts = p.options.map((opt) => {
        const count = (p.votedUsers || []).filter(
          (v) => v.optionId?.toString() === opt._id.toString()
        ).length;

        totalVotes += count;
        return { ...opt, totalVotes: count };
      });

      // Convert to IST properly
      const startIST = moment(p.startDateTime).tz("Asia/Kolkata");
      const endIST = moment(p.endDateTime).tz("Asia/Kolkata");

      const hasStarted = startIST.isValid() ? nowIST.isAfter(startIST) : false;
      const hasEnded = endIST.isValid() ? nowIST.isAfter(endIST) : false;
      const isActiveNow = hasStarted && !hasEnded;

      return {
        ...p,
        options: optionsWithCounts,
        alreadyVoted,
        votedOptionId,
        totalVotes,

        // Display in IST
        startFormatted: startIST.isValid()
          ? startIST.format("DD/MM/YYYY, hh:mm A")
          : "Invalid Date",

        endFormatted: endIST.isValid()
          ? endIST.format("DD/MM/YYYY, hh:mm A")
          : "Invalid Date",

        // Flags for vote button
        hasStarted,
        hasEnded,
        isActiveNow,
      };
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      polls: formattedPolls,
    });
  } catch (err) {
    console.error("❌ Error fetching polls:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
