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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(error => console.error('MongoDB connection error:', error));
