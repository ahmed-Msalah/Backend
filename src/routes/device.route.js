const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const {
  createDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  getRunningDevices,
  toggleDevice,
} = require('../controller/device.controller');
const Route = express.Router();

Route.post('/create', authenticateToken, createDevice);
Route.patch('/update/:deviceId', authenticateToken, updateDevice);
Route.delete('/delete/:deviceId', authenticateToken, deleteDevice);
Route.get('/getAll/:userId', authenticateToken, getAllDevices);
Route.get('/running/getAll/:userId', authenticateToken, getRunningDevices);
Route.patch('/toggle/:deviceId', authenticateToken, toggleDevice);

module.exports = Route;
