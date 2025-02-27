const express = require("express");
const { authenticateToken } = require("../middleware/authorized.middleware");
const { getUsageForDeviceByUser, getAllUsageForUser } = require("../controller/repor.controller");

const Route = express.Router();

Route.get("/user/:userId", authenticateToken, getAllUsageForUser);
Route.get("/user/:userId/:deviceId",authenticateToken, getUsageForDeviceByUser);


module.exports = Route;