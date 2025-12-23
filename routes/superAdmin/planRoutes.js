// routes/superAdmin/planRoutes.js
const express = require("express");
const { createPlan, getAllPlans, getPlanBySlug, getAllActivePlans } = require("../../controller/superAdmin/planController");
const { updatePlan } = require("../../controller/superAdmin/planUpdateContoller");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");

const router = express.Router();
router.post("/admin/createPlan", verifyToken,checkPermission("can_add_plans"),createPlan);
router.put('/admin/update/plan/:id', verifyToken,checkPermission("can_edit_plans"),updatePlan);

router.get("/admin/getAllPlans", verifyToken,getAllPlans);
router.get("/admin/get/activePlans", verifyToken,getAllActivePlans);

router.get("/admin/getPlan/:slug", getPlanBySlug);

module.exports = router;
