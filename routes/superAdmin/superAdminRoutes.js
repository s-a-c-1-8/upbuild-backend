const express = require('express');
const { signUpSuperAdmin, loginSuperAdmin, checkSuperAdminExists } = require('../../controller/superAdmin/superAdminController');
const { getSuperAdminById } = require('../../controller/superAdmin/getSuperAdmin');
const {updateSuperAdminById,changeSuperAdminPassword} = require('../../controller/superAdmin/profileSuperAdmin');
const verifyToken = require('../../middlewares/verifyToken');
const router = express.Router();

// POST /api/superadmin/signup
router.post('/superAdmin/signup', signUpSuperAdmin);
// router.post('/superAdmin/login', loginSuperAdmin);
router.get("/superAdmin/id/:id", verifyToken,getSuperAdminById);
router.get("/superadmin/check/exists", checkSuperAdminExists);
router.patch("/superAdmin/update/:id", verifyToken, updateSuperAdminById);
router.patch("/superAdmin/change-password/:id", verifyToken, changeSuperAdminPassword);


module.exports = router;
