const express = require('express');
const router = express.Router();
const { handleStripeWebhook,  initPayament} = require('../controller/payment.controller');

router.post('/create', initPayament);
router.post('/webhook', handleStripeWebhook);

module.exports = router;