const mqtt = require("mqtt");
const PowerUsage = require("../models/power.usage.model");
const client = mqtt.connect("mqtt://your-mqtt-broker-ip");

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
  client.subscribe("devices/power-usage");
});

client.on("message", async (topic, message) => {
  try {
    if (topic === "devices/power-usage") {
      const parsedMessage = JSON.parse(message.toString()); // Assuming JSON format
      const { deviceId, usage } = parsedMessage;

      if (!deviceId || isNaN(usage)) {
        console.error("❌ Invalid data received:", parsedMessage);
        return;
      }

      const newPowerUsage = new PowerUsage({
        deviceId,
        usage,
      });

      await newPowerUsage.save();
      console.log(`✅ Power usage stored: ${usage}W from device ${deviceId}`);
    }

    if (topic === "devices/register") {
      const deviceData = JSON.parse(message.toString());

      // Check if the device already exists
      const existingDevice = await Device.findOne({ deviceId: deviceData.deviceId });
      if (existingDevice) return console.log("Device already exists:", deviceData.deviceId);

      // Save new device to the database
      const newDevice = new Device({
        deviceId: deviceData.deviceId,
        name: deviceData.name || "New Device",
        description: deviceData.description || "",
        status: deviceData.status || "OFF",
        roomId: deviceData.roomId,
      });

      await newDevice.save();
      console.log("Device registered successfully:", newDevice);
    }
  } catch (error) {
    console.error("Error storing data:", error);
  }
});
