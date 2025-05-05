const PowerUsage = require('../models/power.usage.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');
const moment = require('moment');
const { calculateBill, getTier } = require('../service/usageCaluclation');

exports.getReport = async (req, res) => {
  try {
    const chartData = {};
    const currentYear = moment().year();
    const currentMonth = moment().month();
    const userId = req.user.id;
    const { targetPeriod } = req.query;
    const [targetM, targetY] = targetPeriod ? targetPeriod.split('-') : [currentMonth + 1, currentYear];
    const targetMonth = Number(targetM);
    const targetYear = Number(targetY);
    let totalUsageCurrentPeriod, usageCost, Tier, averageConsumptionAllTime, averageCostAllTime;

    if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth + 1)) {
      return res.status(400).json({
        userId,
        totalConsumption: 0,
        consumptionCost: 0,
        Tier: 0,
        averageConsumption: 0,
        averageCost: 0,
        previousTotalConsumption: 0,
        savingsPercentage: 0,
        savingCostPercntage: 0,
        chartData: Array(10).fill(0),
      });
    }

    let requiredMonth = moment()
      .subtract(currentYear - targetYear, 'years')
      .month(targetMonth - 1)
      .startOf('month')
      .toDate();

    const usageCountInMonth = await PowerUsage.countDocuments({
      createdAt: {
        $gte: moment(requiredMonth).startOf('month').toDate(),
        $lte: moment(requiredMonth).endOf('month').toDate(),
      },
    });

    if (usageCountInMonth === 0) {
      return res.status(200).json({
        userId,
        totalConsumption: 0,
        consumptionCost: 0,
        Tier: 0,
        averageConsumption: 0,
        averageCost: 0,
        previousTotalConsumption: 0,
        savingsPercentage: 0,
        savingCostPercntage: 0,
        chartData,
      });
    }

    const previousRequiredMonth = moment(requiredMonth).subtract(1, 'month').startOf('month').toDate();
    const previousEndDate = moment(previousRequiredMonth).endOf('month').toDate();

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

    totalUsageCurrentPeriod = powerUsageDataCurrentPeriod.reduce((sum, usage) => sum + usage.totalUsage, 0);
    usageCost = calculateBill(totalUsageCurrentPeriod);
    Tier = getTier(totalUsageCurrentPeriod);

    const endDate = new Date();
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

    for (let i = 0; i < powerUsageDataAllTime.length; i++) {
      powerUsageDataAllTime[i].cost = calculateBill(powerUsageDataAllTime[i].totalUsage);
    }

    const totalUsageAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.totalUsage, 0);
    const totalCostAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.cost, 0);
    const totalPeriod = powerUsageDataAllTime.length;
    averageConsumptionAllTime = totalPeriod > 0 ? totalUsageAllTime / totalPeriod : 0;
    averageCostAllTime = totalPeriod > 0 ? totalCostAllTime / totalPeriod : 0;

    const previousUsageData = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: { $gte: previousRequiredMonth, $lte: previousEndDate },
        },
      },
      { $group: { _id: '$deviceId', totalUsage: { $sum: '$usage' } } },
    ]);

    const previousPeriodConsumption = previousUsageData.reduce((sum, usage) => sum + usage.totalUsage, 0);
    const savingsPercentage = previousPeriodConsumption
      ? ((previousPeriodConsumption - totalUsageCurrentPeriod) / previousPeriodConsumption) * 100
      : 0;

    const previousCost = calculateBill(previousPeriodConsumption);
    const savingCostPercntage = previousCost ? ((previousCost - usageCost) / previousCost) * 100 : 0;

    // ====== CHART DATA CALCULATION ======
    const startOfMonth = moment(requiredMonth).startOf('month');
    const daysInMonth = startOfMonth.daysInMonth();
    const readingsPerPoint = Math.floor(daysInMonth / 10);
    const extraDays = daysInMonth % 10;

    for (let i = 0; i < 10; i++) {
      const key = (i + 1).toString();
      const start = moment(startOfMonth).add(i * readingsPerPoint + Math.min(i, extraDays), 'days');
      const end = moment(start)
        .add(readingsPerPoint - 1 + (i < extraDays ? 1 : 0), 'days')
        .endOf('day');

      const periodUsage = await PowerUsage.aggregate([
        {
          $match: {
            deviceId: { $in: deviceIds },
            createdAt: { $gte: start.toDate(), $lte: end.toDate() },
          },
        },
        {
          $group: {
            _id: null,
            totalUsage: { $sum: '$usage' },
          },
        },
      ]);

      chartData[key] = periodUsage[0]?.totalUsage || 0;
    }

    // ====== RESPONSE ======
    const report = {
      userId,
      totalConsumption: totalUsageCurrentPeriod,
      consumptionCost: usageCost,
      Tier: Tier,
      averageConsumption: averageConsumptionAllTime,
      averageCost: averageCostAllTime,
      previousTotalConsumption: previousPeriodConsumption || 0,
      savingsPercentage: savingsPercentage ? Number(savingsPercentage.toFixed(2)) : 0,
      savingCostPercntage: savingCostPercntage ? Number(savingCostPercntage.toFixed(2)) : 0,
      chartData,
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'something went wrong 🤡' });
  }
};

//#region old
// const PowerUsage = require('../models/power.usage.model');
// const Device = require('../models/device.model');
// const Room = require('../models/room.model');
// const moment = require('moment');
// const { calculateBill, getTier } = require('../service/usageCaluclation');

// exports.getReport = async (req, res) => {
//   try {
//     const currentYear = moment().year();
//     const currentMonth = moment().month();
//     const userId = req.user.id;
//     const { targetPeriod } = req.query;
//     const [targetM, targetY] = targetPeriod ? targetPeriod.split('-') : [currentMonth + 1, currentYear];
//     const targetMonth = Number(targetM);
//     const targetYear = Number(targetY);
//     let totalUsageCurrentPeriod, usageCost, Tier, averageConsumptionAllTime, averageCostAllTime;
//     if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth + 1)) {
//       return res.status(400).json({
//         userId,

//         totalConsumption: 0,
//         consumptionCost: 0,

//         Tier: 0,
//         averageConsumption: 0,
//         averageCost: 0,
//         previousTotalConsumption: 0,
//         savingsPercentage: 0,
//       });
//     }

//     let requiredMonth, previousRequiredMonth;
//     const endDate = new Date();
//     const numOfYears = currentYear - targetYear;

//     let previousEndDate;

//     requiredMonth = moment()
//       .subtract(numOfYears, 'years')
//       .month(targetMonth ? targetMonth - 1 : currentMonth)
//       .startOf('month')
//       .toDate();

//     const usageCountInMonth = await PowerUsage.countDocuments({
//       createdAt: {
//         $gte: moment(requiredMonth).startOf('month').toDate(),
//         $lte: moment(requiredMonth).endOf('month').toDate(),
//       },
//     });

//     if (usageCountInMonth === 0) {
//       return res.status(400).json({
//         userId,

//         totalConsumption: 0,
//         consumptionCost: 0,

//         Tier: 0,
//         averageConsumption: 0,
//         averageCost: 0,
//         previousTotalConsumption: 0,
//         savingsPercentage: 0,
//       });
//     }

//     previousRequiredMonth = moment(requiredMonth).subtract(1, 'month').startOf('month').toDate();

//     previousEndDate = moment(previousRequiredMonth).endOf('month').toDate();

//     const rooms = await Room.find({ userId }).select('_id');
//     const roomIds = rooms.map(room => room._id);
//     const devices = await Device.find({ roomId: { $in: roomIds } }).select('_id name');

//     const deviceMap = devices.reduce((acc, device) => {
//       acc[device._id] = { _id: device._id, name: device.name };
//       return acc;
//     }, {});
//     const deviceIds = devices.map(device => device._id);

//     const powerUsageDataCurrentPeriod = await PowerUsage.aggregate([
//       {
//         $match: {
//           deviceId: { $in: deviceIds },
//           createdAt: {
//             $gte: moment(requiredMonth).startOf('month').toDate(),
//             $lte: moment(requiredMonth).endOf('month').toDate(),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: '$deviceId',
//           totalUsage: { $sum: '$usage' },
//         },
//       },
//     ]);

//     // const devicesCurrentPeriod = powerUsageDataCurrentPeriod.map(usage => ({
//     //   deviceId: usage._id,
//     //   deviceName: deviceMap[usage._id]?.name || 'Unknown Device',
//     //   totalUsage: usage.totalUsage,
//     // }));

//     totalUsageCurrentPeriod = powerUsageDataCurrentPeriod.reduce((sum, usage) => sum + usage.totalUsage, 0);

//     usageCost = calculateBill(totalUsageCurrentPeriod);
//     Tier = getTier(totalUsageCurrentPeriod);

//     const powerUsageDataAllTime = await PowerUsage.aggregate([
//       {
//         $match: {
//           deviceId: { $in: deviceIds },
//           createdAt: { $lte: endDate },
//         },
//       },
//       {
//         $project: {
//           year: { $year: '$createdAt' },
//           month: { $month: '$createdAt' },
//           usage: 1,
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: '$year',
//             month: '$month',
//           },
//           totalUsage: { $sum: '$usage' },
//         },
//       },
//     ]);
//     for (i = 0; i < powerUsageDataAllTime.length; i++) {
//       powerUsageDataAllTime[i].cost = calculateBill(powerUsageDataAllTime[i].totalUsage);
//     }
//     console.log(powerUsageDataAllTime);

//     const totalUsageAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.totalUsage, 0);
//     const totalCostAllTime = powerUsageDataAllTime.reduce((sum, usage) => sum + usage.cost, 0);

//     const totalPeriod = powerUsageDataAllTime.length;
//     console.log(totalCostAllTime, totalUsageAllTime, totalPeriod);

//     averageConsumptionAllTime = totalPeriod > 0 ? totalUsageAllTime / totalPeriod : 0;
//     averageCostAllTime = totalPeriod > 0 ? totalCostAllTime / totalPeriod : 0;

//     let previousPeriodConsumption = null;
//     let savingsPercentage = null;

//     const previousUsageData = await PowerUsage.aggregate([
//       {
//         $match: {
//           deviceId: { $in: deviceIds },
//           createdAt: { $gte: previousRequiredMonth, $lte: previousEndDate },
//         },
//       },
//       { $group: { _id: '$deviceId', totalUsage: { $sum: '$usage' } } },
//     ]);

//     previousPeriodConsumption = previousUsageData.reduce((sum, usage) => sum + usage.totalUsage, 0);

//     savingsPercentage = previousPeriodConsumption
//       ? ((previousPeriodConsumption - totalUsageCurrentPeriod) / previousPeriodConsumption) * 100
//       : 0;

//     const highestDevice = await PowerUsage.aggregate([
//       {
//         $match: {
//           deviceId: { $in: deviceIds },
//           createdAt: {
//             $gte: moment().startOf('month').toDate(),
//             $lte: moment().endOf('month').toDate(),
//           },
//         },
//       },
//       { $group: { _id: '$deviceId', total: { $sum: '$usage' } } },
//       { $sort: { total: -1 } },
//       { $limit: 1 },
//     ]);

//     const report = {
//       userId,

//       totalConsumption: totalUsageCurrentPeriod,
//       consumptionCost: usageCost,

//       Tier: Tier,
//       averageConsumption: averageConsumptionAllTime,
//       averageCost: averageCostAllTime,
//       previousTotalConsumption: previousPeriodConsumption ? previousPeriodConsumption : undefined,
//       savingsPercentage: savingsPercentage ? Number(savingsPercentage.toFixed(2)) : undefined,
//     };

//     res.json(report);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'something went wrong 🤡' });
//   }
// };

// // const ShowDate = moment().subtract(0, 'years').month(9).startOf('month').toDate();
// // console.log('needed date is :' + ShowDate);
// // const ShowDate = moment().month(currentMonth).startOf('month').toDate();
// //put a duration or the current
//#endregion
