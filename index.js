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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
app.use('/api', authRouter);
app.use('/api/users', userRouter);
app.use("/api/reports", reportRouter);
app.use("/api/room", roomRouter);
app.use("/api/device", deviceRouter);
app.use("/api/category", categoryRouter);
app.use("/api/sensor", sensorRouter);


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
