const PowerUsage = require('../models/power.usage.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');
const moment = require('moment');

exports.getReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;

    let startDate, previousStartDate;
    const endDate = new Date();

    let previousEndDate;

    if (period && period !== 'all-time') {
      switch (period) {
        case 'daily':
          startDate = moment().startOf('day').toDate();
          previousStartDate = moment().subtract(1, 'day').startOf('day').toDate();
          previousEndDate = moment().subtract(1, 'day').endOf('day').toDate();
          break;
        case 'weekly':
          startDate = moment().startOf('isoWeek').toDate();
          previousStartDate = moment().subtract(1, 'week').startOf('isoWeek').toDate();
          previousEndDate = moment().subtract(1, 'week').endOf('isoWeek').toDate();
          break;
        case 'monthly':
          startDate = moment().startOf('month').toDate();
          previousStartDate = moment().subtract(1, 'month').startOf('month').toDate();
          previousEndDate = moment().subtract(1, 'month').endOf('month').toDate();
          break;
        case 'yearly':
          startDate = moment().startOf('year').toDate();
          previousStartDate = moment().subtract(1, 'year').startOf('year').toDate();
          previousEndDate = moment().subtract(1, 'year').endOf('year').toDate();
          break;
        default:
          return res
            .status(400)
            .json({ message: 'Invalid period. Use daily, weekly, monthly, yearly, or all-time.' });
      }
    } else {
      const oldestRecord = await PowerUsage.findOne({}).sort({ createdAt: 1 }).select('createdAt');
      startDate = oldestRecord ? oldestRecord.createdAt : new Date(0);
    }

    const rooms = await Room.find({ userId }).select('_id');
    if (!rooms.length) return res.status(404).json({ message: 'No rooms found for this user' });

    const roomIds = rooms.map(room => room._id);
    const devices = await Device.find({ roomId: { $in: roomIds } }).select('_id name');

    if (!devices.length) return res.status(404).json({ message: 'No devices found for this user' });

    const deviceMap = devices.reduce((acc, device) => {
      acc[device._id] = { _id: device._id, name: device.name };
      return acc;
    }, {});
    const deviceIds = devices.map(device => device._id);

    const powerUsageData = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds }, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$deviceId', totalUsage: { $sum: '$usage' } } },
    ]);

    const totalConsumption = powerUsageData.reduce((sum, usage) => sum + usage.totalUsage, 0);

    let previousPeriodConsumption = null;
    let savingsPercentage = null;

    if (period && period !== 'all-time') {
      const previousUsageData = await PowerUsage.aggregate([
        {
          $match: {
            deviceId: { $in: deviceIds },
            createdAt: { $gte: previousStartDate, $lte: previousEndDate },
          },
        },
        { $group: { _id: '$deviceId', totalUsage: { $sum: '$usage' } } },
      ]);

      previousPeriodConsumption = previousUsageData.reduce(
        (sum, usage) => sum + usage.totalUsage,
        0,
      );

      savingsPercentage = previousPeriodConsumption
        ? ((previousPeriodConsumption - totalConsumption) / previousPeriodConsumption) * 100
        : 0;
    }

    const highestDevice = await PowerUsage.aggregate([
      { $match: { deviceId: { $in: deviceIds }, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$deviceId', total: { $sum: '$usage' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);

    let highestDeviceInfo = null;
    if (highestDevice.length) {
      const device = deviceMap[highestDevice[0]._id];
      highestDeviceInfo = {
        deviceId: device._id,
        deviceName: device.name,
        consumption: highestDevice[0].total,
      };
    }

    const report = {
      userId,
      period: period || 'all-time',
      totalConsumption,
      previousPeriodConsumption:
        period && period !== 'all-time' ? previousPeriodConsumption : undefined,
      savingsPercentage: period && period !== 'all-time' ? savingsPercentage : undefined,
      highestDevice: highestDeviceInfo,
      devices: powerUsageData.map(usage => ({
        deviceId: usage._id,
        deviceName: deviceMap[usage._id]?.name || 'Unknown Device',
        totalUsage: usage.totalUsage,
      })),
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'something went wrong 🤡' });
  }
};
