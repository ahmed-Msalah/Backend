const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/payment.model');


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
        console.error(' Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const intent = event.data.object;

    switch (event.type) {
        case 'payment_intent.succeeded':
            await Payment.findOneAndUpdate(
                { stripePaymentIntentId: intent.id },
                {
                    status: 'succeeded',
                    receiptUrl: intent.charges.data[0]?.receipt_url,
                    paymentMethod: intent.payment_method_types[0],
                }
            );
            console.log(` PaymentIntent ${intent.id} succeeded`);
            break;

        case 'payment_intent.payment_failed':
            await Payment.findOneAndUpdate(
                { stripePaymentIntentId: intent.id },
                { status: 'failed' }
            );
            console.log(` PaymentIntent ${intent.id} failed`);
            break;

        case 'payment_intent.canceled':
            await Payment.findOneAndUpdate(
                { stripePaymentIntentId: intent.id },
                { status: 'canceled' }
            );
            console.log(` PaymentIntent ${intent.id} canceled`);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
};

module.exports = { initPayament, handleStripeWebhook };


const getBillingPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};