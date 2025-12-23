const ApartmentRole = require("../../model/apartment/apartmentRole");

exports.getRoleNameById = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("id", id);
    if (!id) {
      return res.status(400).json({ message: "Role ID is required." });
    }

    const role = await ApartmentRole.findById(id).select("name");

    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    res.status(200).json({ name: role.name });
  } catch (error) {
    console.error("Error fetching role name:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
