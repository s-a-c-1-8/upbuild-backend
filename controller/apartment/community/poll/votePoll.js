const moment = require("moment-timezone");
const CommunityPoll = require("../../../../model/apartment/communityPoll");

exports.votePoll = async (req, res) => {
  try {
    const { pollId, optionId } = req.body;
    const userRoleId = req.auth?.selectedRoleId;

    if (!pollId || !optionId) {
      return res.status(400).json({ message: "pollId and optionId are required." });
    }

    const poll = await CommunityPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found." });

    // Convert server time + DB time into IST using moment
    const now = moment().tz("Asia/Kolkata");
    const start = moment(poll.startDateTime).tz("Asia/Kolkata");
    const end = moment(poll.endDateTime).tz("Asia/Kolkata");

    // CHECK IF POLL IS IN VOTING WINDOW
    if (now.isBefore(start)) {
      return res.status(400).json({ message: "Poll has not started yet." });
    }

    if (now.isAfter(end)) {
      poll.status = "Closed";
      await poll.save();
      return res.status(400).json({ message: "Poll has ended." });
    }

    // CHECK IF USER ALREADY VOTED
    const existingVote = poll.votedUsers.find(v => v.user.toString() === userRoleId);

    if (existingVote?.optionId.toString() === optionId) {
      return res.status(400).json({ message: "You already voted for this option." });
    }

    const newOption = poll.options.id(optionId);
    if (!newOption) return res.status(404).json({ message: "Option not found." });

    // REMOVE OLD VOTE
    if (existingVote) {
      const oldOption = poll.options.id(existingVote.optionId);
      if (oldOption && oldOption.votes > 0) oldOption.votes--;
      newOption.votes++;
      existingVote.optionId = optionId;
    } else {
      // FIRST VOTE
      newOption.votes++;
      poll.votedUsers.push({ user: userRoleId, optionId });
    }

    await poll.save();

    return res.status(200).json({
      success: true,
      message: "Vote recorded successfully",
      poll,
    });
  } catch (err) {
    console.error("❌ votePoll error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
