const FlatBulkVisitor = require("../../../../model/flat/visitorBulk");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const logAction = require("../../../../utils/logAction");
const Apartment = require("../../../../model/apartment/apartmentModel");
const notifyOccupants = require("../../../../utils/notifyOccupants");

function formatDateDDMMYY(dateStr) {
  const d = new Date(dateStr);
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yy = `${d.getFullYear()}`.slice(-2);
  return `${dd}${mm}${yy}`;
}

exports.addFlatBulkVisitor = async (req, res) => {
  try {
    const {
      apartmentId,
      flatId,
      eventPurpose,
      expectedCount,
      isMultipleDays,
      visitDate,
      fromDate,
      toDate,
      fromTime,
      toTime,
      notes,
    } = req.body;

    const isMulti =
      typeof isMultipleDays === "string"
        ? isMultipleDays.toLowerCase() === "true"
        : Boolean(isMultipleDays);

    // 🔐 Role and permission check
    const selectedRoleId = req.auth?.selectedRoleId;
    if (!selectedRoleId) {
      return res
        .status(403)
        .json({ message: "Access denied. No role selected." });
    }

    const roleAssignment = await UserRoleAssignment.findById(
      selectedRoleId
    ).populate("role");
    const role = roleAssignment?.role;

    if (!roleAssignment || !role) {
      return res.status(403).json({ message: "Access denied. Invalid role." });
    }

    const roleSlug = role.slug;
    const permissionNames = (role.permissions || []).map((p) => p.name);
    const hasPermission = permissionNames.includes("can_add_visitor");

    // 🚫 If not admin or occupant and missing permission
    if (
      !["apartment-admin", "occupants", "security"].includes(roleSlug) &&
      !hasPermission
    ) {
      return res.status(403).json({
        message:
          "Access denied. You do not have permission to add bulk visitors.",
      });
    }

    // 🧍 Occupant must provide flatId
    if (roleSlug === "occupants" && (!flatId || flatId === "apartment")) {
      return res.status(400).json({
        message: "Occupants must specify a valid flat ID (not 'apartment').",
      });
    }

    const isForEntireApartment = flatId === "apartment";

    // 🔍 Required field checks
    if (
      !apartmentId ||
      !flatId ||
      !eventPurpose ||
      !expectedCount ||
      !fromTime ||
      !toTime
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!isMulti && !visitDate) {
      return res
        .status(400)
        .json({ message: "Visit date is required for single-day event." });
    }

    if (isMulti && (!fromDate || !toDate)) {
      return res
        .status(400)
        .json({ message: "From/To dates required for multi-day event." });
    }
    const apartmentDoc = await Apartment.findById(apartmentId);
    if (!apartmentDoc || !apartmentDoc.apartmentId) {
      return res.status(400).json({ message: "Invalid apartmentId" });
    }

    const aptIdPart = apartmentDoc.apartmentId;

    // === Generate bulkVisitorId ===
    let dateForId = isMulti ? fromDate : visitDate;
    const dateStr = formatDateDDMMYY(dateForId); // <-- FIXED FUNCTION NAME!
    const countQuery = {
      apartmentId,
      ...(isMulti ? { fromDate: dateForId } : { visitDate: dateForId }),
    };
    const serial = (await FlatBulkVisitor.countDocuments(countQuery)) + 1;
    const bulkVisitorId = `BVIS-${aptIdPart}-${dateStr}${serial}`;

    // ✅ Create entry, don't set bulkVisitorLink yet
    const newEntry = new FlatBulkVisitor({
      apartmentId,
      flatId: isForEntireApartment ? null : flatId,
      eventPurpose,
      expectedCount,
      isMultipleDays: isMulti,
      visitDate: isMulti ? null : visitDate,
      fromDate: isMulti ? fromDate : null,
      toDate: isMulti ? toDate : null,
      fromTime,
      toTime,
      notes,
      isForEntireApartment,
      bulkVisitorId,
    });

    await newEntry.save();

    // Now update the saved entry with the generated link
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
    const bulkVisitorLink = `${frontendUrl}apartment/visitors/add/bulkVisitors/fillForm/${newEntry._id}`;

    newEntry.bulkVisitorLink = bulkVisitorLink;
    await newEntry.save();

    if (!isForEntireApartment && flatId) {
      await notifyOccupants({
        apartmentId,
        flatId,
        message: `A bulk visit entry has been created for your flat. Purpose: ${eventPurpose}. Expected count: ${expectedCount}. Copy the link in your dashboard and forward to fill the form.`,
        logId: newEntry._id,
        logModel: "VisitorsBulk",
        link: `${process.env.FRONTEND_URL}/apartment/visitors/bulkVisit?search=${bulkVisitorId}`,
      });
    }

    // 🪵 Audit log
    await logAction({
      req,
      action: "ADD_FLAT_BULK_VISITOR",
      description: `Created bulk visitor entry for ${
        isForEntireApartment ? "entire apartment" : "flat " + flatId
      }`,
      metadata: {
        apartmentId,
        flatId: isForEntireApartment ? null : flatId,
        eventPurpose,
        expectedCount,
        isMultipleDays: isMulti,
        visitDate: visitDate || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        fromTime,
        toTime,
        isForEntireApartment,
        bulkVisitorId,
        bulkVisitorLink,
      },
    });

    return res.status(200).json({
      message: "Flat bulk visitor entry created successfully.",
      bulkVisitorId,
      bulkVisitorLink,
    });
  } catch (err) {
    console.error("Error in addFlatBulkVisitor:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};
