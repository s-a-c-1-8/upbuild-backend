const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/verifyToken");
const {
  createPoll,
} = require("../../controller/apartment/community/poll/createPoll");
const {
  getPolls,
} = require("../../controller/apartment/community/poll/getPolls");
const {
  votePoll,
} = require("../../controller/apartment/community/poll/votePoll");
const { getPollById } = require("../../controller/apartment/community/poll/getPollById");

// 🔒 All routes require authentication
router.post("/create/poll", verifyToken, createPoll);

router.get("/get/polls", verifyToken, getPolls);

router.post("/poll/vote", verifyToken, votePoll);

router.get("/poll/:pollId", verifyToken, getPollById);

module.exports = router;
