const mongoose = require("mongoose");
const BookingAmenity = require("../../../model/flat/bookingAmenitySchema");
const Apartment = require("../../../model/apartment/apartmentModel");
const Amenity = require("../../../model/superAdmin/amenity");

exports.getAllBookings = async (req, res) => {
  try {
    const { activeRole, auth } = req;
    const { page = 1, limit = 10, search = "", date = "" } = req.query;
    // console.log("search", search);

    const apartmentId =
      auth?.apartmentId ||
      activeRole?.apartmentId ||
      activeRole?.apartment?._id;

    if (!apartmentId) {
      return res.status(400).json({
        message: "Apartment ID missing from user context.",
      });
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = { apartment: new mongoose.Types.ObjectId(apartmentId) };

    // ✅ STATUS FILTER ADDED HERE (ONLY CHANGE)
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status.toLowerCase();
    }

    // 📅 Date filter
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.bookingDate = { $gte: start, $lte: end };
    }

    // 🔍 SEARCH FILTER (UNCHANGED)
    if (search) {
      const searchRegex = new RegExp(search, "i");

      const matches = await BookingAmenity.aggregate([
        { $match: { apartment: new mongoose.Types.ObjectId(apartmentId) } },

        {
          $lookup: {
            from: "flats",
            localField: "flat",
            foreignField: "_id",
            as: "flatInfo",
          },
        },
        {
          $lookup: {
            from: "amenities",
            localField: "amenity",
            foreignField: "_id",
            as: "amenityInfo",
          },
        },
        {
          $lookup: {
            from: "userroleassignments",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdByInfo.user",
            foreignField: "_id",
            as: "userInfo",
          },
        },

        {
          $match: {
            $or: [
              { "userInfo.name": searchRegex },
              { "userInfo.phone": searchRegex },
              { "flatInfo.flatName": searchRegex },
              { "flatInfo.blockName": searchRegex },
              { "amenityInfo.name": searchRegex },

              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: [
                        { $arrayElemAt: ["$flatInfo.flatName", 0] },
                        "-",
                        { $arrayElemAt: ["$flatInfo.blockName", 0] },
                      ],
                    },
                    regex: searchRegex,
                  },
                },
              },
            ],
          },
        },
        { $project: { _id: 1 } },
      ]);

      const matchedIds = matches.map((m) => m._id);
      filter._id = matchedIds.length ? { $in: matchedIds } : { $in: [] };
    }

    // 🧮 Count total
    // 🧮 Count total
    const totalBookings = await BookingAmenity.countDocuments(filter);

    // 📦 Fetch data with proper slot sorting
    const bookings = await BookingAmenity.aggregate([
      { $match: filter },

      // derive numeric start minutes from timeSlot like "3:00 PM – 4:00 PM"
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

      // sort: newest date first, then later slot first
      { $sort: { bookingDate: -1, _startMinutes: -1, _id: 1 } },

      // lookups (equivalent to your populates)
      {
        $lookup: {
          from: "apartments",
          localField: "apartment",
          foreignField: "_id",
          as: "apartment",
        },
      },
      { $unwind: "$apartment" },
      {
        $lookup: {
          from: "amenities",
          localField: "amenity",
          foreignField: "_id",
          as: "amenity",
        },
      },
      { $unwind: "$amenity" },
      {
        $lookup: {
          from: "flats",
          localField: "flat",
          foreignField: "_id",
          as: "flat",
        },
      },
      { $unwind: "$flat" },
      {
        $lookup: {
          from: "userroleassignments",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },
      {
        $lookup: {
          from: "users",
          localField: "createdBy.user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // shape like your lean()+populate result
      {
        $project: {
          _id: 1,
          bookingDate: 1,
          timeSlot: 1,
          status: 1,
          remarks: 1,
          apartment: {
            name: "$apartment.name",
            address: "$apartment.address",
            _id: "$apartment._id",
          },
          amenity: {
            name: "$amenity.name",
            type: "$amenity.type",
            _id: "$amenity._id",
          },
          flat: {
            flatName: "$flat.flatName",
            blockName: "$flat.blockName",
            _id: "$flat._id",
          },
          createdBy: {
            role: "$createdBy.role",
            flat: "$createdBy.flat",
            user: {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
              phone: "$user.phone",
            },
          },
        },
      },

      { $skip: skip },
      { $limit: limitNum },
    ]);

    return res.json({
      message: "Bookings fetched successfully.",
      currentPage: pageNum,
      totalPages: Math.ceil(totalBookings / limitNum),
      totalBookings,
      limit: limitNum,
      bookings,
    });
  } catch (err) {
    console.error("❌ Error in getAllBookings:", err);
    return res.status(500).json({
      message: "Failed to fetch apartment bookings.",
      error: err.message,
    });
  }
};
