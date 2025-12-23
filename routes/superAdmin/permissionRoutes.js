const express = require("express");
const { addPermission, getAllPermissions } = require("../../controller/superAdmin/permissionController");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const router = express.Router();

router.post("/admin/addPermission", verifyToken,addPermission);
router.get("/admin/getAllPermissions", verifyToken,getAllPermissions);
// router.put("/admin/updatePermission/:id", verifyToken,updatePermission);

module.exports = router;
