const mqtt = require('mqtt');
const PowerUsage = require('../models/power.usage.model');
const Device = require('../models/device.model');
const Sensor = require('../models/sensor.model');
const User = require('../models/user.model');
const DeviceCategory = require('../models/category.model');
const { getHistoricalUsage } = require('../controller/power.usage.controller');
const { getGeminiResponse } = require('../service/GeminiApiService');
const Room = require('../models/room.model');

const client = mqtt.connect('mqtts://16e4e8df7324425ca5345bf26bd5aeec.s1.eu.hivemq.cloud:8883', {
  username: 'ahmed_1',
  password: 'Arnousa712@2002#',
  rejectUnauthorized: true,
});

client.on('connect', () => {
  client.subscribe('sensor/reading');
  client.subscribe('device/on');
  client.subscribe('device/off');
  client.subscribe('triger/movement');
  client.subscribe('triger/noMovement');
  const payload = JSON.stringify({ status: 'OFF', pins: [26] });
  client.publish('device/led', payload);
});

client.on('error', err => {
  console.error(' MQTT connection error:', err);
});

client.on('close', () => {
  console.warn(' MQTT connection closed');
});

client.on('message', async (topic, message) => {
  try {
    if (topic === 'sensor/reading') {
      const parsedMessage = JSON.parse(message.toString());
      console.log('Power Reading', parsedMessage);

      const { pin, email, usage } = parsedMessage;

      if (!pin || isNaN(usage)) {
        console.error('Invalid data received:', parsedMessage);
        return;
      }

      const user = await User.findOne({ email });

      const sensor = await Sensor.findOne({ pinNumber: pin, userId: user._id });
      console.log('sensor', sensor);
      if (sensor) {
        const devices = await Device.find({ roomId: sensor.roomId });
        console.log('devices', devices);
        if (devices.length > 0) {
          const devicesId = devices.map(device => device._id);
          const devicesHistory = await getHistoricalUsage(devicesId);
          console.log('devicesHistory', devicesHistory);

          const prompt = `
          We have ${totalUsage} watts consumed across ${devices.length} IoT devices.
          Each device has historical usage data for the last 7 days.
          
          Devices:
          ${devices.map(device => `Device ${device._id} (Past Usage: ${devicesHistory[device._id] || 0}Wh)`).join('\n')}
          
          Distribute the total power consumption based only on historical usage.
          Output JSON: [{"deviceId": "id", "usage": value}].
          `;

          const aiResponseText = await getGeminiResponse(prompt);
          const aiResult = JSON.parse(aiResponseText);
          console.log('aiResult', aiResult);

          await PowerUsage.insertMany(aiResult.map(d => ({ deviceId: d.deviceId, usage: d.usage })));
        }
      }
    }

    if (topic === 'triger/movement') {
      const trigerData = JSON.parse(message.toString());
      const { pin, email } = trigerData;

      const user = await User.findOne({ email });
      if (user) {
        const sensor = await Sensor.findOne({ pinNumber: pin, userId: user._id });

        if (sensor) {
          const devices = await Device.find({ roomId: sensor.roomId });

          if (devices.length > 0) {
            const devicesId = devices.map(device => device._id);

            console.log('movement', trigerData);
            const category = await DeviceCategory.findOne({ enName: 'LED' });

            const updatedDevices = await Device.updateMany(
              {
                _id: { $in: devicesId },
                categoryId: category._id,
              },
              {
                $set: { status: 'ON' },
              },
            );

            const pins = updatedDevices.map(device => device.pinNumber);

            const payload = JSON.stringify({ status: 'ON', pins });
            client.publish('device/led', payload);
          }
        }
      }
    }

    if (topic === 'triger/noMovement') {
      const trigerData = JSON.parse(message.toString());
      const { pin, email } = trigerData;

      // console.log("no Movement", trigerData)
      const user = await User.findOne({ email });
      if (user) {
        const sensor = await Sensor.findOne({ pinNumber: pin, userId: user._id });
        // console.log("sensor", sensor);
        if (sensor) {
          const devices = await Device.find({ roomId: sensor.roomId });

          if (devices.length > 0) {
            const devicesId = devices.map(device => device._id);

            const category = await DeviceCategory.findOne({ enName: 'LED' });

            const updatedDevices = await Device.updateMany(
              {
                _id: { $in: devicesId },
                categoryId: category._id,
              },
              {
                $set: { status: 'OFF' },
              },
            );

            const pins = updatedDevices.map(device => device.pinNumber);

            const payload = JSON.stringify({ status: 'OFF', pins });
            client.publish('device/led', payload);
          }
        }
      }
    }

    if (topic === 'sensor/temp') {
      const trigerData = JSON.parse(message.toString());
      const { pin, email, temp, hum } = trigerData;

      console.log('temp', trigerData);
      const user = await User.findOne({ email });

      if (user) {
        const sensor = await Sensor.findOneAndUpdate(
          { pinNumber: pin, userId: user._id },
          { $set: { value: temp } },
          { new: true },
        );

        if (sensor) {
          if (value > 35) {
            const room = await Room.findById(sensor.roomId);

            if (room) {
              const category = await DeviceCategory.findOne({ enName: 'AIR_CONDITIONER' });

              const device = await Device.findOneAndUpdate(
                { roomId: room._id, categoryId: category._id },
                { $set: { status: 'ON' } },
                { new: true },
              );
              if (device.status === 'OFF') {
                const payload = JSON.stringify({ status: 'ON', pin: device.pinNumber, tempValue: 25 });
                client.publish('device/airConditioner', payload);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error storing data:', error);
  }
});

module.exports = { client };
