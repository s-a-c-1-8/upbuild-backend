const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true, // So no duplicates in DB
  },

  email: { type: String, required: true, unique: true }, // Email is required and must be unique
  forgotPassLink: { type: String, default: null },

  password: {
    type: String,
    required: [true, "Password is required"],
  },
  userRole: {
    type: String,
    enum: ["superAdmin"],
    default: "superAdmin",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);

module.exports = SuperAdmin;
