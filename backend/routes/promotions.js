const express = require("express");
const Promotion = require("../models/Promotion");
const Order = require("../models/Order");

const router = express.Router();

const normalizeCode = (code) => (code || "").toString().trim().toUpperCase();

const serializePromotion = (promotion) => ({
  id: promotion.id,
  title: promotion.title || "Special Promotion",
  message: promotion.message || "",
  discountCode: promotion.discountCode,
  discountAmount: promotion.discountAmount,
  maxRedemptions: promotion.maxRedemptions,
  maxRedemptionsPerUser: promotion.maxRedemptionsPerUser,
  redeemedCount: promotion.redeemedCount,
  startsAt: promotion.startsAt,
  endsAt: promotion.endsAt,
});

const isPromotionActiveNow = (promotion) => {
  const now = new Date();
  if (promotion.startsAt && promotion.startsAt > now) return false;
  if (promotion.endsAt && promotion.endsAt < now) return false;
  return true;
};

router.get("/active", async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!promotion) {
      return res.json({ active: false });
    }

    if (!isPromotionActiveNow(promotion)) {
      promotion.isActive = false;
      await promotion.save();
      return res.json({ active: false });
    }

    return res.json({ active: true, promotion: serializePromotion(promotion) });
  } catch (error) {
    return res.status(500).json({ active: false, message: error.message });
  }
});

router.get("/validate", async (req, res) => {
  try {
    const code = normalizeCode(req.query.code);
    const userId = req.query.userId;
    if (!code) {
      return res.status(400).json({ valid: false, message: "Promo code is required." });
    }

    const promotion = await Promotion.findOne({
      isActive: true,
      discountCode: code,
    }).sort({ createdAt: -1 });

    if (!promotion) {
      return res.json({ valid: false, message: "Promo code is invalid or expired." });
    }

    if (!isPromotionActiveNow(promotion)) {
      promotion.isActive = false;
      await promotion.save();
      return res.json({ valid: false, message: "Promo code has expired." });
    }

    if (promotion.maxRedemptions && promotion.redeemedCount >= promotion.maxRedemptions) {
      return res.json({ valid: false, message: "Promo code has reached its limit." });
    }

    if (promotion.maxRedemptionsPerUser && userId) {
      const userRedemptions = await Order.countDocuments({
        user: userId,
        discountCode: promotion.discountCode,
      });
      if (userRedemptions >= promotion.maxRedemptionsPerUser) {
        return res.json({ valid: false, message: "You have already used this promo code." });
      }
    }

    return res.json({
      valid: true,
      promotion: serializePromotion(promotion),
    });
  } catch (error) {
    return res.status(500).json({ valid: false, message: error.message });
  }
});

router.post("/deactivate", async (req, res) => {
  try {
    await Promotion.updateMany({ isActive: true }, { isActive: false });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
