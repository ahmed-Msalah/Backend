const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const {
  getUsageForDeviceByUser,
  getAllUsageForUser,
  totalConsumptionForUser,
  CompareSavingPercentage,
  highestDeviceConsume,
} = require('../controller/repor.controller');

const Route = express.Router();

Route.get('/user/:userId', authenticateToken, getAllUsageForUser);
Route.get('/user/:userId/:deviceId', authenticateToken, getUsageForDeviceByUser);
Route.get('/consumption/total/:userId', totalConsumptionForUser);
Route.get('/consumption/savings/:userId', CompareSavingPercentage);
Route.get('/consumption/highest/:userId', highestDeviceConsume);

module.exports = Route;
