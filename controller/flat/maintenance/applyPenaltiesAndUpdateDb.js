
// const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");

// async function applyPenaltiesAndUpdateTotals(apartmentId) {
//   const allRecords = await MonthlyFlatMaintenance.find({ apartmentId });

//   for (const record of allRecords) {
//     for (const item of record.maintenance) {
//       const penaltySettings = record.penaltySettings;
//       if (!penaltySettings?.startDate) continue;

//       const now = new Date();
//       const startDate = new Date(penaltySettings.startDate);
//       if (now <= startDate) continue;

//       let updated = false;

//       /**
//        * 🔹 FIXED PENALTY
//        */
//       const fixedReason = item.reasons.find(
//         (r) => r.description === "Fixed Penalty"
//       );

//       if (!fixedReason && penaltySettings.fixed?.amount) {
//         // No fixed penalty → create it
//         const fixedAmount =
//           penaltySettings.fixed.type === "%"
//             ? (item.amount * penaltySettings.fixed.amount) / 100
//             : penaltySettings.fixed.amount;

//         item.amount += fixedAmount;
//         item.reasons.push({
//           description: "Fixed Penalty",
//           price: fixedAmount,
//           waived: false,
//         });
//         record.totalAmount += fixedAmount;
//         updated = true;
//       } else if (fixedReason && fixedReason.waived) {
//         // Fixed penalty exists but waived → skip (never reapply)
//       }
//       // else if fixedReason && !waived → already applied, do nothing

//       /**
//        * 🔹 DAILY PENALTY
//        */
//       const dailyReason = item.reasons.find(
//         (r) => r.description === "Daily Penalty"
//       );

//       if (dailyReason && dailyReason.waived) {
//         // Already waived → skip
//       } else {
//         let lastAppliedDays = 0;
//         if (dailyReason) {
//           const perDayAmount =
//             penaltySettings.daily.type === "%"
//               ? (item.amount * penaltySettings.daily.amount) / 100
//               : penaltySettings.daily.amount;

//           if (perDayAmount > 0) {
//             lastAppliedDays = Math.floor(dailyReason.price / perDayAmount);
//           }
//         }

//         const diffTime = now - startDate;
//         const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//         const newDays = totalDays - lastAppliedDays;

//         if (newDays > 0 && penaltySettings.daily?.amount) {
//           const perDayAmount =
//             penaltySettings.daily.type === "%"
//               ? (item.amount * penaltySettings.daily.amount) / 100
//               : penaltySettings.daily.amount;

//           const dailyAmount = perDayAmount * newDays;
//           item.amount += dailyAmount;

//           if (dailyReason) {
//             dailyReason.price += dailyAmount; // extend existing one
//           } else {
//             item.reasons.push({
//               description: "Daily Penalty",
//               price: dailyAmount,
//               waived: false,
//             });
//           }

//           record.totalAmount += dailyAmount;
//           updated = true;
//         }
//       }

//       if (updated) await record.save();
//     }
//   }
// }

// module.exports = { applyPenaltiesAndUpdateTotals };

const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");

async function applyPenaltiesAndUpdateTotals(apartmentId) {
  const allRecords = await MonthlyFlatMaintenance.find({ apartmentId });

  for (const record of allRecords) {
    for (const item of record.maintenance) {
      // 🚫 Skip penalties if already paid
      if (item.status === "paid") continue;

      const penaltySettings = record.penaltySettings;
      if (!penaltySettings?.startDate) continue;

      const now = new Date();
      const startDate = new Date(penaltySettings.startDate);
      if (now <= startDate) continue;

      let updated = false;

      /**
       * 🔹 FIXED PENALTY
       */
      const fixedReason = item.reasons.find(
        (r) => r.description === "Fixed Penalty"
      );

      if (!fixedReason && penaltySettings.fixed?.amount) {
        // No fixed penalty → create it
        const fixedAmount =
          penaltySettings.fixed.type === "%"
            ? (item.amount * penaltySettings.fixed.amount) / 100
            : penaltySettings.fixed.amount;

        item.amount += fixedAmount;
        item.reasons.push({
          description: "Fixed Penalty",
          price: fixedAmount,
          waived: false,
        });
        record.totalAmount += fixedAmount;
        updated = true;
      } else if (fixedReason && fixedReason.waived) {
        // Fixed penalty exists but waived → skip (never reapply)
      }
      // else if fixedReason && not waived → already applied, do nothing

      /**
       * 🔹 DAILY PENALTY
       */
      const dailyReason = item.reasons.find(
        (r) => r.description === "Daily Penalty"
      );

      if (dailyReason && dailyReason.waived) {
        // Already waived → skip
      } else {
        let lastAppliedDays = 0;
        if (dailyReason) {
          const perDayAmount =
            penaltySettings.daily.type === "%"
              ? (item.amount * penaltySettings.daily.amount) / 100
              : penaltySettings.daily.amount;

          if (perDayAmount > 0) {
            lastAppliedDays = Math.floor(dailyReason.price / perDayAmount);
          }
        }

        const diffTime = now - startDate;
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const newDays = totalDays - lastAppliedDays;

        if (newDays > 0 && penaltySettings.daily?.amount) {
          const perDayAmount =
            penaltySettings.daily.type === "%"
              ? (item.amount * penaltySettings.daily.amount) / 100
              : penaltySettings.daily.amount;

          const dailyAmount = perDayAmount * newDays;
          item.amount += dailyAmount;

          if (dailyReason) {
            dailyReason.price += dailyAmount; // extend existing one
          } else {
            item.reasons.push({
              description: "Daily Penalty",
              price: dailyAmount,
              waived: false,
            });
          }

          record.totalAmount += dailyAmount;
          updated = true;
        }
      }

      if (updated) await record.save();
    }
  }
}

module.exports = { applyPenaltiesAndUpdateTotals };
