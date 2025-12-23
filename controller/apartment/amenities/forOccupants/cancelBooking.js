const BookingAmenity = require("../../../../model/flat/bookingAmenitySchema");

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { activeRole, auth } = req;
    const selectedRoleId = auth?.selectedRoleId || activeRole?._id;

    if (!selectedRoleId) {
      return res.status(400).json({
        message: "User role (selectedRoleId) is missing.",
      });
    }

    // 🔍 Find booking and verify ownership
    const booking = await BookingAmenity.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.createdBy.toString() !== selectedRoleId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to cancel this booking.",
      });
    }

    // ⛔ Prevent double cancellation
    if (booking.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "This booking is already cancelled." });
    }

    // ✅ Update status to cancelled
    booking.status = "cancelled";
    booking.remarks = "Cancelled by user";
    await booking.save();

    res.json({
      message: "Booking cancelled successfully.",
      booking,
    });
  } catch (err) {
    console.error("❌ cancelBooking error:", err);
    res.status(500).json({
      message: "Failed to cancel booking.",
      error: err.message,
    });
  }
};
