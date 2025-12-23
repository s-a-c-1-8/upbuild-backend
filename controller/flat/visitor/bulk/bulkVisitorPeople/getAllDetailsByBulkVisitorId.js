const VisitorsBulk = require("../../../../../model/flat/visitorBulk");
const UserRoleAssignment = require("../../../../../model/user/userRoleAssignment");
const User = require("../../../../../model/user/userModel");

exports.getAllVisitorsBulkDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    const visitorBulk = await VisitorsBulk.findById(id).populate(
      "flatId",
      "blockName flatName ownerStaying"
    );

    if (!visitorBulk) {
      return res.status(404).json({ error: "Record not found" });
    }

    let occupantDetails = null;

    if (visitorBulk.flatId) {
      const flatId = visitorBulk.flatId._id;
      const relationshipType = visitorBulk.flatId.ownerStaying
        ? "owner"
        : "tenant";

      const roleAssignment = await UserRoleAssignment.findOne({
        flat: flatId,
        relationshipType,
        active: true,
      }).populate("user", "name contactNumber");

      if (roleAssignment?.user) {
        occupantDetails = {
          name: roleAssignment.user.name,
          phoneNumber: roleAssignment.user.contactNumber,
          relationship: relationshipType,
        };
      }
    }

    // ✅ Search logic for `visitorInfoId`
    let filteredVisitors = visitorBulk.visitors || [];
    if (search && typeof search === "string") {
      const query = search.trim().toLowerCase();
      filteredVisitors = filteredVisitors.filter((v) =>
        v?.visitorInfoId?.toLowerCase().includes(query)
      );
    }

    const response = {
      _id: visitorBulk._id,
      bulkVisitorId: visitorBulk.bulkVisitorId,
      apartmentId: visitorBulk.apartmentId,
      eventPurpose: visitorBulk.eventPurpose,
      isMultipleDays: visitorBulk.isMultipleDays,
      expectedCount: visitorBulk.expectedCount,
      fromTime: visitorBulk.fromTime,
      toTime: visitorBulk.toTime,
      notes: visitorBulk.notes,
      bulkVisitorLink: visitorBulk.bulkVisitorLink || null,
      checkInTime: visitorBulk.checkInTime || null,
      checkOutTime: visitorBulk.checkOutTime || null,
      flatId: visitorBulk.flatId
        ? {
            _id: visitorBulk.flatId._id,
            blockName: visitorBulk.flatId.blockName,
            flatName: visitorBulk.flatId.flatName,
            ownerStaying: visitorBulk.flatId.ownerStaying,
            occupant: occupantDetails,
          }
        : null,
      visitors: filteredVisitors, // ✅ return only matching visitors
    };

    if (visitorBulk.isMultipleDays) {
      response.fromDate = visitorBulk.fromDate;
      response.toDate = visitorBulk.toDate;
    } else {
      response.visitDate = visitorBulk.visitDate;
    }

    res.json(response);
  } catch (error) {
    console.error("❌ getVisitorsBulkById error:", error);
    res.status(500).json({ error: error.message });
  }
};
