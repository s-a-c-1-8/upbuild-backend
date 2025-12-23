const cron = require("node-cron");
const moment = require("moment-timezone");
const SubAdmin = require("../../model/subAdmin/subAdmin");

// cron.schedule(
//   "* * * * *",

cron.schedule(
  "0 5 * * *", // ⏰ Run every day at 5:00 AM
  async () => {
    try {
      console.log("⏰ CRON: Checking SubAdmins for password expiry…");

      const today = moment().tz("Asia/Kolkata");

      const subAdmins = await SubAdmin.find({});

      for (const admin of subAdmins) {
        const passwordSetDate = moment(admin.passwordSetDate).tz(
          "Asia/Kolkata"
        );
        const diffDays = today.diff(passwordSetDate, "days");

        // ⛔ Skip if already expired before
        if (!admin.password) continue;

        // 🔥 If 60+ days old → move password → oldPassword
        if (diffDays >= 60) {
          await SubAdmin.updateOne(
            { _id: admin._id },
            {
              $set: {
                oldPassword: admin.password,
                oldPasswordDate: admin.passwordSetDate,
              },
              $unset: { password: "" }, // DELETE active password
            }
          );

          console.log(
            `🔄 Password moved to oldPassword for SubAdmin ${admin.email} — expired after ${diffDays} days`
          );
        }
      }

      console.log("✔ CRON: Password cleanup completed");
    } catch (err) {
      console.error("❌ CRON ERROR:", err.message);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
