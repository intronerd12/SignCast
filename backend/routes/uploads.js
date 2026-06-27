const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const {
  cloudinary,
  configureCloudinary,
  isCloudinaryConfigured,
} = require("../utils/cloudinaryClient");

const router = express.Router();

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const uploadOptions = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const isValid = Boolean(FILE_TYPE_MAP[file.mimetype]);
    return cb(isValid ? null : new Error("Invalid image type"), isValid);
  },
});

const getPublicBaseUrl = () =>
  (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`)
    .replace(/\/$/, "");

const getSafeImageBaseName = (file) =>
  (file.originalname || "capture")
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50) || "capture";

const uploadImageLocally = async (file) => {
  const extension = FILE_TYPE_MAP[file.mimetype];
  if (!extension) {
    throw new Error("Invalid image type");
  }

  const uploadDir = path.join(__dirname, "..", "public", "uploads", "captures");
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${getSafeImageBaseName(file)}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const absolutePath = path.join(uploadDir, filename);
  await fs.writeFile(absolutePath, file.buffer);

  return {
    url: `${getPublicBaseUrl()}/public/uploads/captures/${filename}`,
    publicId: `local/captures/${filename}`,
  };
};

const uploadImageToCloudinary = async (file) => {
  if (!isCloudinaryConfigured()) {
    return uploadImageLocally(file);
  }

  configureCloudinary();

  const baseName = getSafeImageBaseName(file);
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  
  let uploaded;
  try {
    uploaded = await cloudinary.uploader.upload(dataUri, {
      public_id: `signcast/captures/${baseName}-${Date.now()}`,
      resource_type: "image",
      overwrite: false,
    });
  } catch (error) {
    const message = (error.message || "").toLowerCase();
    if (message.includes("api_key") || message.includes("api key") || message.includes("cloudinary")) {
      return uploadImageLocally(file);
    }
    throw error;
  }

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
};

// POST /api/v1/uploads
router.post("/", uploadOptions.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const uploadedImage = await uploadImageToCloudinary(req.file);

    return res.status(201).json({
      success: true,
      url: uploadedImage.url,
      publicId: uploadedImage.publicId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Upload failed" });
  }
});

module.exports = router;
