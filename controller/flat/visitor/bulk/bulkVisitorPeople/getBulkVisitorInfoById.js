const VisitorsBulk = require("../../../../../model/flat/visitorBulk");

exports.getBulkVisitorByVisitorId = async (req, res) => {
  try {
    const visitorId = req.params.visitorId;

    if (!visitorId) {
      return res.status(400).json({ message: "Visitor ID is required" });
    }

    // Search across all bulk documents for a visitor with this _id
    const bulkDoc = await VisitorsBulk.findOne({ "visitors._id": visitorId })
      .populate("flatId") // to get blockName and flatName
      .lean();

    if (!bulkDoc) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    const visitor = bulkDoc.visitors.find(
      (v) => v._id.toString() === visitorId
    );

    if (!visitor) {
      return res
        .status(404)
        .json({ message: "Visitor not found in bulk entry" });
    }

    const response = {
      visitorId: visitor._id,
      name: visitor.name,
      phoneNumber: visitor.phoneNumber,
      photo: visitor.photo || null, // ✅ Added photo
      status: visitor.status,
      occupantAcceptStatus: visitor.occupantAcceptStatus,
      flatBlock: bulkDoc.flatId?.blockName || null,
      flatName: bulkDoc.flatId?.flatName || null,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in getBulkVisitorByVisitorId:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
