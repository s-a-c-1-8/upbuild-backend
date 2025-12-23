const Event = require("../../../../model/flat/maintenance/events");

exports.markEventContributionPaid = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const flatId = req.auth?.flatId;

    if (!flatId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Flat ID missing in token" });
    }

    if (!eventId) {
      return res
        .status(400)
        .json({ success: false, message: "Event ID is required" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Always push a new contribution (no overwriting)
    const newContribution = {
      flatId,
      amount: req.body.amount,
      status: "paid",
    };
    event.contributions.push(newContribution);

    // Increment contributeCount safely
    event.contributeCount = (event.contributeCount || 0) + 1;

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Contribution added and marked as paid",
    });
  } catch (err) {
    console.error("❌ Error in markEventContributionPaid:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating contribution status",
    });
  }
};
