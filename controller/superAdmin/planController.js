// const Plan = require("../../model/superAdmin/plan");

// exports.createPlan = async (req, res) => {
//   console.log("req body", req.body);

//   try {
//     const {
//       planDetails,
//       businessSettings,
//       discount,
//       totalAmount,
//       totalAfterDiscount,
//     } = req.body;

//     if (!planDetails || !businessSettings) {
//       return res.status(400).json({
//         message: "Missing plan details or business settings.",
//       });
//     }

//     const {
//       planName,
//       planType,
//       frequency,
//       description,
//       // complexAdminsAllowed,
//       // tenantsAllowed,
//       status,
//       bufferTimeToPay, // ✅ Include this
//     } = planDetails;

//     const discountValue = discount?.value || 0;
//     const discountType = discount?.type || "percentage";

//     if (
//       !planName ||
//       !planType ||
//       totalAmount === undefined ||
//       totalAfterDiscount === undefined ||
//       !frequency ||
//       !status
//       // complexAdminsAllowed === undefined ||
//       // tenantsAllowed === undefined
//     ) {
//       return res.status(400).json({
//         message: "Some required plan details or business settings are missing.",
//       });
//     }

//     const slug = planName
//       .toLowerCase()
//       .trim()
//       .replace(/\s+/g, "-")
//       .replace(/[^\w\-]+/g, "");

//     const existingPlan = await Plan.findOne({ slug });
//     if (existingPlan) {
//       return res.status(400).json({ message: "This plan title already exists." });
//     }

//     const settingsIds = Array.isArray(businessSettings.settings)
//       ? businessSettings.settings.map((id) => id.toString())
//       : [];

//     const newPlan = new Plan({
//       planName,
//       slug,
//       planType,
//       planId: `PLAN-${Date.now()}`,
//       planCost: parseFloat(totalAmount),
//       discount: parseFloat(discountValue),
//       discountType,
//       finalCost: parseFloat(totalAfterDiscount),
//       frequency,
//       description: description || "",
//       // complexAdminsAllowed: parseInt(complexAdminsAllowed, 10),
//       // tenantsAllowed: parseInt(tenantsAllowed, 10),
//       bufferTimeToPay: parseInt(bufferTimeToPay, 10), // ✅ Save it here
//       status,
//       settings: settingsIds,
//     });

//     await newPlan.save();

//     return res.status(201).json({
//       message: "Plan created successfully",
//       plan: newPlan,
//     });
//   } catch (error) {
//     console.error("Create Plan Error:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const Plan = require("../../model/superAdmin/plan");

exports.createPlan = async (req, res) => {
  console.log("req body", req.body);

  try {
    const {
      planDetails,
      businessSettings,
      discount,
      totalAmount,
      totalAfterDiscount,
    } = req.body;

    // ---------- VALIDATION : MAIN OBJECTS ----------
    if (!planDetails) {
      return res.status(400).json({ message: "Plan details are required" });
    }
    if (!businessSettings) {
      return res
        .status(400)
        .json({ message: "Business settings are required" });
    }
    if (!Array.isArray(businessSettings.settings)) {
      return res.status(400).json({ message: "Settings list missing" });
    }

    // ---------- VALIDATION : PLAN DETAILS ----------
    const {
      planName,
      planType,
      frequency,
      description,
      status,
      bufferTimeToPay,
    } = planDetails;

    if (!planName || !planName.trim()) {
      return res.status(400).json({ message: "Plan Name is required" });
    }

    if (!planType || !planType.trim()) {
      return res.status(400).json({ message: "Plan Type is required" });
    }

    if (!frequency || !frequency.trim()) {
      return res.status(400).json({ message: "Plan Frequency is required" });
    }

    if (bufferTimeToPay === "" || bufferTimeToPay === undefined) {
      return res.status(400).json({
        message: "Buffer Time to Pay is required",
      });
    }

    if (isNaN(Number(bufferTimeToPay))) {
      return res.status(400).json({
        message: "Buffer Time to Pay must be a valid number",
      });
    }

    if (!status || !status.trim()) {
      return res.status(400).json({ message: "Status is required" });
    }

    // ---------- VALIDATION : SERVICES ----------
    const enabledSettings = businessSettings.settings; // Frontend already sends enabled IDs

    if (!enabledSettings || enabledSettings.length === 0) {
      return res.status(400).json({
        message: "Select at least one service",
      });
    }

    const settingsIds = enabledSettings.map((id) => id.toString());

    // ---------- VALIDATION : TOTALS ----------
    if (totalAmount === undefined) {
      return res.status(400).json({ message: "Total amount is missing" });
    }

    if (totalAfterDiscount === undefined) {
      return res.status(400).json({
        message: "Total after discount is missing",
      });
    }

    // ---------- VALIDATION : DISCOUNT ----------
    const discountValue = discount?.value || 0;
    const discountType = discount?.type || "percentage";

    if (discountType !== "percentage" && discountType !== "rupees") {
      return res.status(400).json({
        message: "Invalid discount type",
      });
    }

    // ---------- VALIDATION : UNIQUE PLAN ----------
    const slug = planName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const existingPlan = await Plan.findOne({ slug });
    if (existingPlan) {
      return res.status(400).json({
        message: "A plan with this name already exists",
      });
    }

    // ---------- CREATE PLAN ----------
    const newPlan = new Plan({
      planName,
      slug,
      planType,
      planId: `PLAN-${Date.now()}`,
      planCost: parseFloat(totalAmount),
      discount: parseFloat(discountValue),
      discountType,
      finalCost: parseFloat(totalAfterDiscount),
      frequency,
      description: description || "",
      bufferTimeToPay: parseInt(bufferTimeToPay, 10),
      status,
      settings: settingsIds,
    });

    await newPlan.save();

    return res.status(201).json({
      message: "Plan created successfully",
      plan: newPlan,
    });
  } catch (error) {
    console.error("Create Plan Error:", error);
    return res.status(500).json({
      message: "Internal Server Error. Please try again.",
    });
  }
};

exports.getAllPlans = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    // Build filter object
    const filter = {};

    if (search) {
      filter.planName = { $regex: search, $options: "i" }; // case-insensitive
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      filter.status = status;
    }

    const plans = await Plan.find(filter).sort({ createdAt: -1 });

    if (plans.length === 0) {
      return res.status(200).json({
        message: "No matching plans found",
        plans: [],
      });
    }

    return res.status(200).json({
      message: "Filtered subscription plans fetched successfully",
      plans,
    });
  } catch (error) {
    console.error("Get All Plans Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllActivePlans = async (req, res) => {
  try {
    const activePlans = await Plan.find({ status: "Active" })
      .populate("settings") // 🔁 Populate the settings field
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Active subscription plans fetched successfully",
      plans: activePlans,
    });
  } catch (error) {
    console.error("Get Active Plans Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const plan = await Plan.findOne({ slug });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({
      message: "Plan fetched successfully",
      plan,
    });
  } catch (error) {
    console.error("Get Plan By Slug Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
