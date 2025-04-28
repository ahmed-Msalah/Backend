const PowerUsage = require('../models/power.usage.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');
const moment = require('moment');
const { calculateBill, getTier } = require('../service/usageCaluclation');

exports.getReport = async (req, res) => {
  try {
    const currentYear = moment().year();
    const currentMonth = moment().month();
    const userId = req.user.id;
    const { targetPeriod } = req.query;
    const [targetM, targetY] = targetPeriod ? targetPeriod.split('-') : [currentMonth + 1, currentYear];
    const targetMonth = Number(targetM);
    const targetYear = Number(targetY);

    if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth + 1)) {
      res.status(400).json({ message: 'Invalid Date 😢' });
      return; // التوقف عن تنفيذ الكود بعد الخطأ
    }

    let requiredMonth, previousRequiredMonth;
    const endDate = new Date();
    const numOfYears = currentYear - targetYear;

    let previousEndDate;

    requiredMonth = moment()
      .subtract(numOfYears, 'years')
      .month(targetMonth ? targetMonth - 1 : currentMonth)
      .startOf('month')
      .toDate();

    const usageCountInMonth = await PowerUsage.countDocuments({
      createdAt: {
        $gte: moment(requiredMonth).startOf('month').toDate(),
        $lte: moment(requiredMonth).endOf('month').toDate(),
      },
    });

    if (usageCountInMonth === 0) {
      return res.status(400).json({
        message: `No usage data found in ${moment(requiredMonth).format('YYYY-MM')}`,
      });
    }

    previousRequiredMonth = moment(requiredMonth).subtract(1, 'month').startOf('month').toDate();

    previousEndDate = moment(previousRequiredMonth).endOf('month').toDate();

    const rooms = await Room.find({ userId }).select('_id');
    const roomIds = rooms.map(room => room._id);
    const devices = await Device.find({ roomId: { $in: roomIds } }).select('_id name');

    const deviceMap = devices.reduce((acc, device) => {
      acc[device._id] = { _id: device._id, name: device.name };
      return acc;
    }, {});
    const deviceIds = devices.map(device => device._id);

    const powerUsageDataCurrentPeriod = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: {
            $gte: moment(requiredMonth).startOf('month').toDate(),
            $lte: moment(requiredMonth).endOf('month').toDate(),
          },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          totalUsage: { $sum: '$usage' },
        },
      },
    ]);

    // const devicesCurrentPeriod = powerUsageDataCurrentPeriod.map(usage => ({
    //   deviceId: usage._id,
    //   deviceName: deviceMap[usage._id]?.name || 'Unknown Device',
    //   totalUsage: usage.totalUsage,
    // }));

    const totalUsageCurrentPeriod = powerUsageDataCurrentPeriod.reduce((sum, usage) => sum + usage.totalUsage, 0);

    const usageCost = calculateBill(totalUsageCurrentPeriod);
    const Tier = getTier(totalUsageCurrentPeriod);

    const powerUsageDataAllTime = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: { $lte: endDate },
        },
      },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          usage: 1,
        },
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
          },
          totalUsage: { $sum: '$usage' },
        },
      },
    ]);
    for (i = 0; i < powerUsageDataAllTime.length; i++) {
      powerUsageDataAllTime[i].cost = calculateBill(powerUsageDataAllTime[i].totalUsage);
    }
    console.log(powerUsageDataAllTime);

    const totalUsageAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.totalUsage, 0);
    const totalCostAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.cost, 0);

    const totalPeriod = powerUsageDataAllTime.length;
    console.log(totalCostAllTime, totalUsageAllTime, totalPeriod);

    const averageConsumptionAllTime = totalPeriod > 0 ? totalUsageAllTime / totalPeriod : 0;
    const averageCostAllTime = totalPeriod > 0 ? totalCostAllTime / totalPeriod : 0;

    let previousPeriodConsumption = null;
    let savingsPercentage = null;

    const previousUsageData = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: { $gte: previousRequiredMonth, $lte: previousEndDate },
        },
      },
      { $group: { _id: '$deviceId', totalUsage: { $sum: '$usage' } } },
    ]);

    previousPeriodConsumption = previousUsageData.reduce((sum, usage) => sum + usage.totalUsage, 0);

    savingsPercentage = previousPeriodConsumption
      ? ((previousPeriodConsumption - totalUsageCurrentPeriod) / previousPeriodConsumption) * 100
      : 0;

    const highestDevice = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: {
            $gte: moment().startOf('month').toDate(),
            $lte: moment().endOf('month').toDate(),
          },
        },
      },
      { $group: { _id: '$deviceId', total: { $sum: '$usage' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);

    const report = {
      userId,

      totalConsumption: totalUsageCurrentPeriod,
      consumptionCost: usageCost,

      Tier: Tier,
      averageConsumption: averageConsumptionAllTime,
      averageCost: averageCostAllTime,
      previousTotalConsumption: previousPeriodConsumption ? previousPeriodConsumption : undefined,
      savingsPercentage: savingsPercentage ? Number(savingsPercentage.toFixed(2)) : undefined,
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'something went wrong 🤡' });
  }
};

// const ShowDate = moment().subtract(0, 'years').month(9).startOf('month').toDate();
// console.log('needed date is :' + ShowDate);
// const ShowDate = moment().month(currentMonth).startOf('month').toDate();
//put a duration or the current
