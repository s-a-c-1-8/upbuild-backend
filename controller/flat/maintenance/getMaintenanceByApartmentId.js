const MonthlyFlatMaintenance = require("../../../model/flat/maintenance/maintenance");
const Flat = require("../../../model/flat/flatModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const ApartmentRole = require("../../../model/apartment/apartmentRole");
const { applyPenaltiesAndUpdateTotals } = require("./applyPenaltiesAndUpdateDb");

exports.getAllMaintenanceByApartmentId = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const {
      search = "",
      month = "All",
      year = "All",
      status = "",
      limit = 10,
      page = 1,
    } = req.body;

    const flatIdFromToken = req.auth?.flatId || null;
    const selectedRoleId = req.auth?.selectedRoleId || null;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "Apartment ID is required.",
      });
    }

    let roleSlug = "";
    let hasPermission = false;

    if (selectedRoleId) {
      const roleAssignment = await UserRoleAssignment.findById(selectedRoleId).populate("role");
      if (!roleAssignment || !roleAssignment.role) {
        return res.status(403).json({
          success: false,
          message: "Invalid role assignment.",
        });
      }

      roleSlug = roleAssignment.role.slug;
      if (roleSlug === "apartment-admin" || roleSlug === "occupants") {
        hasPermission = true;
      } else {
        const fullRole = await ApartmentRole.findById(roleAssignment.role._id).populate({
          path: "permissions",
          match: { status: "Active" },
          select: "name",
        });
        const permissionNames = fullRole.permissions.map((perm) => perm.name);
        hasPermission = permissionNames.includes(
          "can_view_maintenance_page_with_all_data"
        );
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to view maintenance records.",
      });
    }

    // 🔹 Apply penalties & update totals using helper function
    await applyPenaltiesAndUpdateTotals(apartmentId);

    // Build query
    const query = { apartmentId };
    if (month !== "All" && year !== "All") {
      query.month = `${month} ${year}`;
    } else if (month !== "All") {
      query.month = new RegExp(`^${month}\\s`, "i");
    } else if (year !== "All") {
      query.month = new RegExp(`${year}$`, "i");
    }

    const allRecords = await MonthlyFlatMaintenance.find(query).populate({
      path: "maintenance.flatId",
      select: "flatName blockName",
    });

    allRecords.sort((a, b) => {
      const parseMonth = (str) => new Date(`${str} 01`);
      return parseMonth(b.month) - parseMonth(a.month);
    });

    const allEntries = [];

    for (const record of allRecords) {
      for (const item of record.maintenance) {
        const flat = item.flatId;
        if (!flat) continue;

        // Restrict occupants
        if (
          roleSlug === "occupants" &&
          flatIdFromToken &&
          !flat._id.equals(flatIdFromToken)
        ) {
          continue;
        }

        const flatLabel = `${flat.flatName}-${flat.blockName || "X"}`;
        const matchesSearch =
          search.trim() === "" ||
          flatLabel.toLowerCase().includes(search.toLowerCase()) ||
          item.maintenanceId.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === "" || item.status === status;

        if (matchesSearch && matchesStatus) {
          allEntries.push({
            _id: item._id,
            flat: flatLabel,
            maintenanceId: item.maintenanceId,
            amount: item.amount, // Already updated by helper
            status: item.status,
            month: record.month,
            reasons: item.reasons || [],
          });
        }
      }
    }

    const total = allEntries.length;
    const paginated = allEntries.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      success: true,
      data: {
        records: [
          {
            month: "Paged Data",
            totalAmount: 0,
            entries: paginated,
          },
        ],
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching maintenance data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching maintenance records.",
    });
  }
};
