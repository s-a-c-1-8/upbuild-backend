const User = require("../../model/user/userModel");
const bcrypt = require("bcryptjs");
const logAction = require("../../utils/logAction"); // ✅ Import logAction

exports.updateUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, contactNumber } = req.body;

    // 🔍 Check for existing email in other users
    const existingEmailUser = await User.findOne({
      email,
      _id: { $ne: userId },
    });
    if (existingEmailUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 🔍 Check for existing phone in other users
    const existingPhoneUser = await User.findOne({
      contactNumber,
      _id: { $ne: userId },
    });
    if (existingPhoneUser) {
      return res.status(400).json({ message: "Contact number already exists" });
    }

    // ✏️ Prepare update fields
    const updateFields = {
      name,
      email,
      contactNumber,
    };

    // 🛑 Check uploaded photo size (limit: 10MB)
    const MAX_FILE_SIZE_MB = 10;  
    const photoFile = req.processedUploads?.photo?.[0];

    if (photoFile) {
      const sizeInMB = photoFile.size / (1024 * 1024);
      if (sizeInMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({
          message: `Photo '${photoFile.originalname}' exceeds 10MB limit.`,
          fileSize: `${sizeInMB.toFixed(2)} MB`,
        });
      }

      // ✅ Set image path only if within size limit
      updateFields.image = `/uploads/user/${photoFile.name}`;
    }

    // ✅ Update the user
    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🪵 Log the action
    await logAction({
      req,
      action: "UPDATE_USER",
      description: `Updated user profile for ${updatedUser.name}`,
      metadata: {
        userId: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        contactNumber: updatedUser.contactNumber,
        imageUpdated: !!updateFields.image,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changeUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required." });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("❌ Password change error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
