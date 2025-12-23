const Event = require("../../../../model/flat/maintenance/events");

exports.getEventsByApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const {
      page = 1,
      limit = 10,
      search = "",
      month = "",
      year = "",
    } = req.query;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required.",
      });
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      apartmentId,
      title: { $regex: search, $options: "i" },
    };

    const currentYear = new Date().getFullYear();

    if (month && year) {
      const start = new Date(`${year}-${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.eventDate = { $gte: start, $lt: end };
    } else if (month && !year) {
      const paddedMonth = month.padStart(2, "0");
      const start = new Date(`${currentYear}-${paddedMonth}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.eventDate = { $gte: start, $lt: end };
    } else if (!month && year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);
      filter.eventDate = { $gte: start, $lt: end };
    }

    const totalEvents = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .sort({ eventDate: -1 })
      .skip(skip)
      .limit(limitNumber)
      .select("title description eventDate targetAmount minDonation maxDonation contributeCount")
      .lean();

    return res.status(200).json({
      success: true,
      events,
      totalPages: Math.ceil(totalEvents / limitNumber),
      totalEvents,
    });
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching events.",
    });
  }
};
