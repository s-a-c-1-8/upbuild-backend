const express = require("express");
const {
  getOccupantsUsers,
} = require("../../controller/flat/boardMembers/getOccupantsUsers");
const verifyToken = require("../../middlewares/verifyToken");
const {
  assignBoardRoleToUser,
} = require("../../controller/flat/boardMembers/assignBoardRoleToUser");
const {
  getOnlyBoardMemberRoles,
} = require("../../controller/apartment/rolesAndPermisson/apartmentRoleController");
const {
  getAllBoardMembers,
} = require("../../controller/flat/boardMembers/getAdminsAndBoardMembers");
const checkPermission = require("../../middlewares/checkPermission");

const router = express.Router();

// GET all occupants for a specific apartment
router.get(
  "/get/apartment/occupants/:apartmentId",
  verifyToken,
  checkPermission("can_add_board_members"),
  getOccupantsUsers
);

router.get(
  "/user/getRoles/boardMembers/to/add/:apartmentId",
  verifyToken,
  checkPermission("can_add_board_members"),
  getOnlyBoardMemberRoles
);

router.post(
  "/assign/boardRole/user",
  verifyToken,
  checkPermission("can_add_board_members"),
  assignBoardRoleToUser
);

router.get(
  "/get/boardMembers/:apartmentId",
  verifyToken,
  checkPermission("can_add_board_members"),
  getAllBoardMembers
);

router.get(
  "/get/boardMembers/for/all/:apartmentId",
  verifyToken,
  getAllBoardMembers
);

module.exports = router;
