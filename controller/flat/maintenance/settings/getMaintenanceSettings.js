// const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

// const mapTypeToSymbol = (type) => {
//   if (type === "rupees") return "₹";
//   if (type === "percentage") return "%";
//   return type;
// };

// const getMaintenanceFineSettings = async (req, res) => {
//   try {
//     const apartment = req.auth?.apartmentId;

//     if (!apartment) {
//       return res.status(400).json({ message: "Apartment ID is required" });
//     }

//     const doc = await ApartmentSettings.findOne({ apartment });

//     const fineSettings = doc?.settings?.maintenanceFine || {
//       monthly: {},
//       corpus: {},
//     };

//     const response = {
//       monthly: {
//         fixedFine: {
//           amount: fineSettings.monthly?.fixedFine?.amount || 0,
//           type: mapTypeToSymbol(fineSettings.monthly?.fixedFine?.type),
//         },
//         dailyFine: {
//           perDay: fineSettings.monthly?.dailyFine?.perDay || 0,
//           type: mapTypeToSymbol(fineSettings.monthly?.dailyFine?.type),
//         },
//         penaltyStartDay: fineSettings.monthly?.penaltyStartDay || 1, // ✅ added
//       },
//       corpus: {
//         fixedFine: {
//           amount: fineSettings.corpus?.fixedFine?.amount || 0,
//           type: mapTypeToSymbol(fineSettings.corpus?.fixedFine?.type),
//         },
//         dailyFine: {
//           perDay: fineSettings.corpus?.dailyFine?.perDay || 0,
//           type: mapTypeToSymbol(fineSettings.corpus?.dailyFine?.type),
//         },
//         penaltyStartDay: fineSettings.corpus?.penaltyStartDay || 1, // ✅ added
//       },
//     };

//     return res.status(200).json({ settings: { maintenanceFine: response } });
//   } catch (error) {
//     console.error("Error fetching fine settings:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// module.exports = {
//   getMaintenanceFineSettings,
// };

const ApartmentSettings = require("../../../../model/apartment/apartmentSettings");

const getMaintenanceFineSettings = async (req, res) => {
  try {
    const apartment = req.auth?.apartmentId;

    if (!apartment) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    const doc = await ApartmentSettings.findOne({ apartment });

    const fineSettings = doc?.settings?.maintenanceFine?.corpus || {};

    const response = {
      fixedFine: {
        amount: fineSettings.fixedFine?.amount || 0,
        type: fineSettings.fixedFine?.type || "₹", // ✅ return symbol directly
      },
      dailyFine: {
        perDay: fineSettings.dailyFine?.perDay || 0,
        type: fineSettings.dailyFine?.type || "₹", // ✅ return symbol directly
      },
      penaltyStartDay: fineSettings.penaltyStartDay || 1,
    };

    return res.status(200).json({ settings: { corpus: response } });
  } catch (error) {
    console.error("Error fetching corpus fine settings:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getMaintenanceFineSettings,
};
