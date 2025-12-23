
// const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");

// /**
//  * Applies fixed and daily penalties to a corpus maintenance record.
//  * Skips re-applying penalties if already waived.
//  * @param {Object} record - A CorpusFlatMaintenance document
//  */
// async function applyCorpusPenalties(record) {
//   const now = new Date();
//   const { penaltyInfo } = record;
//   if (!penaltyInfo?.penaltyStartDate) return;

//   const startDate = new Date(penaltyInfo.penaltyStartDate);
//   if (now <= startDate) return;

//   let recordUpdated = false;

//   for (const item of record.maintenance) {
//     let updated = false;

//     /**
//      * 🔹 FIXED PENALTY
//      */
//     const fixedReason = item.penaltyReasons.find(
//       (r) => r.description === "Fixed Penalty"
//     );

//     if (!fixedReason && penaltyInfo.fixedFine?.amount) {
//       // no fixed penalty → create one
//       const fixedAmount =
//         penaltyInfo.fixedFine.type === "%"
//           ? (item.amount * penaltyInfo.fixedFine.amount) / 100
//           : penaltyInfo.fixedFine.amount;

//       item.amount += fixedAmount;
//       item.penaltyReasons.push({
//         description: "Fixed Penalty",
//         price: fixedAmount,
//         waived: false,
//       });
//       record.totalAmount += fixedAmount;
//       updated = true;
//     } else if (fixedReason && fixedReason.waived) {
//       // already waived → skip
//     }
//     // else fixedReason exists and not waived → do nothing

//     /**
//      * 🔹 DAILY PENALTY
//      */
//     const dailyReason = item.penaltyReasons.find(
//       (r) => r.description === "Daily Penalty"
//     );

//     if (dailyReason && dailyReason.waived) {
//       // already waived → skip completely
//     } else {
//       const dailyInfo = penaltyInfo.dailyFine;
//       if (dailyInfo?.perDay) {
//         let lastAppliedDays = 0;

//         if (dailyReason) {
//           const perDayValue =
//             dailyInfo.type === "%"
//               ? (item.amount * dailyInfo.perDay) / 100
//               : dailyInfo.perDay;

//           if (perDayValue > 0) {
//             lastAppliedDays = Math.floor(dailyReason.price / perDayValue);
//           }
//         }

//         const diffDays = Math.floor(
//           (now - startDate) / (1000 * 60 * 60 * 24)
//         );
//         const newDays = diffDays - lastAppliedDays;

//         if (newDays > 0) {
//           const perDayAmount =
//             dailyInfo.type === "%"
//               ? (item.amount * dailyInfo.perDay) / 100
//               : dailyInfo.perDay;

//           const dailyAmount = perDayAmount * newDays;
//           item.amount += dailyAmount;

//           if (dailyReason) {
//             dailyReason.price += dailyAmount;
//           } else {
//             item.penaltyReasons.push({
//               description: "Daily Penalty",
//               price: dailyAmount,
//               waived: false,
//             });
//           }

//           record.totalAmount += dailyAmount;
//           updated = true;
//         }
//       }
//     }

//     if (updated) recordUpdated = true;
//   }

//   // ✅ Save only if anything changed
//   if (recordUpdated) {
//     record.markModified("maintenance");
//     record.markModified("totalAmount");
//     await record.save();
//   }

//   return record;
// }

// module.exports = applyCorpusPenalties;

const CorpusFlatMaintenance = require("../../../../model/flat/maintenance/corpusMaintenance");

/**
 * Applies fixed and daily penalties to a corpus maintenance record.
 * Skips re-applying penalties if already waived or if status is paid.
 * @param {Object} record - A CorpusFlatMaintenance document
 */
async function applyCorpusPenalties(record) {
  const now = new Date();
  const { penaltyInfo } = record;
  if (!penaltyInfo?.penaltyStartDate) return;

  const startDate = new Date(penaltyInfo.penaltyStartDate);
  if (now <= startDate) return;

  let recordUpdated = false;

  for (const item of record.maintenance) {
    // 🚫 Skip if already paid
    if (item.status === "paid") continue;

    let updated = false;

    /**
     * 🔹 FIXED PENALTY
     */
    const fixedReason = item.penaltyReasons.find(
      (r) => r.description === "Fixed Penalty"
    );

    if (!fixedReason && penaltyInfo.fixedFine?.amount) {
      const fixedAmount =
        penaltyInfo.fixedFine.type === "%"
          ? (item.amount * penaltyInfo.fixedFine.amount) / 100
          : penaltyInfo.fixedFine.amount;

      item.amount += fixedAmount;
      item.penaltyReasons.push({
        description: "Fixed Penalty",
        price: fixedAmount,
        waived: false,
      });
      record.totalAmount += fixedAmount;
      updated = true;
    } else if (fixedReason && fixedReason.waived) {
      // skip re-applying if waived
    }

    /**
     * 🔹 DAILY PENALTY
     */
    const dailyReason = item.penaltyReasons.find(
      (r) => r.description === "Daily Penalty"
    );

    if (dailyReason && dailyReason.waived) {
      // already waived → skip
    } else {
      const dailyInfo = penaltyInfo.dailyFine;
      if (dailyInfo?.perDay) {
        let lastAppliedDays = 0;

        if (dailyReason) {
          const perDayValue =
            dailyInfo.type === "%"
              ? (item.amount * dailyInfo.perDay) / 100
              : dailyInfo.perDay;

          if (perDayValue > 0) {
            lastAppliedDays = Math.floor(dailyReason.price / perDayValue);
          }
        }

        const diffDays = Math.floor(
          (now - startDate) / (1000 * 60 * 60 * 24)
        );
        const newDays = diffDays - lastAppliedDays;

        if (newDays > 0) {
          const perDayAmount =
            dailyInfo.type === "%"
              ? (item.amount * dailyInfo.perDay) / 100
              : dailyInfo.perDay;

          const dailyAmount = perDayAmount * newDays;
          item.amount += dailyAmount;

          if (dailyReason) {
            dailyReason.price += dailyAmount;
          } else {
            item.penaltyReasons.push({
              description: "Daily Penalty",
              price: dailyAmount,
              waived: false,
            });
          }

          record.totalAmount += dailyAmount;
          updated = true;
        }
      }
    }

    if (updated) recordUpdated = true;
  }

  if (recordUpdated) {
    record.markModified("maintenance");
    record.markModified("totalAmount");
    await record.save();
  }

  return record;
}

module.exports = applyCorpusPenalties;
