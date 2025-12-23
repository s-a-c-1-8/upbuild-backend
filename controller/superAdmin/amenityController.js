const Amenity = require("../../model/superAdmin/amenity");

// Add new amenity
exports.addAmenity = async (req, res) => {
  try {
    // const { name, description, status, type } = req.body;
    const { name, description, status} = req.body;

    if (!name) {
      return res.status(400).json({ message: "Amenity name is required" });
    }

    // if (!type) {
    //   return res.status(400).json({ message: "Amenity type is required" });
    // }

    const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

    // Check if slug already exists
    const existing = await Amenity.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "This amenity already exists" });
    }

    const newAmenity = new Amenity({
      name: name.trim(),
      slug,
      description,
      status,
      // type, // ✅ store the type from frontend
    });

    await newAmenity.save();
    res.status(201).json({ message: "Amenity added successfully", data: newAmenity });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all amenities (optional filter by status)
exports.getAllAmenities = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const amenities = await Amenity.find(query).sort({ name: 1 });

    res.status(200).json(amenities);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get only active amenities
exports.getActiveAmenities = async (req, res) => {
    try {
      const amenities = await Amenity.find({ status: "Active" }).sort({ name: 1 });
      res.status(200).json(amenities);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  };
  

// Get single amenity by slug
// exports.getAmenityBySlug = async (req, res) => {
//   try {
//     const amenity = await Amenity.findOne({ slug: req.params.slug });

//     if (!amenity) {
//       return res.status(404).json({ message: "Amenity not found" });
//     }

//     res.status(200).json(amenity);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

exports.getAmenityById = async (req, res) => {
  try {
    const amenity = await Amenity.findById(req.params.id);

    if (!amenity) {
      return res.status(404).json({ message: "Amenity not found" });
    }

    res.status(200).json(amenity);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Update amenity by ID
exports.updateAmenity = async (req, res) => {
  try {
    const { name, description, status, type } = req.body;

    // Optional: validate type
    if (!type) {
      return res.status(400).json({ message: "Amenity type is required" });
    }

    const updated = await Amenity.findByIdAndUpdate(
      req.params.id,
      { name, description, status, type }, // ✅ include type
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Amenity not found" });

    res.status(200).json({ message: "Amenity updated successfully", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
