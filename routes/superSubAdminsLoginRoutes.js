const express = require("express");
const {
  superSubAdminsloginController,
} = require("../controller/superSubAdminsLogin");
const {
  superSubAdminsForgotPassword,
} = require("../controller/superSubAdminsForgotPassword");
const { resetPasswordController } = require("../controller/superSubAdminsResetPassword");
const router = express.Router();

// POST /api/superadmin/signup
router.post("/super/sub/admin/login", superSubAdminsloginController);

router.post("/super/sub/admin/forgotPassword", superSubAdminsForgotPassword);

router.post("/super/sub/admin/resetPassword", resetPasswordController);

module.exports = router;

// const express = require("express");
// const {
//   superSubAdminsloginController,
// } = require("../controller/superSubAdminsLogin");
// const router = express.Router();

// // POST /api/superadmin/signup
// router.post("/super/sub/admin/login", superSubAdminsloginController);

// module.exports = router;
