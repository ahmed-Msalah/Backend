const cron = require('node-cron');
const PowerSavingMode = require('../models/power.saving.mode.model');
const Room = require('../models/room.model');
const Device = require('../models/device.model');
const PowerUsage = require('../models/power.usage.model');
const sendNotification = require('../service/send.notification');
const Automation = require('../models/automation.model');
const Sensor = require('../models/sensor.model');
const User = require('../models/user.model');
const { client } = require('../mqtt/connection');
const notificationModel = require('../models/notification.model');

const evaluateConditions = async (conditions = []) => {
  for (const condition of conditions) {
    if (condition.type === 'DEVICE') {
      const device = await Device.findById(condition.deviceId);
      if (!device || device.status !== condition.deviceState) return false;
    } else if (condition.type === 'SENSOR') {
      const sensor = await Sensor.findById(condition.sensorId);
      if (!sensor || !applyOperator(sensor.value, condition.operator, condition.sensorValue)) return false;
    }
  }
  return true;
};

const applyOperator = (a, operator, b) => {
  switch (operator) {
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '===':
      return a === b;
    case '!==':
      return a !== b;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

cron.schedule('*/15 * * * *', async () => {
  try {
    console.log(' Running power saving cron job...');

    const activeModes = await PowerSavingMode.find({ status: 'ON' });

    for (const activeMode of activeModes) {
      const { userId, mode, usage } = activeMode;

      const rooms = await Room.find({ userId });
      const roomIds = rooms.map(room => room._id);

      const devices = await Device.find({ roomId: { $in: roomIds } });

      for (const device of devices) {
        const { _id: deviceId, priority, status: deviceStatus } = device;

        const latestUsage = await PowerUsage.findOne({ deviceId }).sort({ createdAt: -1 });
        const deviceUsage = latestUsage?.usage ?? 0;

        if (deviceUsage < usage) {
          continue;
        }

        let shouldTurnOff = false;

        if (mode === 'POWERSAVING') {
          if (priority === 1) shouldTurnOff = true;
        } else if (mode === 'ULTRAPOWERSAVING') {
          if ([1, 2].includes(priority)) shouldTurnOff = true;
        } else if (mode === 'EMERGENCY') {
          if ([1, 2, 3].includes(priority)) shouldTurnOff = true;
        }

        if (shouldTurnOff && deviceStatus === 'ON') {
          await Device.updateOne({ _id: deviceId }, { status: 'OFF' });
          console.log(` Device ${device.name} turned OFF (mode: ${modeType}, priority: ${priority})`);
        }
      }
    }

    console.log(' Power saving cron job completed.');
  } catch (error) {
    console.error('Cron job failed:', error.message);
  }
});

cron.schedule('* * * * *', async () => {
  try {
    console.log('Running automations every 30 minutes...');

    const automations = await Automation.find({}).lean();

    for (const automation of automations) {
      const { triggers, conditions, actions, userId } = automation;

      for (const trigger of triggers) {
        if (trigger.type === 'SCHEDULE') {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          const [hoursStr, minutesStr] = trigger.time.split(':');
          const triggerMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr);

          if (!applyOperator(currentMinutes, trigger.operator, triggerMinutes)) {
            continue;
          }
        }

        if (trigger.type === 'SENSOR') {
          const sensor = await Sensor.findById(trigger.sensorId);
          if (!sensor || !applyOperator(sensor.value, trigger.operator, trigger.value)) {
            continue;
          }
        }

        const conditionsValid = await evaluateConditions(conditions);
        if (!conditionsValid) continue;

        for (const action of actions) {
          if (action.type === 'DEVICE') {
            const device = await Device.findByIdAndUpdate(action.data.deviceId, {
              status: action.data.state,
            });

            const payload = JSON.stringify({ status: 'OFF', pins: [device.pinNumber] });
            client.publish('device/led', payload);

            await Automation.updateOne({ _id: automation._id }, { status: true });
          } else if (action.type === 'NOTIFICATION') {
            const user = await User.findById(userId);

            const notifSaved = await notificationModel.create({
              userId,
              title: action.data.title,
              message: action.data.message,
            });
            if (notifSaved) console.log('user from notify', notifSaved);

            if (user?.deviceToken) {
              await sendNotification({
                deviceToken: user.deviceToken,
                title: action.data.title,
                message: action.data.message,
              });

              await Automation.updateOne({ _id: automation._id }, { status: true });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Cron job failed:', error.message);
  }
});

module.exports = {};
