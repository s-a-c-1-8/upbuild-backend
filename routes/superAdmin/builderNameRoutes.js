const express = require("express");
const router = express.Router();
const {
  addBuilder,
  getAllBuilders,
  getActiveBuilders,
  getBuilderById,
  updateBuilder,
  searchBuilders,
} = require("../../controller/superAdmin/builderNameController");
const verifyToken = require("../../middlewares/verifyToken");

// POST /admin/addBuilder
router.post("/admin/addBuilder", verifyToken, addBuilder);

// GET /admin/getAllBuilders
router.get("/admin/getAllBuilders", verifyToken, getAllBuilders);

router.get("/admin/search/builders", verifyToken, searchBuilders);

// router.get("/admin/getActiveBuilders", verifyToken, getActiveBuilders);

// router.get("/admin/getBuilder/:id", verifyToken, getBuilderById);

// router.put("/admin/updateBuilder/:id", verifyToken, updateBuilder);

module.exports = router;
