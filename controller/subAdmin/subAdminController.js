const bcrypt = require("bcryptjs");
const SubAdmin = require("../../model/subAdmin/subAdmin");

// Utility to generate slug
const generateUniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let count = 1;

  while (await SubAdmin.findOne({ slug })) {
    slug = `${baseSlug}-${count}`;
    count++;
  }

  return slug;
};

exports.createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    // Check if email already exists
    const existing = await SubAdmin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate base slug
    const baseSlug = name.trim().toLowerCase().replace(/\s+/g, "-");
    const slug = await generateUniqueSlug(baseSlug);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newSubAdmin = new SubAdmin({
      name,
      email,
      password: hashedPassword,
      role,
      isActive,
      slug, // new field
    });

    await newSubAdmin.save();

    return res
      .status(201)
      .json({ message: "Sub-admin created successfully", user: newSubAdmin });
  } catch (err) {
    console.error("Error creating subadmin:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// exports.generateSubadminCredentials = async (req, res) => {
//   try {
//     const { name, role } = req.body;

//     if (!name || !role) {
//       return res.status(400).json({ message: "Name and role are required" });
//     }

//     const slug = name.trim().toLowerCase().replace(/\s+/g, "_");

//     let username;
//     let isUnique = false;

//     while (!isUnique) {
//       // Generate a long number suffix to ensure uniqueness
//       const randomNumber = Math.floor(Math.random() * 1e12); // up to 12 digits
//       const candidate = `${slug}_${randomNumber}`;

//       const existing = await SubAdmin.findOne({ username: candidate });
//       if (!existing) {
//         username = candidate;
//         isUnique = true;
//       }
//     }

//     const password = Math.random().toString(36).slice(-8); // Random 8-char password

//     return res.status(200).json({ username, password });
//   } catch (err) {
//     console.error("Credential generation failed:", err.message);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.getAllSubAdmins = async (req, res) => {
    try {
      const { search = "", status } = req.body;
  
      // Build filter object
      const filter = {};
  
      if (search) {
        const regex = new RegExp(search.trim(), "i"); // case-insensitive
        filter.$or = [{ name: regex }, { email: regex }];
      }
  
      if (status === "Active" || status === "Inactive") {
        filter.isActive = status === "Active";
      }
  
      const subAdmins = await SubAdmin.find(filter)
        .populate("role", "name slug")
        .sort({ createdAt: -1 });
  
      res.status(200).json(subAdmins);
    } catch (err) {
      console.error("Error fetching sub-admins:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
  
