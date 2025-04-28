const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const { getReport } = require('../controller/repor.controller');
const Route = express.Router();
Route.get('/', authenticateToken, getReport);
module.exports = Route;
// Route.get('/:userId', authenticateToken, getReport);
// module.exports = Route;
