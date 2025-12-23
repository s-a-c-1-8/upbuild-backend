// const User = require("../../model/user/userModel");
// const Flat = require("../../model/flat/flatModel");

// exports.checkPhoneEmailAvailabilityInFlatsAndUser = async (req, res) => {
//   const { phone, email } = req.body;

//   if (!phone && !email) {
//     return res.status(400).json({ message: "Phone or Email is required." });
//   }

//   try {
//     const phoneQuery = [];
//     const emailQuery = [];

//     // 🔍 Flat-level phone checks
//     if (phone) {
//       phoneQuery.push(
//         { ownerPhoneNumber: phone },
//         { "tenantDetails.tenantPhoneNumber": phone },
//         { "tenantDetails.occupants.phoneNumber": phone },
//         { "occupantsData.phoneNumber": phone }
//       );
//     }

//     // 🔍 Flat-level email checks
//     if (email) {
//       emailQuery.push(
//         { ownerEmail: email },
//         { "tenantDetails.tenantEmail": email },
//         { "tenantDetails.occupants.email": email },
//         { "occupantsData.email": email }
//       );
//     }

//     // 🔁 Parallel database queries
//     const [userEmailConflict, userPhoneConflict, flatEmailConflict, flatPhoneConflict] = await Promise.all([
//       email ? User.findOne({ email }) : null,
//       phone ? User.findOne({ contactNumber: phone }) : null,
//       email && emailQuery.length > 0 ? Flat.findOne({ $or: emailQuery }) : null,
//       phone && phoneQuery.length > 0 ? Flat.findOne({ $or: phoneQuery }) : null,
//     ]);

//     const conflicts = [];

//     if (userEmailConflict || flatEmailConflict) {
//       conflicts.push("email");
//     }

//     if (userPhoneConflict || flatPhoneConflict) {
//       conflicts.push("phone");
//     }

//     if (conflicts.length > 0) {
//       return res.status(409).json({
//         message: `The following field(s) are already in use: ${conflicts.join(", ")}`,
//       });
//     }

//     return res.status(200).json({ message: "Phone and email are available." });
//   } catch (error) {
//     console.error("❌ Error checking phone/email:", error);
//     return res.status(500).json({
//       message: "Server error while checking phone/email.",
//       error: error.message,
//     });
//   }
// };
