const MonthlyMaintenanceExpense = require("../../../model/apartment/expense");
const logAction = require("../../../utils/logAction");
const notifyApartmentAdmins = require("../../../utils/notifyApartmentAdmin");

exports.addExpense = async (req, res) => {
  try {
    let { apartmentId, category, description, amount, date } = req.body;

    if (!apartmentId || !category || !amount || !date) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // ✅ Convert date string to Date object
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format." });
    }

    // ✅ Format month for grouping — "Jul 2025"
    const formattedMonth = new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "numeric",
    }).format(parsedDate);

    // ✅ Handle invoice upload (optional)
    let invoiceUrl = null;
    if (
      req.processedUploads &&
      req.processedUploads.invoice &&
      req.processedUploads.invoice[0]
    ) {
      invoiceUrl =
        "/" + req.processedUploads.invoice[0].path.replace(/\\/g, "/");
    }

    const numericAmount = parseFloat(amount);

    const expenseItem = {
      category,
      description,
      amount: numericAmount,
      invoiceUrl,
      date: parsedDate, // ✅ Store full date here
    };

    let record = await MonthlyMaintenanceExpense.findOne({
      apartmentId,
      month: formattedMonth,
    });

    let isNew = false;

    if (record) {
      record.expenses.push(expenseItem);
      record.totalAmount += numericAmount;
      await record.save();
    } else {
      record = await MonthlyMaintenanceExpense.create({
        apartmentId,
        month: formattedMonth,
        expenses: [expenseItem],
        totalAmount: numericAmount,
      });
      isNew = true;
    }

    // ✅ Log the action
    await logAction({
      req,
      action: "ADD_MAINTENANCE_EXPENSE",
      description: isNew
        ? `Created expense record for ${formattedMonth}`
        : `Added new expense to ${formattedMonth}`,
      metadata: {
        category,
        description,
        amount: numericAmount,
        month: formattedMonth,
        invoiceUrl,
        date: parsedDate,
      },
    });

    // 🔔 Just call utility here
    await notifyApartmentAdmins({
      apartmentId,
      message: `New maintenance expense added: ${category} - ₹${numericAmount}`,
      logId: record._id,
      logModel: "MonthlyMaintenanceExpense",
      link: `${process.env.FRONTEND_URL}apartment/expense/details/${record._id}`,
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error("❌ Failed to add expense:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { category, description, amount } = req.body;

    if (!expenseId || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const numericAmount = parseFloat(amount);
    let invoiceUrl = null;

    if (
      req.processedUploads &&
      req.processedUploads.invoice &&
      req.processedUploads.invoice[0]
    ) {
      invoiceUrl =
        "/" + req.processedUploads.invoice[0].path.replace(/\\/g, "/");
    }

    const record = await MonthlyMaintenanceExpense.findOne({
      "expenses._id": expenseId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Expense item not found.",
      });
    }

    const expense = record.expenses.id(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found inside the group.",
      });
    }

    // 🧮 Adjust total
    record.totalAmount -= expense.amount;

    // ⏺ Store old values for audit
    const oldData = {
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
    };

    expense.category = category;
    expense.description = description;
    expense.amount = numericAmount;
    if (invoiceUrl) {
      expense.invoiceUrl = invoiceUrl;
    }

    record.totalAmount += numericAmount;
    await record.save();

    // ✅ Audit log
    await logAction({
      req,
      action: "UPDATE_EXPENSE",
      description: `Updated expense in ${record.month}`,
      metadata: {
        expenseId,
        month: record.month,
        oldData,
        newData: {
          category,
          description,
          amount: numericAmount,
          invoiceUrl: invoiceUrl || expense.invoiceUrl,
        },
      },
    });

    // 🔔 Notify admins
    await notifyApartmentAdmins({
      apartmentId: record.apartmentId,
      message: `Expense updated: ${category} - ₹${numericAmount}`,
      logId: record._id,
      logModel: "MonthlyMaintenanceExpense",
      link: `${process.env.FRONTEND_URL}apartment/expense/details/${record._id}`,
    });

    res.status(200).json({ success: true, message: "Expense updated." });
  } catch (error) {
    console.error("❌ Error updating expense:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating expense.",
    });
  }
};
