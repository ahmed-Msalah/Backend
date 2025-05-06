const express = require('express');
const { addAutomation, getUserAutomations, deleteAutomation, updateAutomation } = require('../controller/automation.controller');
const { authenticateToken } = require('../middleware/authorized.middleware');
const Route = express.Router();


Route.post('/create', authenticateToken, addAutomation);
Route.get('/get', authenticateToken, getUserAutomations);
Route.delete('/delete/:automationId', authenticateToken, deleteAutomation);
Route.patch('/update/:automationId', authenticateToken, updateAutomation);

module.exports = Route;