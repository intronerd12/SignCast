const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");
const https = require("https");
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

const signUserToken = null; // removed — Supabase issues tokens

const buildUserPayload = null; // removed — Supabase handles user fields

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

const formatUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.name || "",
  phone: u.user_metadata?.phone || "",
  isAdmin: getSupabaseUserIsAdmin(u),
  image: u.user_metadata?.image || "",
  createdAt: u.created_at,
});

router.get("/", async (req, res) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json((data?.users || []).map(formatUser));
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/get/count", async (req, res) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ userCount: data?.total ?? (data?.users || []).length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(req.params.id);
    if (error || !data?.user) {
      return res.status(404).json({ message: "The user with the given ID was not found." });
    }
    return res.status(200).json(formatUser(data.user));
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const createUser = async (req, res) => {
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

    await upsertUserProfile(supabaseAdmin, data.user, {
      name,
      phone,
      image: uploadedImage.imageUrl || "",
    });

    return res.status(201).json(formatUser(data.user));
  } catch (error) {
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
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(req.params.id);

    if (fetchError || !existing?.user) {
      return res.status(404).json({ message: "User not found" });
    }

    let uploadedImage = {};
    if (req.file) {
      uploadedImage = await uploadImageToCloudinary(req.file);
    }

    const existingMeta = existing.user.user_metadata || {};
    const updatedMeta = { ...existingMeta };
    if (req.body.name) updatedMeta.name = req.body.name;
    if (req.body.phone) updatedMeta.phone = req.body.phone;
    if (uploadedImage.imageUrl) updatedMeta.image = uploadedImage.imageUrl;

    const updatePayload = { user_metadata: updatedMeta };
    if (req.body.password) updatePayload.password = req.body.password;
    if (req.body.isAdmin !== undefined) {
      updatePayload.app_metadata = { isAdmin: parseBoolean(req.body.isAdmin) };
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, updatePayload);
    if (error) return res.status(400).json({ success: false, message: error.message });

    await upsertUserProfile(supabaseAdmin, data.user, {
      name: updatedMeta.name,
      phone: updatedMeta.phone,
      image: updatedMeta.image,
    });

    return res.json(formatUser(data.user));
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
    } catch {
      return res.status(401).json({ success: false, message: "Invalid Google token" });
    }

    if (!profile?.email) {
      return res.status(400).json({ success: false, message: "Google profile missing email" });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Find existing user in Supabase by email
    let page = 1;
    let existingUser = null;
    while (!existingUser) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return res.status(400).json({ success: false, message: error.message });
      const users = data?.users || [];
      existingUser = users.find((u) => u.email?.toLowerCase() === profile.email.toLowerCase()) || null;
      if (existingUser || users.length < 200) break;
      page += 1;
    }

    if (!existingUser) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: profile.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          name: profile.name || profile.given_name || "SignCast User",
          image: profile.picture || "",
          phone: req.body.phone || "",
        },
      });
      if (createError) return res.status(400).json({ success: false, message: createError.message });
      existingUser = newUser.user;
      await upsertUserProfile(supabaseAdmin, existingUser, {
        name: existingUser.user_metadata?.name || "",
        phone: "",
        image: profile.picture || "",
      });
    }

    return res.status(200).json({
      ...formatUser(existingUser),
      note: "Use Supabase client-side signInWithIdToken to obtain a session token.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Google login failed" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(req.params.id);
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id/push-token", async (req, res) => {
  try {
    const { pushToken } = req.body;
    const supabase = createSupabaseAdminClient();

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("metadata")
      .eq("id", req.params.id)
      .single();

    const existingMeta = profileData?.metadata || {};
    const { error } = await supabase
      .from("user_profiles")
      .update({ metadata: { ...existingMeta, pushToken: pushToken || "" } })
      .eq("id", req.params.id);

    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.json({
      success: true,
      pushToken: pushToken || "",
      message: pushToken ? "Token updated" : "Token removed",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
