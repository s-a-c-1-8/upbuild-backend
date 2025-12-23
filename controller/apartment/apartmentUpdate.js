const Apartment = require("../../model/apartment/apartmentModel");
const Plan = require("../../model/superAdmin/plan"); // needed only if planId is used

exports.updateApartment = async (req, res) => {
  const apartmentId = req.params.id;

  try {
    const body =
      typeof req.body.payload === "string"
        ? JSON.parse(req.body.payload)
        : req.body;

    const {
      basic = {},
      additional = {},
      apartmentAddress,
      planId,
      approved,
      policyMetadata = [],
      existingPhotos = [],
      existingPolicies = [],
    } = body;

    const uploadedPhotos = req.processedUploads?.apartmentPhotos || [];
    const uploadedPolicies = req.processedUploads?.apartmentPolicies || [];

    // ✅ LOGS AFTER ALL VARIABLES ARE DEFINED
    console.log("🔧 Parsed Payload Body:");
    console.dir(body, { depth: null });

    console.log("📸 Uploaded Photos:");
    console.dir(uploadedPhotos, { depth: null });

    console.log("📄 Uploaded Policies:");
    console.dir(uploadedPolicies, { depth: null });

    console.log("🖼 Existing Photos:");
    console.dir(existingPhotos, { depth: null });

    console.log("📘 Existing Policies:");
    console.dir(existingPolicies, { depth: null });

    console.log("🧾 Policy Metadata:");
    console.dir(policyMetadata, { depth: null });

    // 🧾 Combine new and existing policies
    const mergedPolicies = [
      ...existingPolicies.map((p) => ({
        name: p.name,
        type: p.type,
        path: p.path,
        description: p.description,
        fromDate: p.fromDate,
        toDate: p.toDate,
      })),
      ...uploadedPolicies.map((file) => {
        const meta = policyMetadata.find(
          (m) => m.name === file.originalname || m.name === file.filename
        );
        return {
          name: file.filename,
          type: file.mimetype,
          path: file.path,
          description: meta?.description || "",
          fromDate: meta?.fromDate || null,
          toDate: meta?.toDate || null,
        };
      }),
    ];

    // 🖼 Combine new and existing photos (flatten properly)
    const mergedPhotos = [
      ...existingPhotos.map((p) => ({
        name: p.name,
        type: p.type,
        path: p.path,
      })),
      ...uploadedPhotos.map((file) => ({
        name: file.filename,
        type: file.mimetype,
        path: file.path,
      })),
    ];

    // ✅ Normalize Amenities
    let formattedAmenities = [];
    if (Array.isArray(additional.amenities)) {
      formattedAmenities = additional.amenities.map((a) => {
        // If only amenityId given
        if (typeof a === "string" || (typeof a === "object" && a._id)) {
          return { amenity: a._id || a, schedule: [] };
        }
        // If object with amenity + schedule
        return {
          amenity: a.amenity,
          schedule: Array.isArray(a.schedule) ? a.schedule : [],
        };
      });
    }

    // Optional: rebuild planSnapshot if planId provided
    const normPlanId =
      planId &&
      planId !== "null" &&
      planId !== "undefined" &&
      String(planId).trim() !== ""
        ? planId
        : null;

    let planSnapshot = null;
    if (normPlanId) {
      const planDoc = await Plan.findById(normPlanId).populate("settings"); // <-- removed .session(session)
      if (!planDoc) return res.status(400).json({ message: "Invalid planId" });

      const serviceSnapshots = (planDoc.settings || []).map((s) => ({
        serviceId: s._id,
        name: s.name,
        description: s.description,
        amount: s.amount,
        igstPer: s.igstPer,
        cgstPer: s.cgstPer,
        sgstPer: s.sgstPer,
        hsnCode: s.hsnCode,
        status: s.status,
        type: s.type,
        totalTax: s.totalTax,
        totalAmount: s.totalAmount,
      }));

      planSnapshot = {
        planRef: planDoc._id,
        planName: planDoc.planName,
        planType: planDoc.planType,
        slug: planDoc.slug,
        planId: planDoc.planId,
        planCost: planDoc.planCost,
        discount: planDoc.discount,
        discountType: planDoc.discountType,
        finalCost: planDoc.finalCost,
        bufferTimeToPay: planDoc.bufferTimeToPay,
        frequency: planDoc.frequency,
        description: planDoc.description,
        complexAdminsAllowed: planDoc.complexAdminsAllowed,
        tenantsAllowed: planDoc.tenantsAllowed,
        settings: serviceSnapshots,
        capturedAt: new Date(),
        planPaidStatus: "unpaid",
        planPaidAt: null,
      };
    }

    // 🏠 Final update object
    const updateData = {
      name: basic.buildingName,
      // planId,
      builder: basic.builderId,
      approved: !!approved,
      buildingName: basic.buildingName || additional.blockName,
      blockName: additional.blockName,
      propertyType: basic.propertyType,
      numberOfUnits: additional.numberOfUnits,
      yearBuilt: additional.yearBuilt,
      squareFootage: additional.squareFootage,
      noOfGates: additional.noOfGates,
      powerMeter: additional.powerMeters,
      waterMeter: additional.waterMeters,
      description: additional.description,
      amenities: formattedAmenities, // 👈 fixed
      apartmentPhoto: mergedPhotos,
      apartmentPolicies: mergedPolicies,
      apartmentAddress,
    };

    if (planSnapshot) updateData.planSnapshot = planSnapshot;

    const updatedApartment = await Apartment.findByIdAndUpdate(
      apartmentId,
      updateData,
      { new: true }
    );

    if (!updatedApartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    return res.status(200).json({
      message: "Apartment updated successfully",
      apartment: updatedApartment,
    });
  } catch (error) {
    console.error("❌ Update Apartment Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
