const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");
const https = require("https");
const User = require("../models/User");
const {
  createSupabaseAdminClient,
  createSupabasePublicClient,
} = require("../utils/supabaseClient");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const uploadOptions = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isValid = Boolean(FILE_TYPE_MAP[file.mimetype]);
    return cb(isValid ? null : new Error("Invalid image type"), isValid);
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
      && process.env.CLOUDINARY_API_KEY
      && process.env.CLOUDINARY_API_SECRET
  );

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const uploadImageToCloudinary = async (file) => {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set Cloudinary environment variables.");
  }

  const baseName = (file.originalname || "user-image")
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50) || "user-image";

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    public_id: `signcast/users/${baseName}-${Date.now()}`,
    resource_type: "image",
    overwrite: false,
  });

  return {
    imageUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
};

const fetchGoogleProfile = (accessToken) => {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error("Invalid Google access token"));
            }
            try {
              return resolve(JSON.parse(data));
            } catch (error) {
              return reject(error);
            }
          });
        }
      )
      .on("error", reject);
  });
};

const signUserToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Server authentication is not configured. Set JWT_SECRET.");
  }

  return jwt.sign(
    {
      userId: user.id,
      isAdmin: user.isAdmin,
    },
    secret,
    { expiresIn: "1d" }
  );
};

const buildUserPayload = (body, existingUser = {}) => ({
  name: body.name,
  email: body.email,
  phone: body.phone,
  isAdmin: parseBoolean(body.isAdmin, existingUser?.isAdmin || false),
  street: body.street,
  apartment: body.apartment,
  zip: body.zip,
  city: body.city,
  country: body.country,
});

const getSupabaseUserIsAdmin = (user) =>
  Boolean(user?.app_metadata?.isAdmin || user?.user_metadata?.isAdmin);

const upsertUserProfile = async (supabaseAdmin, user, profile = {}) => {
  const role = getSupabaseUserIsAdmin(user) ? "admin" : "user";

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: profile.name || "",
        phone: profile.phone || "",
        role,
        avatar_url: profile.image || "",
        metadata: {
          source: "backend-register",
        },
      },
      { onConflict: "id" }
    );

  return error;
};

router.get("/", async (req, res) => {
  try {
    const userList = await User.find().select("-passwordHash");
    return res.send(userList);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/get/count", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    return res.send({ userCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "The user with the given ID was not found." });
    }
    return res.status(200).send(user);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const createUser = async (req, res) => {
  try {
    const file = req.file;
    let uploadedImage = {};

    if (file) {
      uploadedImage = await uploadImageToCloudinary(file);
    }

    const user = await User.create({
      ...buildUserPayload(req.body),
      passwordHash: bcrypt.hashSync(req.body.password, 10),
      image: uploadedImage.imageUrl,
      cloudinaryPublicId: uploadedImage.publicId,
    });

    return res.send(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

router.post("/", uploadOptions.single("image"), createUser);

router.post("/register", uploadOptions.single("image"), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    const isAdmin = parseBoolean(req.body?.isAdmin, false);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    let uploadedImage = {};
    if (req.file) {
      uploadedImage = await uploadImageToCloudinary(req.file);
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { isAdmin },
      user_metadata: {
        name: name || "",
        phone: phone || "",
        image: uploadedImage.imageUrl || "",
      },
    });

    if (error) {
      if ((error.message || "").toLowerCase().includes("already")) {
        return res.status(400).json({ success: false, message: "User with this email already exists" });
      }
      return res.status(400).json({ success: false, message: error.message });
    }

    const profileError = await upsertUserProfile(supabaseAdmin, data.user, {
      name,
      phone,
      image: uploadedImage.imageUrl || "",
    });

    return res.status(201).json({
      success: true,
      userId: data.user?.id,
      email: data.user?.email,
      isAdmin: getSupabaseUserIsAdmin(data.user),
      profileStored: !profileError,
      profileMessage: profileError
        ? `Auth user created but profile upsert failed: ${profileError.message}`
        : "Profile stored in user_profiles",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
});

router.put("/:id", uploadOptions.single("image"), async (req, res) => {
  try {
    const userExist = await User.findById(req.params.id);
    if (!userExist) {
      return res.status(404).json({ message: "User not found" });
    }

    const file = req.file;
    let uploadedImage = {};

    if (file) {
      uploadedImage = await uploadImageToCloudinary(file);
    }

    const updatePayload = {
      ...buildUserPayload(req.body, userExist),
      passwordHash: req.body.password ? bcrypt.hashSync(req.body.password, 10) : userExist.passwordHash,
    };

    if (file) {
      updatePayload.image = uploadedImage.imageUrl;
      updatePayload.cloudinaryPublicId = uploadedImage.publicId;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    return res.send(user);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const supabaseClient = createSupabasePublicClient();
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data?.session?.access_token) {
      return res.status(400).json({ success: false, message: error?.message || "Invalid email or password" });
    }

    return res.status(200).send({
      user: data.user.email,
      token: data.session.access_token,
      userId: data.user.id,
      isAdmin: getSupabaseUserIsAdmin(data.user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Google access token is required" });
    }

    let profile;
    try {
      profile = await fetchGoogleProfile(accessToken);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid Google token" });
    }

    if (!profile?.email) {
      return res.status(400).json({ success: false, message: "Google profile missing email" });
    }

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      user = await User.create({
        name: profile.name || profile.given_name || "SignCast User",
        email: profile.email,
        passwordHash: bcrypt.hashSync(randomPassword, 10),
        phone: req.body.phone || "0000000000",
        image: profile.picture || "",
        isAdmin: false,
      });
    } else {
      const updates = {};
      if (!user.image && profile.picture) updates.image = profile.picture;
      if (profile.name && profile.name !== user.name) updates.name = profile.name;
      if (Object.keys(updates).length) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    }

    const token = signUserToken(user);
    return res.status(200).send({ user: user.email, token, userId: user.id, isAdmin: user.isAdmin });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Google login failed" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id/push-token", async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (pushToken) {
      await User.updateMany({ pushToken }, { pushToken: "" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { pushToken: pushToken || "" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.send({
      success: true,
      pushToken: user.pushToken,
      message: pushToken ? "Token updated" : "Token removed",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
