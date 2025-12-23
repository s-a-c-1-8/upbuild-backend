const Visitor = require("../../../model/flat/visitorModel");

exports.searchVisitors = async (req, res) => {
  try {
    const { apartmentId, phoneNumber } = req.body;

    if (!apartmentId || !phoneNumber) {
      return res.status(400).json({ message: "Apartment ID and phone number required" });
    }

    const regex = new RegExp(phoneNumber, "i");

    const visitors = await Visitor.find({
      apartment: apartmentId,
      phoneNumber: { $regex: regex },
    }).select("name phoneNumber address gender photo");

    res.status(200).json({ visitors });
  } catch (error) {
    console.error("Search Visitors Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
