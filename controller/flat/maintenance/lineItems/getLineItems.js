const mongoose = require("mongoose");
const ApartmentMonthlyMaintenanceLineItems = require("../../../../model/flat/maintenance/maintenanceLineItems"); 

// 🔹 Get all line items (list view)
exports.getAllLineItemsNames = async (req, res) => {
  try {
    const apartmentId = req.auth?.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment id missing"
      });
    }

    const items = await ApartmentMonthlyMaintenanceLineItems
      .find(
        { apartment: apartmentId },
        "_id lineItemName totalPrice reasons applyPenalty tenantCharge penaltySettings" // ✅ include penaltySettings
      )
      .sort({ createdAt: -1 })
      .lean();

    const dataWithCounts = items.map(it => ({
      _id: it._id,
      lineItemName: it.lineItemName,
      totalPrice: it.totalPrice,
      reasonCount: it.reasons?.length || 0,
      applyPenalty: it.applyPenalty || false,
      tenantCharge: it.tenantCharge || 0,
      penaltySettings: it.penaltySettings || null, // ✅ include penalty settings
    }));

    return res.json({
      success: true,
      count: dataWithCounts.length,
      data: dataWithCounts
    });
  } catch (err) {
    console.error("getAllLineItems error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// 🔹 Get details of a single line item
exports.getMaintenanceLineItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance item ID"
      });
    }

    const item = await ApartmentMonthlyMaintenanceLineItems.findById(id)
      .populate("apartment", "name address")
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Maintenance line item not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: item._id,
        apartment: item.apartment,
        lineItemName: item.lineItemName,
        reasons: item.reasons || [],
        totalPrice: item.totalPrice || 0,
        applyPenalty: item.applyPenalty || false,
        tenantCharge: item.tenantCharge || 0,
        penaltySettings: item.penaltySettings || null, // ✅ include penalty settings
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    });
  } catch (err) {
    console.error("Error fetching line item details:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching line item details"
    });
  }
};
