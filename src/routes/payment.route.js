const express = require('express');
const router = express.Router();
const {
  handleStripeWebhook,
  initPayament,
  sucessPageServe,
  failedPageServe,
} = require('../controller/payment.controller');
const { authenticateToken } = require('../middleware/authorized.middleware');

router.post('/create', authenticateToken, initPayament);
router.post('/webhook', authenticateToken, handleStripeWebhook);
router.get('/payment-success', sucessPageServe);
router.get('/payment-failed', failedPageServe);

module.exports = router;
