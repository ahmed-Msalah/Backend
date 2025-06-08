const express = require('express');
const router = express.Router();
const { handleStripeWebhook,  initPayament} = require('../controller/payment.controller');
const { authenticateToken } = require('../middleware/authorized.middleware');

router.post('/create', authenticateToken, initPayament);
router.post('/webhook',authenticateToken, handleStripeWebhook);

module.exports = router;