const express = require("express");
const { recoredPowerUsage } = require("../controller/power.usage.controller");

const Route = express.Router();

Route.post('/power/usage/:roomId', recoredPowerUsage)

module.exports = Route;