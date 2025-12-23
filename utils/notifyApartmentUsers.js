const UserRoleAssignment = require("../model/user/userRoleAssignment");
const Notification = require("../model/user/notification");

exports.notifyApartmentUsers = async ({
  apartmentId,
  message,
  logId,
  logModel,
  link,
}) => {
  try {
    // Validate required fields
    if (!apartmentId || !message || !logId || !logModel) {
      throw new Error("Missing required fields");
    }

    // 1️⃣ Get ALL role assignments for this apartment (active + inactive)
    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId
    }).select("_id");

    // 2️⃣ Extract IDs
    const recipientIds = assignments.map((a) => a._id);

    // If no recipients exist, return success but empty
    if (recipientIds.length === 0) {
      return { success: true, recipients: 0, notification: null };
    }

    // 3️⃣ Create a single broadcast notification
    const notification = await Notification.create({
      apartmentId,
      flatId: null, // because it's apartment wide
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
