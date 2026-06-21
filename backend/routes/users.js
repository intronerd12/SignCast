const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");
const https = require("https");
const Promotion = require("../models/Promotion");

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
    if (!isValid) {
      return cb(new Error("Invalid image type"));
    }
    return cb(null, true);
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { sendPushNotification } = require('../utils/pushNotifications');

const router = express.Router();

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
      && process.env.CLOUDINARY_API_KEY
      && process.env.CLOUDINARY_API_SECRET
  );

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

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
    public_id: `studyzie/users/${baseName}-${Date.now()}`,
    resource_type: "image",
    overwrite: false,
  });

  return {
    imageUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
};

const normalizePromoCode = (value) => (value || "").toString().trim().toUpperCase();

const parseDiscountAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(amount, 100));
};

const parseLimit = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
};

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const fetchGoogleProfile = (accessToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    https
      .get("https://www.googleapis.com/oauth2/v3/userinfo", options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error("Invalid Google access token"));
          }
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
};

// GET all users
router.get('/', async (req, res) => {
  try {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
      return res.status(500).json({ success: false });
    }
    res.send(userList);
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
});

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'The user with the given ID was not found.' });
    }
    res.status(200).send(user);
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
});

// POST register user
router.post('/', uploadOptions.single("image"), async (req, res) => {
  try {
    const file = req.file;
    let imageUrl, cloudinaryPublicId;

    if (file) {
        const uploadedImage = await uploadImageToCloudinary(file);
        imageUrl = uploadedImage.imageUrl;
        cloudinaryPublicId = uploadedImage.publicId;
    }

    let user = new User({
      name: req.body.name,
      email: req.body.email,
      passwordHash: bcrypt.hashSync(req.body.password, 10),
      phone: req.body.phone,
      isAdmin: parseBoolean(req.body.isAdmin, false),
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country,
      image: imageUrl,
      cloudinaryPublicId: cloudinaryPublicId,
    });
    user = await user.save();

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    return res.status(500).json({ success: false, error: error });
  }
});

// POST register user (alternative endpoint)
router.post('/register', uploadOptions.single("image"), async (req, res) => {
  try {
    const file = req.file;
    let imageUrl, cloudinaryPublicId;

    if (file) {
        const uploadedImage = await uploadImageToCloudinary(file);
        imageUrl = uploadedImage.imageUrl;
        cloudinaryPublicId = uploadedImage.publicId;
    }

    let user = new User({
      name: req.body.name,
      email: req.body.email,
      passwordHash: bcrypt.hashSync(req.body.password, 10),
      phone: req.body.phone,
      isAdmin: parseBoolean(req.body.isAdmin, false),
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country,
      image: imageUrl,
      cloudinaryPublicId: cloudinaryPublicId,
    });
    user = await user.save();

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    return res.status(500).json({ success: false, error: error });
  }
});


// PUT update user
router.put('/:id', uploadOptions.single("image"), async (req, res) => {
  try {
    const userExist = await User.findById(req.params.id);
    let newPassword
    if (req.body.password) {
      newPassword = bcrypt.hashSync(req.body.password, 10)
    } else {
      newPassword = userExist.passwordHash;
    }

    const file = req.file;
    let imageUrl, cloudinaryPublicId;

    if (file) {
        const uploadedImage = await uploadImageToCloudinary(file);
        imageUrl = uploadedImage.imageUrl;
        cloudinaryPublicId = uploadedImage.publicId;
    }

    const updatePayload = {
      name: req.body.name,
      email: req.body.email,
      passwordHash: newPassword,
      phone: req.body.phone,
      isAdmin: parseBoolean(req.body.isAdmin, userExist?.isAdmin || false),
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country,
    };

    if (file) {
      updatePayload.image = imageUrl;
      updatePayload.cloudinaryPublicId = cloudinaryPublicId;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
});

// GET user cart
router.get('/:id/cart', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: 'cart.product',
      model: 'Product' // Ensure this matches your Product model name
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Transform the cart to match frontend expectations
    // The frontend expects a flat object with product properties + quantity
    const cartItems = user.cart.map(item => {
      if (!item.product) return null; // Handle case where product was deleted
      return {
        ...item.product._doc,
        product: item.product._id, // Store product ID in 'product' field for consistency
        quantity: item.quantity,
        id: item.product.id // Ensure id is available
      };
    }).filter(item => item !== null);

    res.send(cartItems);
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ success: false, error: error });
  }
});

// PUT update user cart
router.put('/:id/cart', async (req, res) => {
  try {
    const { cart } = req.body;
    
    // Validate cart items format
    const formattedCart = cart.map(item => ({
      product: item.product || item.id || item._id, // Handle different ID locations
      quantity: item.quantity
    }));

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { cart: formattedCart },
      { new: true }
    ).populate({
        path: 'cart.product',
        model: 'Product'
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return the updated cart in the format frontend expects
    const cartItems = user.cart.map(item => {
        if (!item.product) return null;
        return {
          ...item.product._doc,
          product: item.product._id,
          quantity: item.quantity,
          id: item.product.id
        };
      }).filter(item => item !== null);

    res.send(cartItems);
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({ success: false, error: error });
  }
});

// POST login user
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const secret = process.env.JWT_SECRET;

    if (!user) {
      return res.status(400).json({ success: false, message: 'The user was not found' });
    }

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured. Set JWT_SECRET.'
      });
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
      const token = jwt.sign(
        {
          userId: user.id,
          isAdmin: user.isAdmin,
        },
        secret,
        { expiresIn: '1d' }
      );

      res.status(200).send({ user: user.email, token: token, userId: user.id, isAdmin: user.isAdmin });
    } else {
      res.status(400).json({ success: false, message: 'Password is wrong' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

// POST Google login/register
router.post('/google', async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required' });
    }

    let profile;
    try {
      profile = await fetchGoogleProfile(accessToken);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    if (!profile?.email) {
      return res.status(400).json({ success: false, message: 'Google profile missing email' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured. Set JWT_SECRET.'
      });
    }

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      user = new User({
        name: profile.name || profile.given_name || "Studyzie User",
        email: profile.email,
        passwordHash: bcrypt.hashSync(randomPassword, 10),
        phone: req.body.phone || "0000000000",
        image: profile.picture || "",
        isAdmin: false,
      });
      user = await user.save();
    } else {
      const updates = {};
      if (!user.image && profile.picture) updates.image = profile.picture;
      if (profile.name && profile.name !== user.name) updates.name = profile.name;
      if (Object.keys(updates).length) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
      },
      secret,
      { expiresIn: '1d' }
    );

    return res.status(200).send({
      user: user.email,
      token,
      userId: user.id,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Google login failed' });
  }
});

// DELETE user
router.delete('/:id', (req, res) => {
  User.findByIdAndDelete(req.params.id)
    .then((user) => {
      if (user) {
        return res.status(200).json({ success: true, message: 'the user is deleted!' });
      } else {
        return res.status(404).json({ success: false, message: 'user not found!' });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

// PUT update user push token (Update or Remove stale tokens)
router.put('/:id/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    // Logic to handle stale tokens: 
    // If pushToken is provided, it updates. If empty/null, it removes (clears stale token).
    // We also check if this token is already used by another user and clear it from them to avoid duplicates.
    if (pushToken) {
      await User.updateMany({ pushToken: pushToken }, { pushToken: '' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { pushToken: pushToken || '' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.send({ success: true, pushToken: user.pushToken, message: pushToken ? 'Token updated' : 'Token removed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST broadcast promotional push notification to all users
router.post('/broadcast-promotion', async (req, res) => {
  try {
    const { title, message, promotionData } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const users = await User.find({ pushToken: { $exists: true, $ne: '' } }).select('pushToken');
    const tokens = users.map(u => u.pushToken);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No users with push tokens found', count: 0 });
    }

    const normalizedCode = normalizePromoCode(promotionData?.discountCode);
    const normalizedAmount = parseDiscountAmount(promotionData?.discountAmount);
    const startsAt = parseDateValue(promotionData?.startsAt);
    const endsAt = parseDateValue(promotionData?.endsAt);
    const maxRedemptions = parseLimit(promotionData?.maxRedemptions);
    const maxRedemptionsPerUser = parseLimit(promotionData?.maxRedemptionsPerUser);
    const hasValidPromotion = Boolean(normalizedCode && normalizedAmount > 0);

    await Promotion.updateMany({ isActive: true }, { isActive: false });

    let savedPromotion = null;
    if (hasValidPromotion) {
      savedPromotion = await Promotion.create({
        title,
        message,
        discountCode: normalizedCode,
        discountAmount: normalizedAmount,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        maxRedemptions: maxRedemptions || undefined,
        maxRedemptionsPerUser: maxRedemptionsPerUser || undefined,
        isActive: true,
      });
    }

    const notificationPayload = {
      screen: hasValidPromotion ? 'PromotionDetail' : 'Home',
      promotion: hasValidPromotion ? {
        title,
        message,
        discountCode: normalizedCode,
        discountAmount: normalizedAmount,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        maxRedemptions: maxRedemptions || null,
        maxRedemptionsPerUser: maxRedemptionsPerUser || null,
      } : null,
      timestamp: new Date().toISOString(),
    };

    await sendPushNotification(tokens, title, message, notificationPayload);

    res.status(200).json({
      success: true,
      message: 'Broadcast sent successfully',
      count: tokens.length,
      promotionActive: Boolean(savedPromotion),
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET user count
router.get('/get/count', async (req, res) => {
  try {
    const userCount = await User.countDocuments((count) => count);

    if (!userCount) {
      res.status(500).json({ success: false });
    }
    res.send({
      userCount: userCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
});

module.exports = router;
