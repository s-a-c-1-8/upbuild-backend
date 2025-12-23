const Permission = require("../../model/superAdmin/permission");

exports.addPermission = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Permission name is required" });
    }

    const exists = await Permission.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Permission already exists" });
    }

    const permission = await Permission.create({ name, description, status });
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ createdAt: -1 });
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// exports.updatePermission = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, status } = req.body;

//     const updated = await Permission.findByIdAndUpdate(
//       id,
//       { name, description, status },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: "Permission not found" });
//     }

//     res.status(200).json(updated);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
