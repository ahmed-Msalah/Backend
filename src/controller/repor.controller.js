const PowerUsage = require('../models/power.usage.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');
const moment = require('moment');

exports.getReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;

    let startDate;
    const endDate = new Date();

    if (period) {
      switch (period) {
        case 'daily':
          startDate = moment().startOf('day').toDate();
          break;
        case 'weekly':
          startDate = moment().subtract(7, 'days').toDate();
          break;
        case 'monthly':
          startDate = moment().subtract(1, 'month').toDate();
          break;
        case 'yearly':
          startDate = moment().subtract(1, 'year').toDate();
          break;
        default:
          return res
            .status(400)
            .json({ message: 'Invalid period. Use daily, weekly, monthly, or yearly.' });
      }
    } else {
      const oldestRecord = await PowerUsage.findOne({}).sort({ createdAt: 1 }).select('createdAt');
      startDate = oldestRecord ? oldestRecord.createdAt : new Date(0); // إذا لم يوجد أي سجل، نبدأ من 1970
    }

    const rooms = await Room.find({ userId }).select('_id');
    if (!rooms.length) {
      return res.status(404).json({ message: 'No rooms found for this user' });
    }
    const roomIds = rooms.map(room => room._id);

    const devices = await Device.find({ roomId: { $in: roomIds } }).select('_id name');
    if (!devices.length) {
      return res.status(404).json({ message: 'No devices found for this user' });
    }
    const deviceMap = devices.reduce((acc, device) => {
      acc[device._id] = { _id: device._id, name: device.name };
      return acc;
    }, {});
    const deviceIds = devices.map(device => device._id);

    const powerUsageData = await PowerUsage.find({
      deviceId: { $in: deviceIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 });

    const totalConsumption = powerUsageData.reduce((sum, usage) => sum + usage.usage, 0);

    const firstDayCurrentMonth = moment().startOf('month').toDate();
    const firstDayLastMonth = moment().subtract(1, 'month').startOf('month').toDate();

    const lastMonthUsage = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: { $gte: firstDayLastMonth, $lt: firstDayCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$usage' } } },
    ]);
    const lastMonthTotal = lastMonthUsage[0]?.total || 0;
    const savingsPercentage = lastMonthTotal
      ? ((lastMonthTotal - totalConsumption) / lastMonthTotal) * 100
      : 0;

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
      savingsPercentage,
      highestDevice: highestDeviceInfo,
      devices: powerUsageData.map(usage => ({
        deviceId: deviceMap[usage.deviceId]?._id || null,
        usage: usage.usage,
        timestamp: usage.createdAt,
      })),
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'something went wrong 🤡' });
  }
};
