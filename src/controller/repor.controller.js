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
    const devices = await Device.find({ roomId: { $in: roomIds } }).select("_id name");
    if (!devices.length) {
      return res.status(404).json({ message: "No devices found for this user" });
    }

    // Map devices by _id for quick lookup
    const deviceMap = devices.reduce((acc, device) => {
      acc[device._id] = { _id: device._id, name: device.name };
      return acc;
    }, {});

    // Extract device IDs
    const deviceIds = devices.map((device) => device._id);

    // Find power usage data within the specified time range
    const powerUsageData = await PowerUsage.find({
      deviceId: { $in: deviceIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 });

    // Format the response data
    const report = powerUsageData.map((usage) => ({
      deviceId: deviceMap[usage.deviceId]?._id || null,
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
    const device = await Device.findOne({ _id: deviceId, roomId: { $in: roomIds } }).select("_id name");
    if (!device) {
      return res.status(404).json({ message: "Device not found for this user" });
    }

    // Fetch power usage for this specific device
    const powerUsageData = await PowerUsage.find({ deviceId: device._id })
      .sort({ createdAt: -1 }) // Latest usage first
      .limit(10); // Optional: limit results for performance

    res.json({
      userId,
      deviceId: device._id,
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

exports.totalConsumptionForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await Room.find({ userId }).select("_id");
    const roomIds = rooms.map(room => room._id);

    const devices = await Device.find({ roomId: { $in: roomIds } }).select("_id");
    const deviceIds = devices.map(device => device._id);

    const totalConsumption = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds } } },
      { $group: { _id: null, total: { $sum: "$usage" } } }
    ]);

    res.json({ totalConsumption: totalConsumption[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: "something went wrong 🤡" });
  }
};


exports.CompareSavingPercentage = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const rooms = await Room.find({ userId }).select("_id");
    const roomIds = rooms.map(room => room._id);
    const devices = await Device.find({ roomId: { $in: roomIds } }).select("_id");
    const deviceIds = devices.map(device => device._id);

    const currentMonthUsage = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds }, createdAt: { $gte: firstDayCurrentMonth } } },
      { $group: { _id: null, total: { $sum: "$usage" } } }
    ]);

    const lastMonthUsage = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds }, createdAt: { $gte: firstDayLastMonth, $lt: firstDayCurrentMonth } } },
      { $group: { _id: null, total: { $sum: "$usage" } } }
    ]);

    const lastMonthTotal = lastMonthUsage[0]?.total || 0;
    const currentMonthTotal = currentMonthUsage[0]?.total || 0;

    const savingsPercentage = lastMonthTotal
      ? ((lastMonthTotal - currentMonthTotal) / lastMonthTotal) * 100
      : 0;

    res.json({ savingsPercentage });
  } catch (error) {
    res.status(500).json({ error: "ERROR!" });
  }
};



exports.highestDeviceConsume = async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await Room.find({ userId }).select("_id");
    const roomIds = rooms.map(room => room._id);
    const devices = await Device.find({ roomId: { $in: roomIds } });
    const deviceIds = devices.map(device => device._id);

    const highestDevice = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds } } },
      { $group: { _id: "$deviceId", total: { $sum: "$usage" } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);

    if (!highestDevice.length) {
      return res.json({ message: "لا يوجد استهلاك" });
    }

    const device = await Device.findOne({ deviceId: highestDevice[0]._id });

    res.json({
      deviceId: device.deviceId,
      deviceName: device.name,
      consumption: highestDevice[0].total,
    });
  } catch (error) {
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
};

