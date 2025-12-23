// const Plan = require("../../model/superAdmin/plan");

// exports.updatePlan = async (req, res) => {
//   console.log("request body",req.body)
//   try {
//     const { id } = req.params;
//     if (!id) {
//       return res.status(400).json({ message: "Plan ID is required" });
//     }

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
//       bufferTimeToPay,
//     } = planDetails;

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

//     // Generate slug only if planName changed (optional)
//     const slug = planName
//       .toLowerCase()
//       .trim()
//       .replace(/\s+/g, "-")
//       .replace(/[^\w\-]+/g, "");

//     // Check if another plan with same slug exists (exclude current plan)
//     const existingPlan = await Plan.findOne({ slug, _id: { $ne: id } });
//     if (existingPlan) {
//       return res.status(400).json({ message: "This plan title already exists." });
//     }

//     const settingsIds = Array.isArray(businessSettings.settings)
//       ? businessSettings.settings.map((id) => id.toString())
//       : [];

//     // Update the plan document
//     const updatedPlan = await Plan.findByIdAndUpdate(
//       id,
//       {
//         planName,
//         slug,
//         planType,
//         planCost: parseFloat(totalAmount),
//         discount: parseFloat(discount?.value || 0),
//         discountType: discount?.type || "percentage",
//         finalCost: parseFloat(totalAfterDiscount),
//         frequency,
//         description: description || "",
//         // complexAdminsAllowed: parseInt(complexAdminsAllowed, 10),
//         // tenantsAllowed: parseInt(tenantsAllowed, 10),
//         bufferTimeToPay: parseInt(bufferTimeToPay, 10),
//         status,
//         settings: settingsIds,
//       },
//       { new: true }
//     );

//     if (!updatedPlan) {
//       return res.status(404).json({ message: "Plan not found" });
//     }

//     return res.status(200).json({
//       message: "Plan updated successfully",
//       plan: updatedPlan,
//     });
//   } catch (error) {
//     console.error("Update Plan Error:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const Plan = require("../../model/superAdmin/plan");

exports.updatePlan = async (req, res) => {
  console.log("request body", req.body);

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    const {
      planDetails,
      businessSettings,
      discount,
      totalAmount,
      totalAfterDiscount,
    } = req.body;

    // ---------- MAIN OBJECT VALIDATION ----------
    if (!planDetails) {
      return res.status(400).json({ message: "Plan details are missing" });
    }

    if (!businessSettings || !Array.isArray(businessSettings.settings)) {
      return res.status(400).json({ message: "Business settings are missing" });
    }

    // ---------- PLAN DETAILS VALIDATION ----------
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
      return res
        .status(400)
        .json({ message: "Plan Frequency is required" });
    }

    if (bufferTimeToPay === "" || bufferTimeToPay === undefined) {
      return res.status(400).json({
        message: "Buffer Time to Pay is required",
      });
    }

    if (isNaN(Number(bufferTimeToPay))) {
      return res.status(400).json({
        message: "Buffer Time to Pay must be a number",
      });
    }

    if (!status || !status.trim()) {
      return res.status(400).json({ message: "Status is required" });
    }

    // ---------- SERVICE VALIDATION ----------
    // Expecting frontend to send only enabled service IDs here
    const settingsIds = businessSettings.settings;

    if (!Array.isArray(settingsIds) || settingsIds.length === 0) {
      return res.status(400).json({
        message: "Select at least one service",
      });
    }

    // ---------- TOTALS VALIDATION ----------
    if (totalAmount === undefined) {
      return res.status(400).json({
        message: "Total Amount is missing",
      });
    }

    if (totalAfterDiscount === undefined) {
      return res.status(400).json({
        message: "Total After Discount is missing",
      });
    }

    // ---------- DISCOUNT VALIDATION ----------
    const discountValue = discount?.value || 0;
    const discountType = discount?.type || "percentage";

    if (!["percentage", "rupees", null].includes(discountType)) {
      return res.status(400).json({
        message: "Invalid discount type",
      });
    }

    // ---------- SLUG ----------
    const slug = planName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    // Check if another plan has the same slug (exclude current one)
    const existingPlan = await Plan.findOne({
      slug,
      _id: { $ne: id },
    });

    if (existingPlan) {
      return res.status(400).json({
        message: "A plan with this name already exists",
      });
    }

    // ---------- UPDATE DOCUMENT ----------
    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      {
        planName,
        slug,
        planType,
        planCost: parseFloat(totalAmount),
        discount: parseFloat(discountValue),
        discountType: discountType || "percentage",
        finalCost: parseFloat(totalAfterDiscount),
        frequency,
        description: description || "",
        bufferTimeToPay: parseInt(bufferTimeToPay, 10),
        status,
        settings: settingsIds, // must be array of IDs
      },
      { new: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({
      message: "Plan updated successfully",
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Update Plan Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
