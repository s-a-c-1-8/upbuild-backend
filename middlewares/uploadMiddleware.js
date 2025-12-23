const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const fluentFfmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);
fluentFfmpeg.setFfprobePath(ffprobePath);

// Base upload dir
const baseUploadDir = "uploads/";

// Dynamically determine upload directory
const getUploadDir = (req) => {
  if (req.originalUrl.includes("/visitor")) {
    return path.join(baseUploadDir, "visitor");
  } else if (req.originalUrl.includes("/apartment/user")) {
    return path.join(baseUploadDir, "user");
  } else if (req.originalUrl.includes("/agency")) {
    return path.join(baseUploadDir, "agencies");
  } else if (req.originalUrl.includes("/complaint")) {
    return path.join(baseUploadDir, "complaint");
  } else if (req.originalUrl.includes("/comment")) {
    return path.join(baseUploadDir, "comment");
  } else if (req.originalUrl.includes("/maintenance/expense")) {
    return path.join(baseUploadDir, "expense"); // ✅ for expense invoices
  }
  return baseUploadDir;
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // ✅ allow common image, video, and pdf mimetypes
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      // videos
      "video/mp4",
      "video/quicktime", // .mov
      "video/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only JPEG, PNG, WebP, MP4/MOV/WebM videos, and PDF allowed"),
        false
      );
    }
  },
});

const compressFile = async (req, res, next) => {
  // normalize single file to array under .photo to keep your other routes working
  if (req.file) {
    req.files = { photo: [req.file] };
  }

  // console.log("🧾 req.files:", req.files);
  if (!req.files) return next();

  req.processedUploads = {};

  const uploadDir = getUploadDir(req);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filesToProcess = Object.entries(req.files).flatMap(
    ([fieldname, files]) => files.map((file) => ({ ...file, fieldname }))
  );

  try {
    await Promise.all(
      filesToProcess.map(async (file) => {
        const origExt = path.extname(file.originalname) || ".bin";

        // For videos, we’ll always output .mp4 (H.264 + AAC) for best compatibility
        const isVideo = file.mimetype.startsWith("video/");
        const isImage = file.mimetype.startsWith("image/");
        const isPdf = file.mimetype === "application/pdf";

        const targetExt = isVideo ? ".mp4" : origExt;
        const uniqueFilename = `${Date.now()}-${Math.floor(
          Math.random() * 1e9
        )}${targetExt}`;
        const fullPath = path.join(uploadDir, uniqueFilename);

        if (isPdf) {
          // PDFs: write buffer directly
          fs.writeFileSync(fullPath, file.buffer);
        } else if (isImage) {
          // IMAGES: compress to JPEG, fit within 1920x1080, keep aspect
          await sharp(file.buffer)
            .resize({ width: 1920, height: 1080, fit: "inside" })
            .toFormat("jpeg", { quality: 80 })
            .toFile(fullPath);
        } else if (isVideo) {
          // VIDEOS: write buffer to temp, then compress with ffmpeg
          const tempPath = path.join(
            uploadDir,
            `temp-${Date.now()}-${Math.floor(Math.random() * 1e9)}${
              origExt || ".tmp"
            }`
          );
          fs.writeFileSync(tempPath, file.buffer);

          // ffmpeg options:
          // - H.264 video, CRF 23 (good quality/size), preset 'veryfast'
          // - AAC audio @128k
          // - limit to <=1080p while preserving aspect ratio (no upscale)
          // - faststart for web playback (moov atom first)
          await new Promise((resolve, reject) => {
            fluentFfmpeg(tempPath)
              .outputOptions([
                "-movflags +faststart",
                "-preset veryfast",
                "-crf 23",
                "-c:v libx264",
                "-c:a aac",
                "-b:a 128k",
                // scale filter: cap to 1920x1080, keep aspect, don't upscale
                "-vf scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
              ])
              .on("end", () => {
                try {
                  fs.unlinkSync(tempPath);
                } catch {}
                resolve();
              })
              .on("error", (err) => {
                try {
                  fs.unlinkSync(tempPath);
                } catch {}
                reject(err);
              })
              .save(fullPath);
          });
        }

        if (!req.processedUploads[file.fieldname]) {
          req.processedUploads[file.fieldname] = [];
        }
        req.processedUploads[file.fieldname].push({
          name: path.basename(fullPath),
          type: file.mimetype,
          path: fullPath,
          originalname: file.originalname,
        });
      })
    );

    next();
  } catch (err) {
    console.error("❌ File processing failed", err);
    next(err);
  }
};

module.exports = { upload, compressFile };
