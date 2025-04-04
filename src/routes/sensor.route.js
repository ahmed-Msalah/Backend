const express = require('express');
const { authenticateToken } = require('../middleware/authorized.middleware');
const { createSensor, updateSensor, deleteSensor, getAllSensors } = require('../controller/sensor.controller');
const Router = express.Router();

Router.route('/create').post(authenticateToken, createSensor);
Router.route('/update/:id').put(authenticateToken, updateSensor);
Router.route('/delete/:id').delete(authenticateToken, deleteSensor);
Router.route('/getAll').get(authenticateToken, getAllSensors);


module.exports = Router;
