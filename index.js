const appInsights = require('applicationinsights');
appInsights
  .setup(
    'InstrumentationKey=e5ef3799-6b83-45ee-a6aa-4739485cde42;IngestionEndpoint=https://uaenorth-0.in.applicationinsights.azure.com/;LiveEndpoint=https://uaenorth.livediagnostics.monitor.azure.com/;ApplicationId=f7edfb73-ef91-47d8-9f62-01e4381e6c07',
  )
  .start();
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRouter = require('./src/routes/auth.route.js');
const userRouter = require('./src/routes/user.route.js');
const reportRouter = require('./src/routes/reports.rooutes.js');
const roomRouter = require('./src/routes/room.route.js');
const deviceRouter = require('./src/routes/device.route.js');
const categoryRouter = require('./src/routes/category.route.js');
const sensorRouter = require('./src/routes/sensor.route.js');
const automationRouter = require('./src/routes/automation.route.js');
const paymentRouter = require('./src/routes/payment.route.js');
const notificationRouter = require('./src/routes/notification.route.js');
const { client } = require('./src/mqtt/connection.js');
require('./src/buit.in.automation/power.saving.mode.js');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const aiClient = require('applicationinsights').defaultClient;

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    aiClient.trackTrace({
      message: 'Handled Request',
      properties: {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        durationMs: durationMs,
        headers: JSON.stringify(req.headers),
        query: JSON.stringify(req.query),
        body: JSON.stringify(req.body),
      },
    });
  });

  next();
});

// بعد كل الراوتات
app.use((err, req, res, next) => {
  aiClient.trackException({
    exception: err,
    properties: {
      method: req.method,
      url: req.originalUrl,
      headers: JSON.stringify(req.headers),
      query: JSON.stringify(req.query),
      body: JSON.stringify(req.body),
      statusCode: res.statusCode || 500,
    },
  });

  console.error('❌ Unhandled Error:', err);

  res.status(500).json({ message: 'Internal Server Error' });
});

// MQTT
setTimeout(() => {
  if (client.connected) {
    console.log('🟢 MQTT is connected and running.');
  } else {
    console.log('🔴 MQTT is not connected.');
  }
}, 2000);

app.post(
  '/api/payment/webhook',
  bodyParser.raw({ type: 'application/json' }),
  require('./src/controller/payment.controller.js').handleStripeWebhook,
);

// Routes
app.use('/api', authRouter);
app.use('/api/users', userRouter);
app.use('/api/reports', reportRouter);
app.use('/api/room', roomRouter);
app.use('/api/device', deviceRouter);
app.use('/api/category', categoryRouter);
app.use('/api/sensor', sensorRouter);
app.use('/api/automation', automationRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/notification', notificationRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(error => console.error('MongoDB connection error:', error));
