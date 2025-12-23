const express = require("express");
const {
  userLoginController,
  getUserById,
} = require("../../controller/user/userController");
const {
  getUsersExceptApartmentAdmin,
  getAllUsers,
  getSubAdminApartment,
  getUsersExceptAdmins,
  getStaffUsers,
} = require("../../controller/user/getUserContoller");
const {
  updateUserById,
  changeUserPassword,
} = require("../../controller/user/updateUserController");
const { compressFile, upload } = require("../../middlewares/uploadMiddleware");
const {
  checkUserByPhone,
} = require("../../controller/user/checkUserRoleByPhone");
const {
  checkPhoneEmailAvailability,
} = require("../../controller/user/checkPhoneEmailInFlats");
const {
  checkPhoneEmailAvailabilityInFlatsAndUser,
} = require("../../controller/user/checkPhoneEmailInUser&Flats");
const {
  selectRole,
} = require("../../controller/user/userControllerSelectRole");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");
const {
  getUsersByApartmentGroupedByFlat,
} = require("../../controller/user/getProfileByApartmentId");
const { getNamesByIds } = require("../../controller/user/forCallNamesById");

const router = express.Router();

// POST /api/superadmin/signup
router.post("/apartment/user/login", userLoginController);

router.post("/apartment/user/select-role", verifyToken, selectRole);

router.get("/apartment/user/get/by/:id", verifyToken, getUserById);

router.get("/apartment/user/get/all/users", verifyToken, getAllUsers);


router.patch(
  "/apartment/user/update/:id",
  verifyToken,
  upload.single("image"),
  compressFile,
  updateUserById
);

router.post(
  "/apartment/user/change-password/:id",
  verifyToken,
  changeUserPassword
);

router.post(
  "/apartment/user/check/user/by/phone",
  verifyToken,
  checkUserByPhone
);

router.get(
  "/apartment/get/users/by/:apartmentId",
  verifyToken,
  getUsersByApartmentGroupedByFlat
);

// router.post(
//   "/apartment/user/check/phone/email/availability",
//   verifyToken,
//   checkPhoneEmailAvailability
// );

// router.post(
//   "/apartment/user/check/phone/email/availability/user&Flat",
//   verifySuperAdminToken,
//   checkPhoneEmailAvailabilityInFlatsAndUser
// );

router.get("/get/names/by/id", verifyToken, getNamesByIds);

module.exports = router;
