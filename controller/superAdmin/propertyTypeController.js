const PropertyType = require("../../model/superAdmin/propertyType");

// Add new property type
exports.addPropertyType = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ message: "Property Type name is required" });
    }

    const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

    // check if slug already exists
    const existing = await PropertyType.findOne({ slug });
    if (existing) {
      return res
        .status(400)
        .json({ message: "This Property Type already exists" });
    }

    const newPropertyType = new PropertyType({
      name: name.trim(),
      slug,
      description,
      status,
    });

    await newPropertyType.save();
    res.status(201).json({
      message: "Property Type added successfully",
      data: newPropertyType,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all (optionally filter by status)
exports.getAllPropertyTypes = async (req, res) => {
  try {
    const { superAdmin } = req;
    // console.log("suprer admin", superAdmin);
    const { status } = req.query;

    const query = status ? { status } : {};
    const types = await PropertyType.find(query).sort({ name: 1 });

    res.status(200).json(types);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get only active property types
exports.getActivePropertyTypes = async (req, res) => {
  try {
    const types = await PropertyType.find({ status: "Active" }).sort({
      name: 1,
    });
    res.status(200).json(types);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get single type by SLUG
// exports.getPropertyTypeBySlug = async (req, res) => {
//   try {
//     const type = await PropertyType.findOne({ slug: req.params.slug });

//     if (!type) {
//       return res.status(404).json({ message: "Property Type not found" });
//     }

//     res.status(200).json(type);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
exports.getPropertyTypeById = async (req, res) => {
  try {
    const type = await PropertyType.findById(req.params.id);

    if (!type) {
      return res.status(404).json({ message: "Property Type not found" });
    }

    res.status(200).json(type);
  } catch (err) {
    console.error("Error fetching property type by ID:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Update by ID
exports.updatePropertyType = async (req, res) => {
  console.log("req body", req.body);
  try {
    const { name, description, status } = req.body;

    const updated = await PropertyType.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });

    res.status(200).json({ message: "Updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
