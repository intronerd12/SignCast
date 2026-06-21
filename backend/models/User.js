const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    phone: {
      type: String,
      required: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 1
        }
      }
    ],
    image: {
      type: String,
      default: ''
    },
    pushToken: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

