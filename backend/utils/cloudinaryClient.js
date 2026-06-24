const { v2: cloudinary } = require("cloudinary");

const requiredCloudinaryEnv = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const getMissingCloudinaryEnv = () =>
  requiredCloudinaryEnv.filter((name) => !process.env[name] || !String(process.env[name]).trim());

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
};

const isCloudinaryConfigured = () => getMissingCloudinaryEnv().length === 0;

const verifyCloudinaryConnection = async () => {
  const missing = getMissingCloudinaryEnv();
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing Cloudinary env vars: ${missing.join(", ")}`,
      missing,
    };
  }

  try {
    configureCloudinary();
    await cloudinary.api.ping();
    return { ok: true, error: null, missing: [] };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Cloudinary connection failed",
      missing: [],
    };
  }
};

configureCloudinary();

module.exports = {
  cloudinary,
  configureCloudinary,
  getMissingCloudinaryEnv,
  isCloudinaryConfigured,
  verifyCloudinaryConnection,
};
