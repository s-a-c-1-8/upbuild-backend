const Apartment = require("../../../model/apartment/apartmentModel");
const Flat = require("../../../model/flat/flatModel");

// ✅ Get All States (From apartmentAddress.state)
exports.getAllStates = async (req, res) => {
  try {
    const states = await Apartment.aggregate([
      {
        $match: {
          "apartmentAddress.state": { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$apartmentAddress.state",
          name: { $first: "$apartmentAddress.state" },
        },
      },
      {
        $sort: { name: 1 },
      },
    ]).collation({ locale: "en", strength: 1 }); // ✅ case-insensitive sort

    return res.status(200).json({ success: true, states });
  } catch (error) {
    console.error("Error fetching states:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch states",
      error: error.message,
    });
  }
};

// ✅ Get All Cities By State (From apartmentAddress.city)
exports.getCitiesByState = async (req, res) => {
  try {
    const { state } = req.params;

    if (!state) {
      return res
        .status(400)
        .json({ success: false, message: "State is required" });
    }

    let cities = await Apartment.distinct("apartmentAddress.city", {
      "apartmentAddress.state": state,
    });

    // ✅ Sort alphabetically, case-insensitive
    cities = cities.sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" })
    );

    res.status(200).json({ success: true, cities });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get All Apartments by Location (state, city, search)
exports.getApartmentsByLocation = async (req, res) => {
  try {
    const { state, city, search } = req.query;

    const query = {};

    if (state) {
      query["apartmentAddress.state"] = state;
    }

    if (city) {
      query["apartmentAddress.city"] = city;
    }

    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search.trim(), $options: "i" }; // case-insensitive name match
    }

    const apartments = await Apartment.find(query)
      .select("name apartmentAddress apartmentPhoto approved")
      .collation({ locale: "en", strength: 1 }) // ✅ case-insensitive sorting
      .sort({ name: 1 });

    res.status(200).json({ success: true, apartments });
  } catch (error) {
    console.error("Error fetching apartments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get Flats By Apartment ID (with optional search)
exports.getFlatsByApartmentForNewUser = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { search } = req.query; // 👈 take search from query

    if (!apartmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Apartment ID is required" });
    }

    // Build query
    const query = { apartmentId };

    if (search && search.trim() !== "") {
      query.$or = [
        { blockName: { $regex: search.trim(), $options: "i" } },
        { flatName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const flats = await Flat.find(query)
      .select(
        "flatName flatType blockName facing squareFootage apartmentStatus city state fullAddress"
      )
      .populate({
        path: "apartmentId",
        select: "name apartmentAddress",
      })
      .collation({ locale: "en", strength: 1 }) // ✅ case-insensitive sorting
      .sort({ blockName: 1, flatName: 1 });

    res.status(200).json({ success: true, flats });
  } catch (error) {
    console.error("Error fetching flats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
