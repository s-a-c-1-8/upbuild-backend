const BookingAmenity = require("../../../../model/flat/bookingAmenitySchema");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment");
const mongoose = require("mongoose");

exports.getMyBookings = async (req, res) => {
  try {
    const selectedRoleId = req.auth?.selectedRoleId || null;
    const flatId = req.auth?.flatId || null;

    if (!selectedRoleId) {
      return res
        .status(400)
        .json({ message: "User role (selectedRoleId) is missing." });
    }

    const roleAssignment = await UserRoleAssignment.findById(
      selectedRoleId
    ).populate("role");
    const roleSlug = roleAssignment?.role?.slug;

    if (!roleAssignment || !roleSlug) {
      return res.status(403).json({ message: "Access denied. Invalid role." });
    }

    if (roleSlug.toLowerCase() !== "occupants") {
      return res.status(403).json({
        message:
          "Access denied: Only occupants can view their amenity bookings.",
      });
    }

    // ✅ Pagination + filters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const date = req.query.date || "";

    const pipeline = [
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(selectedRoleId),
          flat: new mongoose.Types.ObjectId(flatId),
        },
      },

      ...(status ? [{ $match: { status: status.toLowerCase() } }] : []),

      ...(date
        ? [
            {
              $match: {
                bookingDate: {
                  $gte: new Date(date),
                  $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                },
              },
            },
          ]
        : []),

      // ✅ JOIN Amenity & Flat
      {
        $lookup: {
          from: "amenities",
          localField: "amenity",
          foreignField: "_id",
          as: "amenityInfo",
        },
      },
      { $unwind: "$amenityInfo" },

      {
        $lookup: {
          from: "flats",
          localField: "flat",
          foreignField: "_id",
          as: "flatInfo",
        },
      },
      { $unwind: "$flatInfo" },

      // ✅ JOIN createdBy → user → name
      {
        $lookup: {
          from: "userroleassignments",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByInfo",
        },
      },
      { $unwind: "$createdByInfo" },

      {
        $lookup: {
          from: "users",
          localField: "createdByInfo.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },

      // ✅ SEARCH FIX — now amenity, flat-block, user name
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "amenityInfo.name": { $regex: search, $options: "i" } },
                  { "flatInfo.flatName": { $regex: search, $options: "i" } },
                  { "flatInfo.blockName": { $regex: search, $options: "i" } },
                  { "userInfo.name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$flatInfo.flatName",
                            "-",
                            "$flatInfo.blockName",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      // 👉 derive numeric start minutes from timeSlot like "3:00 PM – 4:00 PM"
      {
        $addFields: {
          _slotNorm: {
            $replaceAll: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: "$timeSlot",
                      find: "—",
                      replacement: "-",
                    },
                  },
                  find: "–",
                  replacement: "-",
                },
              },
              find: " - ",
              replacement: "-",
            },
          },
        },
      },
      {
        $addFields: {
          _startStr: {
            $trim: {
              input: { $arrayElemAt: [{ $split: ["$_slotNorm", "-"] }, 0] },
            },
          },
        },
      },
      { $addFields: { _hmAmpm: { $split: ["$_startStr", " "] } } },
      {
        $addFields: {
          _hm: { $arrayElemAt: ["$_hmAmpm", 0] },
          _ampm: { $toUpper: { $arrayElemAt: ["$_hmAmpm", 1] } },
        },
      },
      {
        $addFields: {
          _h: { $toInt: { $arrayElemAt: [{ $split: ["$_hm", ":"] }, 0] } },
          _m: { $toInt: { $arrayElemAt: [{ $split: ["$_hm", ":"] }, 1] } },
        },
      },
      {
        $addFields: {
          _h24: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [{ $eq: ["$_ampm", "AM"] }, { $eq: ["$_h", 12] }],
                  },
                  then: 0,
                },
                {
                  case: {
                    $and: [{ $eq: ["$_ampm", "PM"] }, { $ne: ["$_h", 12] }],
                  },
                  then: { $add: ["$_h", 12] },
                },
              ],
              default: "$_h",
            },
          },
        },
      },
      {
        $addFields: {
          _startMinutes: { $add: [{ $multiply: ["$_h24", 60] }, "$_m"] },
        },
      },

      // ✅ sort: newest date first, then later slot first (desc)
      { $sort: { bookingDate: -1, _startMinutes: -1, _id: 1 } },

      // then hide helpers
      {
        $project: {
          _id: 1,
          bookingDate: 1,
          timeSlot: 1,
          status: 1,
          amenityInfo: 1,
          flatInfo: 1,
          createdByName: "$userInfo.name",
        },
      },

      { $skip: skip },
      { $limit: limit },
    ];

    const myBookings = await BookingAmenity.aggregate(pipeline);

    return res.json({
      message: "Bookings fetched successfully.",
      currentPage: page,
      totalPages: Math.ceil(myBookings.length / limit),
      bookings: myBookings,
    });
  } catch (err) {
    console.error("❌ Error in getMyBookings:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch bookings.", error: err.message });
  }
};
