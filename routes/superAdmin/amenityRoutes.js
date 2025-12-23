const express = require("express");
const {
  addAmenity,
  getAllAmenities,
  getAmenityBySlug,
  updateAmenity,
  getActiveAmenities,
  getAmenityById,
} = require("../../controller/superAdmin/amenityController");
const verifyToken = require("../../middlewares/verifyToken");

const router = express.Router();

router.post("/admin/addAmenity", verifyToken,addAmenity);
router.get("/admin/getAllAmenities", verifyToken,getAllAmenities);
router.get("/admin/getAllAmenities/active", verifyToken,getActiveAmenities); // ✅ New route
// router.get("/admin/getAmenity/by/:slug", getAmenityBySlug);
router.get("/admin/getAmenity/by/id/:id", getAmenityById);
router.put("/admin/updateAmenity/by/:id", verifyToken,updateAmenity);

module.exports = router;
