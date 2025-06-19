const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const notificationModel = require('../models/notification.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const sendNotification = require('../service/send.notification');
const { saveNotificationInDatabase } = require('./notification.controller');
const Room = require('../models/room.model');
const Device = require('../models/device.model');
const PowerUsage = require('../models/power.usage.model');
const { calculateBill } = require('../service/usageCaluclation');

const initPayament = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('userId', userId);
    const usage = await getUserUsage(userId);
    const amount = calculateBill(usage) * 100;
    console.log('amount', amount);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: 'Subscription',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.DOMAIN}/api/payment/payment-success`,
      cancel_url: `${process.env.DOMAIN}/api/payment/payment-failed`,
    });

    const billingPeriod = getBillingPeriod();

    await Payment.create({
      userId: userId,
      amount,
      billingPeriod,
      status: 'processing',
    });

    return res.status(200).json({
      redirectUrl: session.url,
    });
  } catch (error) {
    res.json({ message: error.message });
  }
};

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const intent = event.data.object;

  try {
    if (event.type === 'payment_intent.succeeded') {
      const result = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        {
          status: 'succeeded',
          receiptUrl: intent.charges.data[0]?.receipt_url || '',
          paymentMethod: intent.payment_method_types[0] || '',
        },
        { new: true },
      );

      if (!result || !result.user) {
        console.warn('Payment or user not found');
        return res.status(200).json({ received: true });
      }

      const user = await User.findById(result.user);
      const deviceToken = user?.deviceToken;
      const title = 'Payment';
      const message = 'You paid successfully';

      if (deviceToken) {
        await sendNotification(deviceToken, title, message);
      }

      await saveNotificationInDatabase(user._id, title, message);

      console.log(`PaymentIntent ${intent.id} succeeded`);
    } else if (event.type === 'payment_intent.payment_failed') {
      const result = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'failed' },
        { new: true },
      );

      if (!result || !result.user) {
        console.warn('Failed payment or user not found');
        return res.status(200).json({ received: true });
      }

      const user = await User.findById(result.user);
      const deviceToken = user?.deviceToken;
      const title = 'Payment';
      const message = 'Payment failed. Please try again.';

      if (deviceToken) {
        await sendNotification(deviceToken, title, message);
      }

      await saveNotificationInDatabase(user._id, title, message);

      console.log(`PaymentIntent ${intent.id} failed`);
    } else if (event.type === 'payment_intent.canceled') {
      const result = await Payment.findOneAndUpdate({ stripePaymentIntentId: intent.id }, { status: 'canceled' });
      const user = await User.findById(result.user);
      const deviceToken = user?.deviceToken;
      const title = 'Payment';
      const message = 'Payment Canceled. Please try again.';

      if (deviceToken) {
        await sendNotification(deviceToken, title, message);
      }

      await saveNotificationInDatabase(user._id, title, message);
      console.log(`PaymentIntent ${intent.id} canceled`);
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sucessPageServe = async (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Success</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f9f9;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              color: #333;
            }
            .container {
              text-align: center;
              background: #ffffff;
              padding: 40px 60px;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #28a745;
              font-size: 2.2rem;
              margin-bottom: 20px;
            }
            p {
              font-size: 1.1rem;
            }
            
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payment Successful!</h1>
            <p>Thank you for your payment. Your service is now active.</p>
          </div>
        </body>
      </html>
    `);
};

const failedPageServe = async (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Failed</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #fff4f4;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              color: #333;
            }
            .container {
              text-align: center;
              background: #ffffff;
              padding: 40px 60px;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #dc3545;
              font-size: 2.2rem;
              margin-bottom: 20px;
            }
            p {
              font-size: 1.1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1> Payment Failed or Canceled</h1>
            <p>Please try again or contact support if the issue persists.</p>
          </div>
        </body>
      </html>
    `);
};

module.exports = { initPayament, handleStripeWebhook, sucessPageServe, failedPageServe };

const getBillingPeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getUserUsage = async userId => {
  try {
    const rooms = await Room.find({ userId }, '_id');
    const roomIds = rooms.map(room => room._id);

    const devices = await Device.find({ roomId: { $in: roomIds } }, '_id');
    const deviceIds = devices.map(device => device._id);

    const result = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds } } },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usage' },
        },
      },
    ]);

    const totalUsage = result.length > 0 ? result[0].totalUsage : 0;

    return totalUsage;
  } catch (err) {
    console.error('Error getting user usage:', err);
    throw err;
  }
};
