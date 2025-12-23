const VisitorsBulk = require("../../../../model/flat/visitorBulk");
const UserRoleAssignment = require("../../../../model/user/userRoleAssignment"); // adjust path as needed
const User = require("../../../../model/user/userModel"); // adjust path as needed

exports.getVisitorsBulkById = async (req, res) => {
  try {
    const { id } = req.params;

    // Populating flatId fields and ownerStaying
    const visitorBulk = await VisitorsBulk.findById(id)
      .populate("flatId", "blockName flatName additionalDetails ownerStaying");

    if (!visitorBulk) {
      return res.status(404).json({ error: "Record not found" });
    }

    let occupantDetails = null;
    if (visitorBulk.flatId) {
      // Find role assignment for flat
      let roleAssignment;
      if (visitorBulk.flatId.ownerStaying) {
        // get owner
        roleAssignment = await UserRoleAssignment.findOne({
          flat: visitorBulk.flatId._id,
          relationshipType: "owner",
          active: true,
        }).populate("user", "name phoneNumber");
      } else {
        // get tenant
        roleAssignment = await UserRoleAssignment.findOne({
          flat: visitorBulk.flatId._id,
          relationshipType: "tenant",
          active: true,
        }).populate("user", "name phoneNumber");
      }

      if (roleAssignment && roleAssignment.user) {
        occupantDetails = {
          name: roleAssignment.user.name,
          phoneNumber: roleAssignment.user.phoneNumber,
          relationship: visitorBulk.flatId.ownerStaying ? "owner" : "tenant",
        };
      }
    }

    const response = {
      bulkVisitorId: visitorBulk.bulkVisitorId,
      _id: visitorBulk._id,
      eventPurpose: visitorBulk.eventPurpose,
      isMultipleDays: visitorBulk.isMultipleDays,
      fromTime: visitorBulk.fromTime,
      toTime: visitorBulk.toTime,
      flatId: visitorBulk.flatId
        ? {
            _id: visitorBulk.flatId._id,
            blockName: visitorBulk.flatId.blockName,
            flatName: visitorBulk.flatId.flatName,
            additionalDetails: visitorBulk.flatId.additionalDetails,
            ownerStaying: visitorBulk.flatId.ownerStaying,
            occupant: occupantDetails, // <- here is the owner/tenant info
          }
        : null,
    };

    if (visitorBulk.isMultipleDays) {
      response.fromDate = visitorBulk.fromDate;
      response.toDate = visitorBulk.toDate;
    } else {
      response.visitDate = visitorBulk.visitDate;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
