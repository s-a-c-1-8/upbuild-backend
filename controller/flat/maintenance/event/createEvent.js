// const Event = require("../../../../model/flat/maintenance/events");
// const Apartment = require("../../../../model/apartment/apartmentModel");
// const logAction = require("../../../../utils/logAction");

// exports.createEvent = async (req, res) => {
//   try {
//     const {
//       apartmentId,
//       title,
//       description,
//       eventDate,
//       targetAmount,
//       minDonation,
//       maxDonation,
//     } = req.body;

//     if (!apartmentId || !title || !eventDate || !targetAmount) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields.",
//       });
//     }

//     const apartmentDoc = await Apartment.findById(apartmentId).select(
//       "apartmentId"
//     );
//     if (!apartmentDoc) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Apartment not found." });
//     }

//     const newEvent = new Event({
//       apartmentId,
//       title,
//       description,
//       eventDate,
//       targetAmount,
//       minDonation,
//       maxDonation,
//     });

//     await newEvent.save();

//     // ✅ Log the action (no role check)
//     await logAction({
//       req,
//       action: "CREATE_EVENT",
//       description: `Event Created: ${title}`,
//       metadata: {
//         apartmentId,
//         targetAmount,
//         minDonation,
//         maxDonation,
//         eventDate,
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Event created successfully.",
//       event: newEvent,
//     });
//   } catch (err) {
//     console.error("❌ Error creating event:", err);
//     res.status(500).json({ success: false, message: "Server error." });
//   }
// };

const Event = require("../../../../model/flat/maintenance/events");
const Apartment = require("../../../../model/apartment/apartmentModel");
const ApartmentSettings = require("../../../../model/apartment/apartmentSettings"); // ✅ added
const logAction = require("../../../../utils/logAction");
const { notifyHOFOccupants } = require("../../../../utils/notifyHOFOccupants");
const flatModel = require("../../../../model/flat/flatModel");

exports.createEvent = async (req, res) => {
  try {
    const {
      apartmentId,
      title,
      description,
      eventDate,
      targetAmount,
      minDonation,
      maxDonation,
    } = req.body;

    if (!apartmentId || !title || !eventDate || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const apartmentDoc = await Apartment.findById(apartmentId).select(
      "apartmentId"
    );
    if (!apartmentDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found." });
    }

    // ✅ Fetch events bank account linked in settings
    const settings = await ApartmentSettings.findOne({
      apartment: apartmentId,
    }).populate("settings.maintenanceAccounts.eventsAccount");

    if (!settings?.settings?.maintenanceAccounts?.eventsAccount) {
      return res.status(400).json({
        success: false,
        message:
          "No events bank account linked. Please link a bank in apartment settings.",
      });
    }

    const account = settings.settings.maintenanceAccounts.eventsAccount;
    const bankDetails = {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      referenceName: account.referenceName,
    };

    const newEvent = new Event({
      apartmentId,
      title,
      description,
      eventDate,
      targetAmount,
      minDonation,
      maxDonation,
      ...bankDetails, // ✅ attach bank details to event
    });

    await newEvent.save();

    // ✅ Log the action
    await logAction({
      req,
      action: "CREATE_EVENT",
      description: `Event Created: ${title}`,
      metadata: {
        apartmentId,
        targetAmount,
        minDonation,
        maxDonation,
        eventDate,
        bankDetails,
      },
    });

    const flats = await flatModel.find({ apartmentId }).select("_id");

    // ✅ Send notification to each flat HOF
    await Promise.all(
      flats.map((flat) =>
        notifyHOFOccupants({
          apartmentId,
          flatId: flat._id,
          message: `A new event has been added: ${title}. Please contribute.`,
          logId: newEvent._id,
          logModel: "EventFlatMaintenance",
          link: `${
            process.env.FRONTEND_URL
          }apartment/maintenance/events?search=${title.replace(/\s+/g, "+")}`,
        })
      )
    );

    res.status(201).json({
      success: true,
      message: "Event created successfully.",
      event: newEvent,
    });
  } catch (err) {
    console.error("❌ Error creating event:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
