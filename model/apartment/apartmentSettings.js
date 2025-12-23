const mongoose = require("mongoose");

const apartmentSettingsSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
      unique: true,
    },
    settings: {
      maintenanceFine: {
        // monthly: {
        //   fixedFine: {
        //     amount: { type: Number, default: 0 },
        //     type: {
        //       type: String,
        //       enum: ["rupees", "percentage"],
        //       default: "rupees",
        //     },
        //   },
        //   dailyFine: {
        //     perDay: { type: Number, default: 0 },
        //     type: {
        //       type: String,
        //       enum: ["rupees", "percentage"],
        //       default: "rupees",
        //     },
        //   },
        //   penaltyStartDay: {
        //     type: Number,
        //     min: 1,
        //     max: 30,
        //     default: 1, // ✅ default to 1st of the month
        //   },
        // },
        //   corpus: {
        //     fixedFine: {
        //       amount: { type: Number, default: 0 },
        //       type: {
        //         type: String,
        //         enum: ["rupees", "percentage"],
        //         default: "rupees",
        //       },
        //     },
        //     dailyFine: {
        //       perDay: { type: Number, default: 0 },
        //       type: {
        //         type: String,
        //         enum: ["rupees", "percentage"],
        //         default: "rupees",
        //       },
        //     },
        //     penaltyStartDay: {
        //       type: Number,
        //       min: 1,
        //       max: 30,
        //       default: 1,
        //     },
        //   },
        // },

        corpus: {
          fixedFine: {
            amount: { type: Number, default: 0 },
            type: {
              type: String,
              enum: ["₹", "%"], // ✅ directly store symbols
              default: "₹",
            },
          },
          dailyFine: {
            perDay: { type: Number, default: 0 },
            type: {
              type: String,
              enum: ["₹", "%"], // ✅ directly store symbols
              default: "₹",
            },
          },
          penaltyStartDay: {
            type: Number,
            min: 1,
            max: 30,
            default: 1, // ✅ default to 1st of the month
          },
        },
      }, // ✅ New Maintenance Account Mapping
      maintenanceAccounts: {
        monthlyAccount: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ApartmentBankDetails",
          default: null,
        },
        corpusAccount: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ApartmentBankDetails",
          default: null,
        },
        eventsAccount: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ApartmentBankDetails",
          default: null,
        },
      },

      // ✅ New Default Maintenance Line Item Reference
      defaultMaintenanceLineItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApartmentMonthlyMaintenanceLineItems",
        default: null,
      },

      // ✅ New: Default Maintenance Type
      defaultMaintenanceType: {
        type: String,
        enum: ["perFlat", "perSqFeet", "perFlatWithItems"],
        default: "perFlat",
      },
      // ⏬ Future settings go here
      // otp: { ... },
      // inactivity: { ... },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApartmentSettings", apartmentSettingsSchema);
