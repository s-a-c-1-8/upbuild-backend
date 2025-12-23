const mongoose = require("mongoose");
const Complaint = require("../../../model/flat/complaint");
const logAction = require("../../../utils/logAction");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const Role = require("../../../model/apartment/apartmentrole");
const notifyOccupants = require("../../../utils/notifyOccupants");
const notifyApartmentAdmins = require("../../../utils/notifyApartmentAdmin");

exports.updateComplaintStatus = async (req, res) => {
  const { complaintId } = req.params;
  const { status, statusDescription } = req.body;
  const selectedRoleId = req.auth?.selectedRoleId || null;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 🚫 Prevent further status changes if already finalized
    if (complaint.status === "Resolved" || complaint.status === "Rejected") {
      return res.status(400).json({
        message: `Cannot update status. Complaint is already ${complaint.status.toLowerCase()}.`,
      });
    }

    // ✅ Fetch updater info
    let updaterInfo = null;
    if (selectedRoleId && mongoose.Types.ObjectId.isValid(selectedRoleId)) {
      updaterInfo = await UserRoleAssignment.findById(selectedRoleId)
        .populate("user", "name email")
        .populate("role", "name");
    }

    // ✅ Update complaint status
    complaint.status = status;
    complaint.statusDescription = statusDescription || "";
    complaint.statusChangedAt = new Date();
    complaint.statusUpdatedBy = updaterInfo?._id || null; // ✅ Save updater

    await complaint.save();

    // 🪵 Log the action
    await logAction({
      req,
      action: "UPDATE_COMPLAINT_STATUS",
      description: `Updated status of complaint ${complaint.complaintId} to ${status}`,
      metadata: {
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        newStatus: status,
        statusDescription: statusDescription || null,
        updatedBy: updaterInfo?.user?.name || "Unknown",
        role: updaterInfo?.role?.name || "Unknown",
        userRoleAssignmentId: updaterInfo?._id?.toString() || null,
      },
    });

    // 🔔 Notify occupants
    await notifyOccupants({
      apartmentId: complaint.apartment,
      flatId: complaint.flat,
      message: `The status of your complaint "${
        complaint.title
      }" has been updated to "${status}". ${statusDescription || ""}`,
      logId: complaint._id,
      logModel: "Complaint",
      link: `${process.env.FRONTEND_URL}apartment/complaints/details/${complaint._id}`,
    });

    // 🔔 Notify admins
    await notifyApartmentAdmins({
      apartmentId: complaint.apartment,
      message: `Status of complaint "${
        complaint.title
      }" has been updated to ${status}. ${statusDescription || ""}`,
      logId: complaint._id,
      logModel: "Complaint",
      link: `${process.env.FRONTEND_URL}apartment/complaints/details/${complaint._id}`,
    });

    return res.status(200).json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating complaint status:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId).select(
      "status statusDescription"
    );

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    return res.status(200).json({
      message: "Status fetched successfully",
      data: {
        status: complaint.status,
        statusDescription: complaint.statusDescription,
      },
    });
  } catch (err) {
    console.error("Error fetching complaint status:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
