const PowerUsage = require("../models/power.usage.model");
const Device = require("../models/device.model");
const Room = require("../models/room.model");
const moment = require("moment"); 

exports.getAllUsageForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { period } = req.query;

    // Set time filter based on period
    let startDate;
    const endDate = new Date(); // Current time

    if (period === "weekly") {
      startDate = moment().subtract(7, "days").toDate();
    } else if (period === "monthly") {
      startDate = moment().subtract(1, "month").toDate();
    } else if (period === "yearly") {
      startDate = moment().subtract(1, "year").toDate();
    } else {
      return res.status(400).json({ message: "Invalid period. Use weekly, monthly, or yearly." });
    }

    // Find all rooms belonging to the user
    const rooms = await Room.find({ userId }).select("_id");
    if (!rooms.length) {
      return res.status(404).json({ message: "No rooms found for this user" });
    }

    // Extract room IDs
    const roomIds = rooms.map((room) => room._id);

    // Find all devices in these rooms
    const devices = await Device.find({ roomId: { $in: roomIds } }).select("_id deviceId name");
    if (!devices.length) {
      return res.status(404).json({ message: "No devices found for this user" });
    }

    // Map devices by _id for quick lookup
    const deviceMap = devices.reduce((acc, device) => {
      acc[device.deviceId] = { deviceId: device.deviceId, name: device.name };
      return acc;
    }, {});

    // Extract device IDs
    const deviceIds = devices.map((device) => device.deviceId);

    // Find power usage data within the specified time range
    const powerUsageData = await PowerUsage.find({
      deviceId: { $in: deviceIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 });

    // Format the response data
    const report = powerUsageData.map((usage) => ({
      deviceId: deviceMap[usage.deviceId]?.deviceId || null,
      name: deviceMap[usage.deviceId]?.name || "Unknown Device",
      usage: usage.usage,
      timestamp: usage.createdAt,
    }));

    res.json({ userId, period, devices: report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.getUsageForDeviceByUser = async (req, res) => {
  try {
    const { userId, deviceId } = req.params;

    // Find all rooms that belong to the user
    const rooms = await Room.find({ userId }).select("_id");
    if (!rooms.length) {
      return res.status(404).json({ message: "No rooms found for this user" });
    }

    // Extract room IDs
    const roomIds = rooms.map((room) => room._id);

    // Find the device and ensure it belongs to one of the user's rooms
    const device = await Device.findOne({ deviceId, roomId: { $in: roomIds } }).select("deviceId name");
    if (!device) {
      return res.status(404).json({ message: "Device not found for this user" });
    }

    // Fetch power usage for this specific device
    const powerUsageData = await PowerUsage.find({ deviceId: device._id })
      .sort({ createdAt: -1 }) // Latest usage first
      .limit(10); // Optional: limit results for performance

    res.json({
      userId,
      deviceId: device.deviceId,
      deviceName: device.name,
      usageHistory: powerUsageData.map((usage) => ({
        usage: usage.usage,
        timestamp: usage.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
