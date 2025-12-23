// middlewares/requirePlanFeature.js
const mongoose = require("mongoose");
const Apartment = require("../model/apartment/apartmentModel");

/**
 * Require a feature (by `type`) to be present in apartment.planSnapshot.settings.
 *
 * @param {("Visitors"|"Complaints"|"Maintenance"|"Amenities")} featureType
 * @param {Object} [opts]
 * @param {boolean} [opts.requirePaid=true]
 * @param {boolean} [opts.requireActiveWindow=true]
 * @param {boolean} [opts.requireServiceStatusActive=true]
 * @param {(req)=>string} [opts.resolveApartmentId]
 */
function requirePlanFeature(
  featureType,
  {
    requirePaid = true,
    requireActiveWindow = true,
    requireServiceStatusActive = true,
    resolveApartmentId,
  } = {}
) {
  return async function (req, res, next) {
    try {
      // ---------- 1) Resolve apartment id (same priority as verifyToken outcome) ----------
      let apartmentId;

      // a) explicit resolver hook (route can override)
      if (typeof resolveApartmentId === "function") {
        apartmentId = resolveApartmentId(req);
      }

      // b) role-selected path from verifyToken: req.activeRole.apartment (populated with name)
      if (!apartmentId && req?.activeRole?.apartment) {
        // if populated doc: use _id; if just ObjectId: toString
        apartmentId =
          req.activeRole.apartment?._id?.toString?.() ||
          req.activeRole.apartment?.toString?.();
      }

      // c) token-provided apartmentId captured by verifyToken on req.auth
      if (!apartmentId && req?.auth?.apartmentId) {
        apartmentId = req.auth.apartmentId;
      }

      // d) common fallbacks (header/params/body/query)
      if (!apartmentId) {
        apartmentId =
          req.headers["x-apartment-id"] ||
          req.params.apartmentId ||
          req.body.apartmentId ||
          req.query.apartmentId;
      }

      if (!apartmentId || !mongoose.isValidObjectId(apartmentId)) {
        return res.status(400).json({
          message:
            "Apartment not resolved. Pass a valid apartment via selected role, req.auth.apartmentId, x-apartment-id header, params, body, or query.",
          code: "APARTMENT_UNRESOLVED",
        });
      }

      // Optional: carry flat context if present (mirrors verifyToken)
      const flatId =
        req?.activeRole?.flat?._id?.toString?.() ||
        req?.activeRole?.flat?.toString?.() ||
        req?.auth?.flatId ||
        null;

      // ---------- 2) Load minimal apartment fields ----------
      const apt = await Apartment.findById(apartmentId)
        .select("planSnapshot planActivatedAt planExpiresAt")
        .lean();

      if (!apt) {
        return res.status(404).json({
          message: "Apartment not found.",
          code: "APARTMENT_NOT_FOUND",
        });
      }

      const ps = apt.planSnapshot || {};

      if (!apt.planSnapshot || Object.keys(apt.planSnapshot).length === 0) {
        return res.status(403).json({
          message: "No active plan found for this apartment.",
          code: "PLAN_SNAPSHOT_MISSING",
        });
      }

      const settings = Array.isArray(ps.settings) ? ps.settings : [];

      // ---------- 3) Paid check ----------
      if (requirePaid && ps.planPaidStatus !== "paid") {
        return res.status(402).json({
          message: "Plan payment required to use this feature.",
          code: "PLAN_NOT_PAID",
        });
      }

      // ---------- 4) Active window check ----------
      if (requireActiveWindow) {
        const now = new Date();
        if (apt.planActivatedAt && now < new Date(apt.planActivatedAt)) {
          return res
            .status(403)
            .json({ message: "Plan not active yet.", code: "PLAN_NOT_ACTIVE" });
        }
        if (apt.planExpiresAt && now > new Date(apt.planExpiresAt)) {
          return res
            .status(403)
            .json({ message: "Plan expired.", code: "PLAN_EXPIRED" });
        }
      }

      // ---------- 5) Feature presence ----------
      const feature = settings.find((s) => s?.type === featureType);
      if (!feature) {
        return res.status(403).json({
          message: `Your plan does not include ${featureType}.`,
          code: "FEATURE_NOT_IN_PLAN",
        });
      }

      // ---------- 6) Feature status ----------
      if (requireServiceStatusActive && feature.status !== "Active") {
        return res.status(403).json({
          message: `${featureType} is disabled in your plan settings.`,
          code: "FEATURE_DISABLED",
        });
      }

      // ---------- 7) Attach for downstream use ----------
      req.planFeature = {
        type: featureType,
        snapshot: feature,
        planSnapshot: ps,
        apartmentId: apartmentId.toString(),
        flatId, // optional context
      };

      return next();
    } catch (err) {
      console.error("requirePlanFeature error:", err);
      return res
        .status(500)
        .json({ message: "Server error validating plan feature." });
    }
  };
}

module.exports = { requirePlanFeature };
