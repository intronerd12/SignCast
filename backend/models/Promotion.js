const mongoose = require("mongoose");

const promotionSchema = mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
  },
  discountCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  discountAmount: {
    type: Number,
    min: 0,
    max: 100,
  },
  maxRedemptions: {
    type: Number,
    min: 0,
  },
  maxRedemptionsPerUser: {
    type: Number,
    min: 0,
  },
  redeemedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startsAt: {
    type: Date,
  },
  endsAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

promotionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

promotionSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Promotion", promotionSchema);
