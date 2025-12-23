// const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

// const mapSymbolToType = (symbol) => {
//   if (symbol === "₹") return "rupees";
//   if (symbol === "%") return "percentage";
//   return symbol;
// };

// const saveMaintenanceFineSettings = async (req, res) => {
//   try {
//     const { maintenance, corpus } = req.body;
//     const apartment = req.auth?.apartmentId;

//     if (!apartment) {
//       return res.status(400).json({ message: "Apartment ID is required" });
//     }

//     const updated = await ApartmentSettings.findOneAndUpdate(
//       { apartment }, // 🔍 filter by apartment
//       {
//         $set: {
//           "settings.maintenanceFine": {
//             monthly: {
//               fixedFine: {
//                 amount: Number(maintenance.fixedFine.amount),
//                 type: mapSymbolToType(maintenance.fixedFine.type),
//               },
//               dailyFine: {
//                 perDay: Number(maintenance.dailyFine.perDay),
//                 type: mapSymbolToType(maintenance.dailyFine.type),
//               },
//               penaltyStartDay: Number(maintenance.penaltyStartDay) || 1, // ✅ added
//             },
//             corpus: {
//               fixedFine: {
//                 amount: Number(corpus.fixedFine.amount),
//                 type: mapSymbolToType(corpus.fixedFine.type),
//               },
//               dailyFine: {
//                 perDay: Number(corpus.dailyFine.perDay),
//                 type: mapSymbolToType(corpus.dailyFine.type),
//               },
//               penaltyStartDay: Number(corpus.penaltyStartDay) || 1, // ✅ added
//             },
//           },
//         },
//       },
//       { upsert: true, new: true }
//     );

//     return res.status(200).json({
//       message: "Fine settings saved successfully.",
//       settings: updated.settings.maintenanceFine,
//     });
//   } catch (error) {
//     console.error("Error saving fine settings:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// module.exports = {
//   saveMaintenanceFineSettings,
// };

const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

const saveMaintenanceFineSettings = async (req, res) => {
  console.log("req body",req.body)
  try {
    const { corpus } = req.body;
    const apartment = req.auth?.apartmentId;

    if (!apartment) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    if (!corpus) {
      return res
        .status(400)
        .json({ message: "Corpus fine settings are required" });
    }

    const updated = await ApartmentSettings.findOneAndUpdate(
      { apartment }, // 🔍 filter by apartment
      {
        $set: {
          "settings.maintenanceFine.corpus": {
            fixedFine: {
              amount: Number(corpus.fixedFine.amount) || 0,
              type: corpus.fixedFine.type || "₹", // ✅ store symbol directly
            },
            dailyFine: {
              perDay: Number(corpus.dailyFine.perDay) || 0,
              type: corpus.dailyFine.type || "₹", // ✅ store symbol directly
            },
            penaltyStartDay: Number(corpus.penaltyStartDay) || 1,
          },
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Corpus fine settings saved successfully.",
      settings: updated.settings.maintenanceFine.corpus,
    });
  } catch (error) {
    console.error("Error saving corpus fine settings:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  saveMaintenanceFineSettings,
};
