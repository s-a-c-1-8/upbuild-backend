const CommunityPoll = require("../../../../model/apartment/communityPoll");
const moment = require("moment-timezone");

exports.getPollById = async (req, res) => {
  try {
    const auth = req.auth || {};
    const apartmentId = auth.apartmentId;
    const userGroup = req.activeRole?.role?.group;
    const userRoleId = auth.selectedRoleId;
    const pollId = req.params.pollId;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment not found for this role" });
    }

    if (!userGroup) {
      return res.status(400).json({ message: "User group not assigned to role" });
    }

    if (!pollId) {
      return res.status(400).json({ message: "Poll ID is required" });
    }

    // FETCH POLL
    const poll = await CommunityPoll.findOne({
      _id: pollId,
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
      .lean();

    if (!poll) {
      return res.status(404).json({ message: "Poll not found or not accessible" });
    }

    // USER VOTE
    let alreadyVoted = false;
    let votedOptionId = null;

    if (Array.isArray(poll.votedUsers)) {
      const vote = poll.votedUsers.find(
        (v) => v.user?.toString() === userRoleId?.toString()
      );
      if (vote) {
        alreadyVoted = true;
        votedOptionId = vote.optionId?.toString() || null;
      }
    }

    // COUNT VOTES
    let totalVotes = 0;
    const options = poll.options.map((opt) => {
      const count = (poll.votedUsers || []).filter(
        (v) => v.optionId?.toString() === opt._id.toString()
      ).length;

      totalVotes += count;
      return { ...opt, totalVotes: count };
    });

    // TIME LOGIC (same as getPolls)
    const nowIST = moment().tz("Asia/Kolkata");

    const startIST = moment(poll.startDateTime).tz("Asia/Kolkata");
    const endIST = moment(poll.endDateTime).tz("Asia/Kolkata");

    const hasStarted = startIST.isValid() ? nowIST.isAfter(startIST) : false;
    const hasEnded = endIST.isValid() ? nowIST.isAfter(endIST) : false;
    const isActiveNow = hasStarted && !hasEnded;

    // FINAL FORMATTED RESPONSE
    const formattedPoll = {
      ...poll,
      options,
      alreadyVoted,
      votedOptionId,
      totalVotes,

      startFormatted: startIST.isValid()
        ? startIST.format("DD/MM/YYYY, hh:mm A")
        : "Invalid Date",

      endFormatted: endIST.isValid()
        ? endIST.format("DD/MM/YYYY, hh:mm A")
        : "Invalid Date",

      hasStarted,
      hasEnded,
      isActiveNow,
    };

    return res.status(200).json({
      success: true,
      poll: formattedPoll,
    });

  } catch (err) {
    console.error("❌ Error fetching poll by ID:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
