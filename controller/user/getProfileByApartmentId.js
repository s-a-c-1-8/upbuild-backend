const mongoose = require("mongoose");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");

exports.getUsersByApartmentGroupedByFlat = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const result = await UserRoleAssignment.aggregate([
      {
        $match: {
          apartment: new mongoose.Types.ObjectId(apartmentId),
          active: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },

      {
        $lookup: {
          from: "apartmentroles",
          localField: "role",
          foreignField: "_id",
          as: "roleDetails",
        },
      },
      { $unwind: "$roleDetails" },

      {
        $group: {
          _id: "$flat",
          users: {
            $push: {
              userRoleAssignmentId: "$_id",
              relationshipType: "$relationshipType",
              role: {
                _id: "$roleDetails._id",
                name: "$roleDetails.name",
              },
              user: {
                _id: "$userDetails._id",
                name: "$userDetails.name",
                contactNumber: "$userDetails.contactNumber",
                email: "$userDetails.email",
                image: "$userDetails.image", // ✅ Add this line
              },
            },
          },
        },
      },

      {
        $lookup: {
          from: "flats",
          localField: "_id",
          foreignField: "_id",
          as: "flatDetails",
        },
      },
      {
        $addFields: {
          flat: {
            $cond: {
              if: { $gt: [{ $size: "$flatDetails" }, 0] },
              then: {
                flatName: { $arrayElemAt: ["$flatDetails.flatName", 0] },
                blockName: { $arrayElemAt: ["$flatDetails.blockName", 0] },
                flatType: { $arrayElemAt: ["$flatDetails.flatType", 0] },
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          flatDetails: 0,
        },
      },

      // ✅ Add this stage to sort by flatName (001, 002, etc.)
      {
        $sort: {
          "flat.flatName": 1, // Ascending order by flat name
        },
      },
    ]);

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching users by apartment:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
