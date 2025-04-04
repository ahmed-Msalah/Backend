const mqtt = require("mqtt");
const PowerUsage = require("../models/power.usage.model");
const Device = require("../models/device.model");
const Sensor = require("../models/sensor.model");
const { getHistoricalUsage } = require("../controller/power.usage.controller");
const { getOpenAIResponse } = require("../service/open.api.service");
const Room = require("../models/room.model");
const client = mqtt.connect("mqtt://your-mqtt-broker-ip");

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
  client.subscribe("sensor/reading");
});

client.on("message", async (topic, message) => {
  try {
    if (topic === "sensor/reading") {
      const parsedMessage = JSON.parse(message.toString());
      const { pinNumber, userId, usage } = parsedMessage;

      if (!pinNumber || isNaN(usage)) {
        console.error("Invalid data received:", parsedMessage);
        return;
      }

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


      const savedUsage = await PowerUsage.insertMany(
        aiResult.map(d => ({ deviceId: d.deviceId, usage: d.usage }))
      );
    }

    if (topic === "device/on") {
      const deviceData = JSON.parse(message.toString());

      const room = await Room.findOne({ userId: deviceData.userId })
      const existingDevice = await Device.findOne({ pinNumber: deviceData.pinNumber, roomId: room._id });

      if (existingDevice) {
        await Device.updateOne({ _id: existingDevice._id }, { status: "ON" });
      }
    }

    if (topic === "device/off") {
      const deviceData = JSON.parse(message.toString());

      const room = await Room.findOne({ userId: deviceData.userId })
      const existingDevice = await Device.findOne({ pinNumber: deviceData.pinNumber, roomId: room._id });

      if (existingDevice) {
        await Device.updateOne({ _id: existingDevice._id }, { status: "OFF" });
      }
    }

  } catch (error) {
    console.error("Error storing data:", error);
  }
});
