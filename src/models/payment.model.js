const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'egp',
    },
    status: {
      type: String,
      enum: ['processing', 'succeeded', 'failed', 'canceled'],
      default: 'processing',
    },
    receiptUrl: {
      type: String,
    },
    paymentMethod: {
      type: String, 
    },
    billingPeriod: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
