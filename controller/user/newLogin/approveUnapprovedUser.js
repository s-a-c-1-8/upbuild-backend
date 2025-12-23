const mongoose = require("mongoose");
const Flat = require("../../../model/flat/flatModel");
const User = require("../../../model/user/userModel");
const UnapprovedUser = require("../../../model/user/unapprovedUser");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../model/apartment/apartmentRole");

exports.approveUnapprovedUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { unapprovedUserId, flatId } = req.body;
    if (!unapprovedUserId || !flatId) {
      return res.status(400).json({
        message: "UnapprovedUserId and FlatId are required",
      });
    }

    // ✅ Find flat
    const flat = await Flat.findById(flatId)
      .populate("apartmentId", "_id name")
      .session(session);
    if (!flat) {
      return res.status(404).json({ message: "Flat not found" });
    }

    // ✅ Get unapproved user
    const unapproved = await UnapprovedUser.findById(unapprovedUserId).session(session);
    if (!unapproved) {
      return res.status(404).json({ message: "Unapproved user not found" });
    }

    // ✅ findOrCreateUser (same as in createFlatData)
    const findOrCreateUser = async ({ name, contactNumber, isMobileVerified }) => {
      let user = await User.findOne({ contactNumber }).session(session);
      if (!user) {
        const userData = {
          name,
          contactNumber,
          status: "Active",
          isMobileVerified:true,
          isEmailVerified: false,
        };
        user = await User.create([userData], { session }).then((res) => res[0]);
      }
      return user;
    };

    const user = await findOrCreateUser({
      name: unapproved.name,
      contactNumber: unapproved.contactNumber,
      isMobileVerified: true,
    });

    // ✅ Decide relationship type & role slug
    let relationshipType;
    if (flat.ownerStaying) {
      relationshipType = "owner_occupant";
    } else {
      relationshipType = "tenant_occupant"; // or tenant_occupant depending on your business rule
    }

    // ✅ Fetch role
    const role = await ApartmentRole.findOne({
      slug: "occupants",
      apartment: flat.apartmentId._id,
    }).session(session);

    if (!role) {
      throw new Error("Role 'occupants' not found for apartment");
    }

    // ✅ Create assignment
    await UserRoleAssignment.create(
      [
        {
          user: user._id,
          apartment: flat.apartmentId._id,
          flat: flat._id,
          role: role._id,
          relationshipType,
          active: true,
          startDate: new Date(),
        },
      ],
      { session }
    );

    // ✅ Delete unapproved record
    await UnapprovedUser.findByIdAndDelete(unapprovedUserId).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "User approved and assigned to flat",
      user,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Error approving user:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
