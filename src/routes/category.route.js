const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const getDeviceCategories = require('../controller/category.controller');
const Route = express.Router();


Route.get('/all', authenticateToken, getDeviceCategories);

module.exports = Route;