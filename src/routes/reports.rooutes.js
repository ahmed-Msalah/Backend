const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const { getReport } = require('../controller/repor.controller');

const Route = express.Router();
Route.get('/:userId', getReport);
module.exports = Route;
