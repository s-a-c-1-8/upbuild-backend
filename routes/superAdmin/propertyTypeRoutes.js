const express = require("express");
const { addPropertyType, getAllPropertyTypes, updatePropertyType, getPropertyTypeBySlug, getActivePropertyTypes, getPropertyTypeById } = require("../../controller/superAdmin/propertyTypeController");
const verifyToken = require("../../middlewares/verifyToken");
const router = express.Router();

router.post("/admin/addProperty", verifyToken,addPropertyType);
router.get("/admin/getAllProperty", verifyToken,getAllPropertyTypes);
router.get("/admin/getAllProperty/active", verifyToken,getActivePropertyTypes);
// router.get("/admin/getProperty/by/:slug", getPropertyTypeBySlug );
router.get("/admin/getProperty/by/id/:id", getPropertyTypeById );
router.put("/admin/updateProperty/by/:id", verifyToken,updatePropertyType);

module.exports = router;
