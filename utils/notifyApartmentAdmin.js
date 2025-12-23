const userRoleAssignment = require("../model/user/userRoleAssignment");
const ApartmentRole = require("../model/apartment/apartmentRole");
const notification = require("../model/user/notification");

module.exports = async function notifyApartmentAdmins({
  apartmentId,
  message,
  logId,
  logModel,
  link,
}) {
  try {
    // 🔹 1. Get apartment-admin role
    const adminRole = await ApartmentRole.findOne({
      slug: "apartment-admin",
      apartment: apartmentId,
    });

    if (!adminRole) return;

    // 🔹 2. Find all active assignments with this role
    const assignments = await userRoleAssignment.find({
      apartment: apartmentId,
      role: adminRole._id,
      active: true,
    });

    const recipientIds = assignments.map((a) => a._id);

    if (recipientIds.length > 0) {
      // 🔹 3. Save notification
      await notification.create({
        apartmentId,
        flatId: null,
        message,
        logId,
        logModel,
        recipients: recipientIds,
        link,
      });
    }
  } catch (err) {
    console.error("❌ Failed to send admin notification:", err);
  }
};
