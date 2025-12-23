const UserRoleAssignment = require("../model/user/userRoleAssignment");
const ApartmentRole = require("../model/apartment/apartmentRole");
const Notification = require("../model/user/notification");

exports.notifyApartmentGroupUsers = async ({
  apartmentId,
  groups = [],        // Array of groups to notify
  message,
  logId,
  logModel,
  link,
}) => {
  try {
    if (!apartmentId || !message || !logId || !logModel || !Array.isArray(groups)) {
      throw new Error("Missing required fields");
    }

    // 1️⃣ Find roles in this apartment that match these groups
    const roles = await ApartmentRole.find({
      apartment: apartmentId,
      group: { $in: groups },
    }).select("_id");

    const roleIds = roles.map(r => r._id);

    // No matching roles
    if (roleIds.length === 0) {
      return { success: true, recipients: 0, notification: null };
    }

    // 2️⃣ Get all UserRoleAssignments with these roles
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      role: { $in: roleIds },
    }).select("_id");

    const recipientIds = assignments.map(a => a._id);

    // No recipients
    if (recipientIds.length === 0) {
      return { success: true, recipients: 0, notification: null };
    }

    // 3️⃣ Create notification document
    const notification = await Notification.create({
      apartmentId,
      flatId: null,
      message,
      logId,
      logModel,
      recipients: recipientIds,
      link: link || null,
    });

    return {
      success: true,
      recipients: recipientIds.length,
      notification,
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
};
