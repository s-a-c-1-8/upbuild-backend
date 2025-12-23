const mongoose = require("mongoose");

const expenseItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    invoiceUrl: { type: String },
    date: { type: Date, required: true }, // ✅ Add actual date here
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

const monthlyMaintenanceExpenseSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    month: { type: String, required: true }, // format: e.g. "Jul 2025"
    expenses: [expenseItemSchema],
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "MonthlyMaintenanceExpense",
  monthlyMaintenanceExpenseSchema
);
