const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },

    last_name: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      uefault: 'customer',
    },

    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },

    verified: {
      type: Boolean,
      default: false,
    },

    facebookLogin: {
      type: Boolean, default: false
    },
    googleLogin: {
      type: Boolean,
      default: false,
    },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordVerified: { type: Boolean, default: false },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const User = new mongoose.model('User', userSchema);
module.exports = User;
