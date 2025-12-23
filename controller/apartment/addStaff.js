const mongoose = require("mongoose");
const User = require("../../model/user/userModel");
const ApartmentRole = require("../../model/apartment/apartmentRole");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const bcrypt = require("bcryptjs");
const logAction = require("../../utils/logAction"); // ✅ import logAction

exports.addStaff = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phone, email, address, apartment, role, password, agency } = req.body;

    if (!name || !phone || !role || !apartment || !password) {
      return res.status(400).json({
        message: "Name, phone, role, apartment, and password are required.",
      });
    }

    // 🔍 Check if user exists
    let user = await User.findOne({ contactNumber: phone }).session(session);
    let isNewUser = false;

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        name,
        contactNumber: phone,
        email: email?.trim() || undefined,
        address,
        password: hashedPassword,
        status: "Active",
        isMobileVerified: false,
        isEmailVerified: false,
      };

      user = await User.create([userData], { session }).then((res) => res[0]);
      isNewUser = true;
    }

    // 🔍 Fetch role object
    const apartmentRole = await ApartmentRole.findById(role).session(session);
    if (!apartmentRole) {
      throw new Error("Role not found for the given ID.");
    }

    // 🔁 Assign role if not already
    const existingAssignment = await UserRoleAssignment.findOne({
      user: user._id,
      apartment,
      role,
      ...(agency ? { agency } : {}),
    }).session(session);

    let newAssignment;
    if (!existingAssignment) {
      newAssignment = await UserRoleAssignment.create(
        [
          {
            user: user._id,
            apartment,
            role,
            agency: agency || undefined,
            active: true,
            startDate: new Date(),
          },
        ],
        { session }
      ).then((res) => res[0]);
    }

    await session.commitTransaction();
    session.endSession();

    // 🪵 Log the action
    await logAction({
      req,
      action: "ADD_STAFF",
      description: `${isNewUser ? "Created" : "Updated"} staff user & assigned role`,
      metadata: {
        userId: user._id,
        role: apartmentRole.name,
        roleId: apartmentRole._id,
        apartmentId: apartment,
        isNewUser,
        assignmentId: newAssignment?._id,
        agency: agency || null,
      },
    });

    return res.status(201).json({
      message: "Staff added and role assigned successfully.",
      user,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Error in addStaff:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};
