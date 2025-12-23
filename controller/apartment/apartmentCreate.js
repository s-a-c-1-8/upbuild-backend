const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Apartment = require("../../model/apartment/apartmentModel");
const ApartmentRole = require("../../model/apartment/apartmentRole");
const User = require("../../model/user/userModel");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const Plan = require("../../model/superAdmin/plan");

exports.onboardApartment = async (req, res) => {
  console.log("req.body", req.body);

  const session = await mongoose.startSession();
  session.startTransaction();

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
      adminDetails,
      credentials,
      approved,
      policyMetadata = [],
    } = body;
    const alternativeEmail = adminDetails?.alternativeEmail || "";

    const uploadedPhotos = req.processedUploads?.apartmentPhotos || [];
    const uploadedPolicies = req.processedUploads?.apartmentPolicies || [];
    // ✅ Validate apartment photo size (max 5MB per image)
    const MAX_PHOTO_SIZE_MB = 5;
    for (const file of uploadedPhotos) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_PHOTO_SIZE_MB) {
        throw new Error(
          `Apartment photo '${
            file.originalname
          }' exceeds 5MB limit (${sizeMB.toFixed(2)} MB).`
        );
      }
    }

    // ✅ Validate apartment policy size (max 10MB per file)
    const MAX_POLICY_SIZE_MB = 10;
    for (const file of uploadedPolicies) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_POLICY_SIZE_MB) {
        throw new Error(
          `Policy file '${
            file.originalname
          }' exceeds 10MB limit (${sizeMB.toFixed(2)} MB).`
        );
      }
    }

    if (!adminDetails || !credentials) {
      throw new Error("Missing admin details or credentials.");
    }

    // Generate new apartmentId
    // Generate new apartmentId
    const lastApartment = await Apartment.findOne()
      .sort({ createdAt: -1 })
      .select("apartmentId");

    let nextNumber = 1;
    if (lastApartment?.apartmentId) {
      const match = lastApartment.apartmentId.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0], 10) + 1;
    }

    // 👇 ✅ Use 'APT' prefix instead of 'apartment'
    const apartmentId = `APT${nextNumber}`;

    // Format apartment policies
    const apartmentPolicies = uploadedPolicies.map((file) => {
      const meta = policyMetadata.find(
        (m) => m.name === file.originalname || m.name === file.filename
      );
      return {
        ...file,
        description: meta?.description || "",
        fromDate: meta?.fromDate || null,
        toDate: meta?.toDate || null,
      };
    });

    let formattedAmenities = [];
    if (Array.isArray(additional.amenities)) {
      formattedAmenities = additional.amenities.map((a) => {
        if (typeof a === "string" || (typeof a === "object" && a._id)) {
          return { amenity: a._id || a, schedule: [] };
        }
        return {
          amenity: a.amenity,
          schedule: Array.isArray(a.schedule) ? a.schedule : [],
        };
      });
    }

    const normPlanId =
      planId &&
      planId !== "null" &&
      planId !== "undefined" &&
      String(planId).trim() !== ""
        ? planId
        : null;

    let planSnapshot = undefined;

    if (normPlanId) {
      const planDoc = await Plan.findById(normPlanId)
        .populate("settings")
        .session(session);

      if (!planDoc) throw new Error("Invalid planId");

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

    // Create Apartment
    const newApartment = await Apartment.create(
      [
        {
          apartmentId,
          name: basic.buildingName,
          // planId: normPlanId || undefined,
          planSnapshot: planSnapshot || undefined,
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
          amenities: formattedAmenities,
          apartmentPhoto: uploadedPhotos,
          apartmentPolicies,
          apartmentAddress,
          alternativeEmail, // ✅ Added here
        },
      ],
      { session }
    ).then((res) => res[0]);

    // Create default roles if not already present
    const defaultRoles = [
      {
        name: "Apartment Admin",
        description: "Primary admin role for managing apartment operations",
        group: "Admins",
      },

      {
        name: "Apartment Sub Admin",
        description: "Secondary admin role for managing apartment operations",
        group: "Admins",
      },

      {
        name: "Occupants",
        description: "Occupants who live in flats",
        group: "Residents",
      },
      {
        name: "President",
        description:
          "Head of the residents’ association; ensures smooth governance.",
        group: "Board-members",
      },
      {
        name: "Secretary",
        description:
          "Handles communication, documentation, and administrative coordination.",
        group: "Board-members",
      },
      {
        name: "Treasurer",
        description: "Manages financial operations, budgeting, and accounting.",
        group: "Board-members",
      },
      {
        name: "Security",
        description: "Handles gate and security operations",
        group: "Staff",
      },
      {
        name: "House Keeping",
        description: "Responsible for cleanliness and maintenance",
        group: "Staff",
      },
    ];

    let adminRole = null;

    for (const roleData of defaultRoles) {
      const slug = roleData.name.trim().toLowerCase().replace(/\s+/g, "-");

      let role = await ApartmentRole.findOne({
        slug,
        apartment: newApartment._id,
      }).session(session);

      if (!role) {
        const created = await ApartmentRole.create(
          [
            {
              name: roleData.name,
              slug,
              description: roleData.description,
              group: roleData.group, // ← ADD THIS
              status: "Active",
              permissions: [],
              apartment: newApartment._id,
            },
          ],
          { session }
        );
        role = created[0];
      }

      if (slug === "apartment-admin") {
        adminRole = role;
      }
    }

    if (!adminRole) throw new Error("Apartment Admin role not found.");

    // Create Admin User
    const existingUser = await User.findOne({
      $or: [
        { contactNumber: adminDetails.contactNumber },
        { email: credentials.email },
      ],
    }).session(session);
    if (existingUser) throw new Error("Admin user already exists.");

    const hashedPassword = await bcrypt.hash(credentials.password, 10);
    if (!adminDetails.isMobileVerified) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Admin contact number ${adminDetails.contactNumber} is not verified`,
      });
    }

    if (!adminDetails.isEmailVerified) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Admin email ${credentials.email} is not verified`,
      });
    }

    const newUser = await User.create(
      [
        {
          name: adminDetails.ownerName,
          email: credentials.email,
          contactNumber: adminDetails.contactNumber,
          password: hashedPassword,
          isMobileVerified: true, // ✅ only allow creation if phone verified
          isEmailVerified: true, // ✅ only if verified
          status: "Active",
        },
      ],
      { session }
    ).then((res) => res[0]);

    // Assign Apartment Admin role using UserRoleAssignment
    await UserRoleAssignment.create(
      [
        {
          user: newUser._id,
          apartment: newApartment._id,
          flat: null,
          role: adminRole._id,
          active: true,
          startDate: new Date(),
        },
      ],
      { session }
    );

    // Link adminUser to apartment
    newApartment.adminUser = newUser._id;
    await newApartment.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Apartment and admin user created successfully",
      apartment: newApartment,
      user: newUser,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Onboarding Error:", error);

    if (error.message === "Admin user already exists.") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
