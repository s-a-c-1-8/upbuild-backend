const mongoose = require("mongoose");
const Flat = require("../../model/flat/flatModel");
const User = require("../../model/user/userModel");
const UserRoleAssignment = require("../../model/user/userRoleAssignment");
const ApartmentRole = require("../../model/apartment/apartmentrole");
const logAction = require("../../utils/logAction"); // ✅ Import logAction

exports.createFlatData = async (req, res) => {
  console.log("req body", req.body);
  console.log("req files", req.files);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const step1Data = JSON.parse(req.body.step1Data || "{}");
    const flatData = step1Data.flatData || {};
    const ownerData = step1Data.ownerData || {};
    const addressData = step1Data.addressData || {};
    const occupantsData = req.body.occupantsData
      ? JSON.parse(req.body.occupantsData)
      : [];
    const tenantData = req.body.tenantData
      ? JSON.parse(req.body.tenantData)
      : null;
    const apartmentId = req.body.apartmentId;

    if (!apartmentId) {
      throw new Error("Apartment ID is required.");
    }

    // ✅ Verification checks
    if (!ownerData.phoneVerified) {
      throw new Error(
        `Owner phone number ${ownerData.contactNumber} is not verified.`
      );
    }

    if (Array.isArray(occupantsData)) {
      for (const occ of occupantsData) {
        if (!occ.phoneVerified) {
          throw new Error(
            `Occupant phone number ${occ.phoneNumber} is not verified.`
          );
        }
      }
    }

    if (tenantData && Object.keys(tenantData).length > 0) {
      if (!tenantData.phoneVerified) {
        throw new Error(
          `Tenant phone number ${tenantData.phoneNumber} is not verified.`
        );
      }

      if (Array.isArray(tenantData.occupants)) {
        for (const occ of tenantData.occupants) {
          if (!occ.phoneVerified) {
            throw new Error(
              `Tenant occupant phone number ${occ.phoneNumber} is not verified.`
            );
          }
        }
      }
    }

    const MAX_FILE_SIZE_MB = 10;
    let saleDeedPath = "";
    let parkingPaths = [];
    let tenantAgreementPath = "";

    const saleDeedFile = req.processedUploads?.saleDeedFile?.[0];
    if (saleDeedFile) {
      const sizeMB = saleDeedFile.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(
          `Sale deed file '${
            saleDeedFile.originalname
          }' exceeds 10MB limit (${sizeMB.toFixed(2)} MB).`
        );
      }
      saleDeedPath = `uploads/${saleDeedFile.name}`;
    }

    if (Array.isArray(req.processedUploads?.parkingFiles)) {
      for (const file of req.processedUploads.parkingFiles) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
          throw new Error(
            `Parking file '${
              file.originalname
            }' exceeds 10MB limit (${sizeMB.toFixed(2)} MB).`
          );
        }
      }
      parkingPaths = req.processedUploads.parkingFiles.map(
        (file) => `uploads/${file.name}`
      );
    }

    const agreementFile = req.processedUploads?.agreementFile?.[0];
    if (agreementFile) {
      const sizeMB = agreementFile.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(
          `Agreement file '${
            agreementFile.originalname
          }' exceeds 10MB limit (${sizeMB.toFixed(2)} MB).`
        );
      }
      tenantAgreementPath = `uploads/${agreementFile.name}`;
    }

    const existingFlat = await Flat.findOne({
      apartmentId,
      blockName: flatData.blockName,
      flatName: flatData.flatNumber,
    });

    if (existingFlat) {
      throw new Error(
        `Flat ${flatData.flatNumber} already exists in block ${flatData.blockName} of this apartment.`
      );
    }

    const flat = await Flat.create(
      [
        {
          apartmentId,
          flatName: flatData.flatNumber,
          flatType: flatData.flatType,
          facing: flatData.facing,
          squareFootage: flatData.squareFootage,
          apartmentStatus: flatData.apartmentStatus,
          blockName: flatData.blockName,
          landmark: addressData.landmark,
          city: addressData.city,
          state: addressData.state,
          fullAddress: addressData.fullAddress,
          latitude: flatData.latitude,
          longitude: flatData.longitude,
          powerMeterNumber: flatData.powerMeter,
          stpMeterNumber: flatData.waterMeter,
          additionalDetails: flatData.additionalDetails,
          ownerStaying: !tenantData || Object.keys(tenantData).length === 0,
          saleDeedFile: saleDeedPath,
          parkingFiles: parkingPaths,
        },
      ],
      { session }
    ).then((res) => res[0]);

    const occupantRole = await ApartmentRole.findOne({
      slug: "occupants",
      apartment: apartmentId,
    }).session(session);

    if (!occupantRole) {
      throw new Error(`Role 'occupants' not found for apartment`);
    }

    const occupantRoleId = occupantRole._id;

    const findOrCreateUser = async ({
      name,
      email,
      contactNumber,
      age,
      gender,
      phoneVerified, // ✅ add this
    }) => {
      let user = await User.findOne({ contactNumber }).session(session);
      if (!user) {
        const userData = {
          name,
          contactNumber,
          status: "Active",
          isMobileVerified: !!phoneVerified, // ✅ dynamic, respects actual verification flag
          isEmailVerified: false,
        };
        if (typeof email === "string" && email.trim()) userData.email = email;
        if (age !== undefined && !isNaN(age)) userData.age = Number(age);
        if (typeof gender === "string" && gender.trim())
          userData.gender = gender;

        user = await User.create([userData], { session }).then((res) => res[0]);
      }
      return user;
    };

    const ownerUser = await findOrCreateUser({
      name: ownerData.ownerName,
      email: ownerData.email,
      contactNumber: ownerData.contactNumber,
      age: ownerData.age,
      gender: ownerData.gender,
      phoneVerified: ownerData.phoneVerified, // ✅ pass it
    });

    await UserRoleAssignment.create(
      [
        {
          user: ownerUser._id,
          apartment: apartmentId,
          flat: flat._id,
          role: occupantRoleId,
          relationshipType: "owner",
          active: true,
          startDate: new Date(),
        },
      ],
      { session }
    );

    const tenantUserIds = [];
    if (tenantData && Object.keys(tenantData).length > 0) {
      const tenantUser = await findOrCreateUser({
        name: tenantData.name,
        email: tenantData.email,
        contactNumber: tenantData.phoneNumber,
        phoneVerified: tenantData.phoneVerified, // ✅ pass it
      });
      tenantUserIds.push(tenantUser._id);

      await UserRoleAssignment.create(
        [
          {
            user: tenantUser._id,
            apartment: apartmentId,
            flat: flat._id,
            role: occupantRoleId,
            agreementFile: tenantAgreementPath,
            relationshipType: "tenant",
            startDate: tenantData.startDate,
            endDate: tenantData.endDate,
            active: tenantData.active !== false,
          },
        ],
        { session }
      );

      if (Array.isArray(tenantData.occupants)) {
        for (const occ of tenantData.occupants) {
          const occUser = await findOrCreateUser({
            name: occ.name,
            contactNumber: occ.phoneNumber,
            phoneVerified: occ.phoneVerified, // ✅ pass it
          });
          tenantUserIds.push(occUser._id);

          await UserRoleAssignment.create(
            [
              {
                user: occUser._id,
                apartment: apartmentId,
                flat: flat._id,
                role: occupantRoleId,
                relationshipType: "tenant_occupant",
                active: true,
              },
            ],
            { session }
          );
        }
      }
    }

    const ownerOccupantIds = [];
    if (Array.isArray(occupantsData)) {
      for (const occ of occupantsData) {
        const occUser = await findOrCreateUser({
          name: occ.name,
          contactNumber: occ.phoneNumber,
          phoneVerified: occ.phoneVerified, // ✅ ensure correct flag
        });
        ownerOccupantIds.push(occUser._id);

        await UserRoleAssignment.create(
          [
            {
              user: occUser._id,
              apartment: apartmentId,
              flat: flat._id,
              role: occupantRoleId,
              relationshipType: "owner_occupant",
              active: true,
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    // 🪵 Log the action
    await logAction({
      req,
      action: "CREATE_FLAT",
      description: `Created flat ${flat.flatName} in block ${flat.blockName}`,
      metadata: {
        apartmentId,
        flatId: flat._id,
        block: flat.blockName,
        ownerId: ownerUser._id,
        ownerName: ownerUser.name,
        tenantUserIds,
        ownerOccupantIds,
        parkingFiles: parkingPaths.length,
        saleDeedUploaded: !!saleDeedPath,
        tenantAgreementUploaded: !!tenantAgreementPath,
      },
    });

    return res.status(201).json({
      message: "Flat created and all users added as occupants",
      flat,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Error saving flat:", error);

    // If it's a known validation/verification error, send 400
    if (
      error.message.includes("not verified") ||
      error.message.includes("already exists") ||
      error.message.includes("Apartment ID is required") ||
      error.message.includes("exceeds")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Otherwise it's a server error
    return res.status(500).json({
      message: "Failed to save flat data due to server error.",
      error: error.message,
    });
  }
};
