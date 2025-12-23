const MonthlyMaintenanceExpense = require("../../../model/apartment/expense");


exports.getExpensesByApartment = async (req, res) => {
  try {
    const apartmentId = req.params.apartmentId;
    const { month, year } = req.query;

    if (!apartmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Apartment ID is required." });
    }

    let filter = { apartmentId };

    if (month && year) {
      filter.month = `${month} ${year}`; // e.g., "Jun 2025"
    } else if (year) {
      // Match any month ending with that year
      filter.month = new RegExp(`\\b${year}$`, "i");
    } else if (month) {
      // Match any month starting with that month abbreviation
      filter.month = new RegExp(`^${month}\\b`, "i");
    }

    const records = await MonthlyMaintenanceExpense.find(filter).lean();

    // Sort by real date value parsed from "Mon YYYY"
    const sortedRecords = records.sort((a, b) => {
      const aDate = new Date(`1 ${a.month}`);
      const bDate = new Date(`1 ${b.month}`);
      return bDate - aDate;
    });

    const summary = sortedRecords.map((record) => ({
      _id: record._id,
      month: record.month,
      totalAmount: record.totalAmount,
      items: record.expenses.length,
    }));

    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error("❌ Error fetching monthly expenses:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching expenses.",
    });
  }
};


exports.getMonthlyExpenseDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Expense ID is required." });
    }

    const record = await MonthlyMaintenanceExpense.findById(id).lean();

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Expense record not found." });
    }

    // ✅ Sort expenses by latest first (descending by createdAt)
    record.expenses.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("❌ Failed to fetch expense detail:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching expense details.",
    });
  }
};
