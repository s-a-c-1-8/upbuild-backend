// const bcrypt = require("bcryptjs");
// const User = require("../../model/user/userModel");
// const Flat = require("../../model/flat/flatModel");
// const ApartmentRole = require("../../model/apartment/apartmentRole");

// exports.assignUserRole = async (
//   req,
//   res,
//   skipResponse = false,
//   session = null
// ) => {
//   try {
//     const {
//       name,
//       email,
//       contactNumber,
//       roleId,
//       apartmentId,
//       flatId,
//       password,
//     } = req.body;

//     if (!name || !contactNumber || !roleId || !apartmentId) {
//       const msg = { message: "Missing required fields." };
//       return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//     }

//     // ✅ Session-aware fetch of role
//     const roleDoc = session
//       ? await ApartmentRole.findById(roleId).session(session)
//       : await ApartmentRole.findById(roleId);

//     if (!roleDoc) {
//       const msg = { message: "Invalid role." };
//       return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//     }

//     const roleSlug = roleDoc.slug;

//     const existingUser = await User.findOne({
//       $or: [{ email }, { contactNumber }],
//     });

//     if (existingUser) {
//       if (String(existingUser.apartment) !== String(apartmentId)) {
//         const msg = { message: "User exists in another apartment." };
//         return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//       }

//       const hasRole = existingUser.userRole.some(
//         (r) => String(r) === String(roleId)
//       );
//       if (hasRole) {
//         const msg = { message: `User already has the role ${roleSlug}.` };
//         return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//       }

//       if (roleSlug === "occupants") {
//         const sameFlatOccupant = await User.findOne({
//           flatId,
//           userRole: roleId,
//         });
//         if (sameFlatOccupant) {
//           const msg = {
//             message: "This flat already has an occupant with this role.",
//           };
//           return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//         }
//         existingUser.flatId = flatId;
//       }

//       if (
//         roleSlug === "security" ||
//         roleSlug === "house-keeping" ||
//         roleSlug === "apartment-sub-admin"
//       ) {
//         const adminRoles = await ApartmentRole.find({
//           _id: { $in: existingUser.userRole },
//         });

//         const hasHigherRole = adminRoles.some((r) =>
//           ["apartment-admin", "apartment-sub-admin"].includes(r.slug)
//         );
//         if (hasHigherRole) {
//           const msg = {
//             message:
//               "User is already Apartment Admin/Apartemnt SubAdmin. Cannot assign selected role.",
//           };
//           return skipResponse ? Promise.reject(msg) : res.status(400).json(msg);
//         }
//       }

//       existingUser.userRole.push(roleId);
//       await existingUser.save({ session });

//       const success = {
//         message: `Role ${roleSlug} added to existing user.`,
//         user: existingUser,
//       };
//       return skipResponse ? success : res.status(200).json(success);
//     }

//     // New user
//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 10);
//     }

//     const newUser = new User({
//       name,
//       email,
//       contactNumber,
//       apartment: apartmentId,
//       flatId: roleSlug === "occupants" ? flatId : null,
//       userRole: [roleId],
//       password: hashedPassword,
//     });

//     await newUser.save({ session });

//     const success = {
//       message: `User created with role ${roleSlug}.`,
//       user: newUser,
//     };
//     return skipResponse ? success : res.status(201).json(success);
//   } catch (error) {
//     console.error("Assign Role Error:", error);
//     const err = { message: "Server error.", error: error.message };
//     return skipResponse ? Promise.reject(err) : res.status(500).json(err);
//   }
// };
