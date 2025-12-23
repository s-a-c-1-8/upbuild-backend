const Builder = require("../../model/superAdmin/builderName");

// Add new builder
exports.addBuilder = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name)
      return res.status(400).json({ message: "Builder name is required" });

    const slug = name.toLowerCase().trim().replace(/\s+/g, "-");
    const existing = await Builder.findOne({ slug });
    if (existing)
      return res.status(400).json({ message: "This builder already exists" });

    const newBuilder = new Builder({
      name: name.trim(),
      slug,
      description,
      status,
    });
    await newBuilder.save();

    res
      .status(201)
      .json({ message: "Builder added successfully", data: newBuilder });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all builders (optionally filter by status)
exports.getAllBuilders = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const builders = await Builder.find(query).sort({ name: 1 });
    res.status(200).json(builders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.searchBuilders = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(200).json({ builders: [] });
    }

    const regex = new RegExp(query.trim(), "i"); // Case-insensitive match
    const builders = await Builder.find({
      name: { $regex: regex },
      status: "Active",
    }).limit(10);

    res.status(200).json({ builders });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// // Get active builders only
// exports.getActiveBuilders = async (req, res) => {
//   try {
//     const builders = await Builder.find({ status: "Active" }).sort({ name: 1 });
//     res.status(200).json(builders);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // Get builder by ID
// exports.getBuilderById = async (req, res) => {
//   try {
//     const builder = await Builder.findById(req.params.id);
//     if (!builder) return res.status(404).json({ message: "Builder not found" });

//     res.status(200).json(builder);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // Update builder
// exports.updateBuilder = async (req, res) => {
//   try {
//     const { name, description, status } = req.body;
//     const updated = await Builder.findByIdAndUpdate(
//       req.params.id,
//       { name, description, status },
//       { new: true }
//     );

//     if (!updated) return res.status(404).json({ message: "Builder not found" });

//     res.status(200).json({ message: "Updated", data: updated });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
