const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");

exports.isComplaintAssignedToMe = async (req, res) => {
  try {
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!selectedRoleId || !mongoose.Types.ObjectId.isValid(selectedRoleId)) {
      return res.status(400).json({ message: "Valid Role ID is required" });
    }

    // Check if any complaint is assigned to this role
    const complaintExists = await Complaint.exists({
      assignedTo: selectedRoleId,
    });

    return res.status(200).json({
      assigned: !!complaintExists,
    });
  } catch (error) {
    console.error("❌ Error checking assigned complaints:", error);
    return res.status(500).json({
      message: "Server error while checking complaint assignment",
      error: error.message,
    });
  }
};
