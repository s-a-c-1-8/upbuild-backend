const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const CommunityPost = require("../../../model/apartment/communityPost"); // adjust path if different
const { notifyApartmentUsers } = require("../../../utils/notifyApartmentUsers");
const userRoleAssignment = require("../../../model/user/userRoleAssignment");

// Limits
const MAX_TITLE_WORDS = 50;
const MAX_DESC_WORDS = 1000;
const MAX_IMAGES = 5;
const MAX_VIDEOS = 5;

const countWords = (s = "") => s.trim().split(/\s+/).filter(Boolean).length;

const toPublicUploadPath = (absOrRel = "") =>
  absOrRel.replace(/\\/g, "/").replace(/^.*uploads\//, "uploads/");

exports.addCommunityPost = async (req, res) => {
  try {
    const { title = "", description = "" } = req.body || {};

    const auth = req.auth || req.user || {};
    const apartmentId = auth.apartmentId;
    const submittedBy = auth.selectedRoleId;

    // basic validation
    if (!title.trim() || !description.trim()) {
      return res
        .status(400)
        .json({ message: "Title and description are required." });
    }
    if (!apartmentId || !submittedBy) {
      return res
        .status(403)
        .json({ message: "Invalid context. Apartment or role missing." });
    }
    if (countWords(title) > MAX_TITLE_WORDS) {
      return res
        .status(400)
        .json({ message: `Title must be ≤ ${MAX_TITLE_WORDS} words.` });
    }
    if (countWords(description) > MAX_DESC_WORDS) {
      return res
        .status(400)
        .json({ message: `Description must be ≤ ${MAX_DESC_WORDS} words.` });
    }

    // Collect media from processedUploads (set by compressFile)
    const images = Array.isArray(req.processedUploads?.images)
      ? req.processedUploads.images
      : [];
    const videos = Array.isArray(req.processedUploads?.videos)
      ? req.processedUploads.videos
      : [];

    // enforce per-type caps
    if (images.length > MAX_IMAGES) {
      return res
        .status(400)
        .json({ message: `You can upload up to ${MAX_IMAGES} images.` });
    }
    if (videos.length > MAX_VIDEOS) {
      return res
        .status(400)
        .json({ message: `You can upload up to ${MAX_VIDEOS} videos.` });
    }

    // ✅ Only save filePath now
    const mediaDocs = [...images, ...videos].map((f) => ({
      filePath: toPublicUploadPath(f.path || ""),
    }));

    const doc = await CommunityPost.create({
      title: title.trim(),
      description: description.trim(),
      apartment: apartmentId,
      submittedBy,
      media: mediaDocs,
    });

    const roleAssign = await userRoleAssignment.findById(submittedBy).populate(
      "user",
      "name"
    ); // only get name

    const creatorName = roleAssign?.user?.name || "Someone";

    await notifyApartmentUsers({
      apartmentId,
      message: `${creatorName} has created a community post`,
      logId: doc._id,
      logModel: "CommunityPost",
      link: `/apartment/community/post/${doc._id}`,
    });

    return res.status(201).json({
      message: "Community post created successfully.",
      data: doc,
    });
  } catch (err) {
    console.error("❌ addCommunityPost:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};
