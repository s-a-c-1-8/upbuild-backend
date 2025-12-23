const VisitorsBulk = require("../../../../../model/flat/visitorBulk"); // adjust path as needed

exports.approveBulkVisitorOccupant = async (req, res) => {
  const { visitorId } = req.params;

  try {
    // 1️⃣ Find the bulk document that has this visitor
    const bulkVisitorDoc = await VisitorsBulk.findOne({ "visitors._id": visitorId });

    if (!bulkVisitorDoc) {
      return res.status(404).json({ message: "Visitor not found in bulk list" });
    }

    // 2️⃣ Check event validity
    const today = new Date();
    let isExpired = false;

    if (bulkVisitorDoc.isMultipleDays) {
      // if multi-day event → check toDate
      if (bulkVisitorDoc.toDate && new Date(bulkVisitorDoc.toDate) < today) {
        isExpired = true;
      }
    } else {
      // single day event → check visitDate
      if (bulkVisitorDoc.visitDate && new Date(bulkVisitorDoc.visitDate) < today) {
        isExpired = true;
      }
    }

    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: "Event date has expired. You cannot approve this visitor.",
      });
    }

    // 3️⃣ Update the specific visitor’s status
    await VisitorsBulk.findOneAndUpdate(
      { "visitors._id": visitorId },
      { $set: { "visitors.$.occupantAcceptStatus": "Accepted" } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Visitor approved successfully",
    });
  } catch (err) {
    console.error("❌ Error approving visitor:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
