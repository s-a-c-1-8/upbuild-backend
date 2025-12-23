const express = require("express");
const { createFlatData } = require("../../controller/flat/flatController");
const { upload, compressFile } = require("../../middlewares/uploadMiddleware");
const { getFlatsByApartmentId, getFlatById } = require("../../controller/flat/getFlatController");
const { updateFlatData } = require("../../controller/flat/updateFlat");
const verifyToken = require("../../middlewares/verifyToken");
const checkPermission = require("../../middlewares/checkPermission");

const router = express.Router();

// POST route to submit flat data (Step 1 and Step 2)
router.post(
  "/add/flat",
  upload.fields([
    { name: "saleDeedFile", maxCount: 1 },
    { name: "agreementFile", maxCount: 1 },
    { name: "parkingFiles", maxCount: 10 },
  ]),
  (req, res, next) => {
    console.log("✅ Multer upload middleware triggered");
    console.log("✅ req.files:", req.files);
    console.log("✅ req.body:", req.body);
    next();
  },
  compressFile,
  verifyToken,
  checkPermission("can_add_flats"),
  createFlatData
);


router.post(
  "/update/flat/:id",
  upload.fields([{ name: "agreementFile", maxCount: 1 }]),
  compressFile,
  verifyToken,
  updateFlatData
);


router.post("/get/flat/by/apartment/:apartmentId",verifyToken, getFlatsByApartmentId);
router.get("/get/flat/by/:id", verifyToken,getFlatById);


module.exports = router;
