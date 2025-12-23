const Apartment = require("../../model/apartment/apartmentModel");

exports.markPlanPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const apt = await Apartment.findById(id);
    if (!apt) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found" });
    }

    if (!apt.planSnapshot) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No plan snapshot found for this apartment",
        });
    }

    if (apt.planSnapshot.planPaidStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Plan already marked as paid",
        data: { planSnapshot: apt.planSnapshot },
      });
    }

    apt.planSnapshot.planPaidStatus = "paid";
    apt.planSnapshot.planPaidAt = new Date();

    // ✅ ADD THIS LINE
    apt.status = "Active";

    // optional lifecycle fields if you want to track activation/expiry
    // apt.planActivatedAt = new Date();
    // apt.planExpiresAt = null; // set if you compute from frequency

    await apt.save();

    return res.status(200).json({
      success: true,
      message: "Plan marked as paid",
      data: { planSnapshot: apt.planSnapshot },
    });
  } catch (err) {
    console.error("markPlanPaid error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
