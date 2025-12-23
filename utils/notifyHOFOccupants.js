const Flat = require("../model/flat/flatModel");
const UserRoleAssignment = require("../model/user/userRoleAssignment");
const Notification = require("../model/user/notification");

exports.notifyHOFOccupants = async ({
  apartmentId,
  flatId,
  message,
  logId,
  logModel,
  link,
}) => {
  try {
    if (!apartmentId || !logId || !logModel || !message) {
      throw new Error("Missing required fields");
    }

    // If flatId provided → notify for that flat
    if (flatId) {
      const flat = await Flat.findById(flatId).lean();
      if (!flat) {
        throw new Error(`Flat not found: ${flatId}`);
      }

      // Decide relationship types
      const relationshipTypes = flat.ownerStaying
        ? ["owner"]
        : ["owner", "tenant"];

      // Get active role assignments
      const assignments = await UserRoleAssignment.find({
        apartment: apartmentId,
        flat: flatId,
        relationshipType: { $in: relationshipTypes },
        active: true,
      }).select("_id"); // ✅ select _id instead of user

      const recipientIds = assignments.map((a) => a._id);

      if (recipientIds.length === 0) {
        return { success: true, recipients: 0, notification: null };
      }

      // Save notification
      const notification = await Notification.create({
        apartmentId,
        flatId,
        message,
        logId,
        logModel,
        recipients: recipientIds,
        link: link || null,
      });

      return { success: true, recipients: recipientIds.length, notification };
    }

    // If flatId not provided → notify all flats in apartment (not implemented yet)
    return { success: true, recipients: 0, notification: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
