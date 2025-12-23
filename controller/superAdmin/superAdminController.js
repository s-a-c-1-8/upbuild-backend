// controllers/superAdminController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ✅ Import jwt directly here
const SuperAdmin = require("../../model/superAdmin/superAdmin"); // Your model

const slugify = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
};

const signUpSuperAdmin = async (req, res) => {
  console.log("req body", req.body);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if a Super Admin already exists
    const existingSuperAdmin = await SuperAdmin.findOne();
    if (existingSuperAdmin) {
      return res.status(400).json({
        message: "A Super Admin already exists. No new signups allowed.",
      });
    }

    // Create slug
    let baseSlug = slugify(name); // e.g., "Super Admin" => "super-admin"
    let slug = baseSlug;
    let count = 1;

    while (await SuperAdmin.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newSuperAdmin = new SuperAdmin({
      name,
      email,
      password: hashedPassword,
      slug, // save slug also!
      createdAt: new Date(),
    });

    await newSuperAdmin.save();

    const token = jwt.sign(
      { id: newSuperAdmin._id, userType: newSuperAdmin.userRole },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    res.status(201).json({
      message: "Super Admin created successfully!",
      token,
      userDetails: {
        _id: newSuperAdmin._id,
        name: newSuperAdmin.name,
        email: newSuperAdmin.email,
        slug: newSuperAdmin.slug, // return slug too
        userRole: newSuperAdmin.userRole,
      },
    });
  } catch (error) {
    console.error("Error creating Super Admin:", error);
    res.status(500).json({
      message: "Error creating Super Admin",
      error: error.message || error,
    });
  }
};

const checkSuperAdminExists = async (req, res) => {
  try {
    const existingSuperAdmin = await SuperAdmin.findOne();
    if (existingSuperAdmin) {
      return res.status(200).json({
        exists: true,
        message: "A Super Admin already exists.",
      });
    } else {
      return res.status(200).json({
        exists: false,
        message: "No Super Admin found. You can create one.",
      });
    }
  } catch (error) {
    console.error("Error checking Super Admin existence:", error);
    return res.status(500).json({
      message: "Failed to check Super Admin existence",
      error: error.message || error,
    });
  }
};
// exports.loginSuperAdmin = async (req, res) => {
//   const { email, password } = req.body;

//   // Validate input
//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required" });
//   }

//   try {
//     const superAdmin = await SuperAdmin.findOne({ email });

//     if (!superAdmin) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, superAdmin.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign({ id: superAdmin._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       userDetails: {
//         _id: superAdmin._id,
//         name: superAdmin.name,
//         email: superAdmin.email,
//       },
//     });
//   } catch (error) {
//     console.error("Error during login:", error);
//     res
//       .status(500)
//       .json({ message: "Server error", error: error.message || error });
//   }
// };

module.exports = { signUpSuperAdmin, checkSuperAdminExists };
