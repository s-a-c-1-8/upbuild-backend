const Apartment = require("../../model/apartment/apartmentModel");

exports.checkApartmentState = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.json({
        ok: false,
        reason: "Apartment ID missing",
        code: "MISSING_ID",
      });
    }

    const apt = await Apartment.findById(apartmentId).lean();
    if (!apt) {
      return res.json({
        ok: false,
        reason: "Apartment not found",
        code: "NOT_FOUND",
      });
    }

    // 🔥 PRIORITY 1 → PLAN DETAILS MISSING
    if (!apt.planSnapshot || !apt.planSnapshot.planName) {
      return res.json({
        ok: false,
        reason: "Plan details not completed",
        code: "FILL_DETAILS",
      });
    }

    // 🔥 PRIORITY 2 → PLAN EXISTS BUT NOT PAID
    if (apt.planSnapshot.planPaidStatus !== "paid") {
      return res.json({
        ok: false,
        reason: "Subscription payment pending",
        code: "NOT_PAID",
      });
    }

    // 🔥 PRIORITY 3 → APARTMENT MUST BE ACTIVE
    if (apt.status !== "Active") {
      return res.json({
        ok: false,
        reason: "Apartment is inactive",
        code: "INACTIVE",
      });
    }

    // 🔥 PRIORITY 4 → MUST BE APPROVED
    if (!apt.approved) {
      return res.json({
        ok: false,
        reason: "Apartment is not approved",
        code: "NOT_APPROVED",
      });
    }

    // ✅ ALL GOOD
    return res.json({
      ok: true,
      reason: "Apartment is valid",
      code: "OK",
    });

  } catch (err) {
    console.error(err);
    return res.json({
      ok: false,
      reason: "Server error",
      code: "SERVER_ERROR",
    });
  }
};
