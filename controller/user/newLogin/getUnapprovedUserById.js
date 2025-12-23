const UnapprovedUser = require("../../../model/user/unapprovedUser");

exports.getUnapprovedUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const user = await UnapprovedUser.findById(id)
      .select("name contactNumber flat")
      .populate("flat", "_id flatName blockName");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Unapproved user not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Error fetching unapproved user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching unapproved user",
    });
  }
};
