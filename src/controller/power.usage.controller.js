const Device = require('../models/device.model');
const PowerUsage = require("../models/power.usage.model");
const Sensor = require("../models/sensor.model");
const { getOpenAIResponse } = require("../service/open.api.service");


 const getHistoricalUsage = async (deviceIds) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const history = await PowerUsage.aggregate([
        { $match: { deviceId: { $in: deviceIds }, createdAt: { $gte: oneWeekAgo } } },
        { $group: { _id: "$deviceId", totalUsage: { $sum: "$usage" } } }
    ]);

    return history.reduce((acc, entry) => {
        acc[entry._id] = entry.totalUsage;
        return acc;
    }, {});
};

 const recoredPowerUsage = async (req, res) => {
    try {
        const { pinNumber } = req.params;
        const userId = req.user.id;
        const { totalUsage } = req.body;

        const sensor = await Sensor.find({ pinNumber, userId });
        const devices = await Device.find({ roomId: sensor.roomId })

        if (!devices.length) {
            return res.status(400).json({ message: "No devices found" });
        }

        const devicesId = devices.map(device => device._id);
        const devicesHistory = await getHistoricalUsage(devicesId);

        const prompt = `
      We have ${totalUsage} watts consumed across ${devices.length} IoT devices.
      Each device has historical usage data for the last 7 days.
      
      Devices:
      ${devices.map(device =>
            `Device ${device._id} (Past Usage: ${devicesHistory[device._id] || 0}Wh)`
        ).join("\n")}
      
      Distribute the total power consumption based only on historical usage.
      Output JSON: [{"deviceId": "id", "usage": value}].
      `;



        const aiResponseText = await getOpenAIResponse(prompt);
        const aiResult = JSON.parse(aiResponseText);


        await PowerUsage.insertMany(
            aiResult.map(d => ({ deviceId: d.deviceId, usage: d.usage }))
        );

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {getHistoricalUsage, recoredPowerUsage}