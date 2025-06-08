const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const notificationModel = require('../models/notification.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const sendNotification = require("../service/send.notification");
const { saveNotificationInDatabase } = require('./notification.controller');


const initPayament = async (req, res) => {

    try {
        const { amount, userId } = req.body;
        const convertAmount = amount * 100;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: convertAmount,
            currency: 'egp',
            automatic_payment_methods: { enabled: true },
        });
        console.log("paymentIntent", paymentIntent)

        const billingPeriod = getBillingPeriod();

        await Payment.create({
            user: userId,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            billingPeriod,
            status: 'processing',
        });

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        })
    }
    catch (error) {
        res.json({ message: error.message })
    }
}



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
                { new: true }
            );

            if (!result || !result.user) {
                console.warn("Payment or user not found");
                return res.status(200).json({ received: true });
            }

            const user = await User.findById(result.user);
            const deviceToken = user?.deviceToken;
            const title = "Payment";
            const message = "You paid successfully";

            if (deviceToken) {
                await sendNotification(deviceToken, title, message);
            }

            await saveNotificationInDatabase(user._id, title, message);

            console.log(`PaymentIntent ${intent.id} succeeded`);
        }

        else if (event.type === 'payment_intent.payment_failed') {
            const result = await Payment.findOneAndUpdate(
                { stripePaymentIntentId: intent.id },
                { status: 'failed' },
                { new: true }
            );

            if (!result || !result.user) {
                console.warn("Failed payment or user not found");
                return res.status(200).json({ received: true });
            }

            const user = await User.findById(result.user);
            const deviceToken = user?.deviceToken;
            const title = "Payment";
            const message = "Payment failed. Please try again.";

            if (deviceToken) {
                await sendNotification(deviceToken, title, message);
            }

            await saveNotificationInDatabase(user._id, title, message);

            console.log(`PaymentIntent ${intent.id} failed`);
        }

        else if (event.type === 'payment_intent.canceled') {
            const result = await Payment.findOneAndUpdate(
                { stripePaymentIntentId: intent.id },
                { status: 'canceled' }
            );
            const user = await User.findById(result.user);
            const deviceToken = user?.deviceToken;
            const title = "Payment";
            const message = "Payment Canceled. Please try again.";

            if (deviceToken) {
                await sendNotification(deviceToken, title, message);
            }

            await saveNotificationInDatabase(user._id, title, message)
            console.log(`PaymentIntent ${intent.id} canceled`);
        }

        else {
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.status(200).json({ received: true });

    } catch (error) {
        console.error("Webhook handler error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { initPayament, handleStripeWebhook };


const getBillingPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};