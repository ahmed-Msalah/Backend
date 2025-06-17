const Automation = require('../models/automation.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const sendNotification = require('../service/send.notification');

const TrigerType = {
  SENSOR: 'SENSOR',
  SCHEDULE: 'SCHEDULE',
};

const ConditionType = {
  DEVICE: 'DEVICE',
  SENSOR: 'SENSOR',
};

const ActionType = {
  NOTIFICATION: 'NOTIFICATION',
  SENSOR: 'DEVICE',
};

const addAutomation = async (req, res) => {
  try {
    const { triggers, conditions, actions, name } = req.body;
    const userId = req.user.id;

    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('Name is required and must be a string.');
    }

    errors.push(...(await validateTriggers(triggers)));
    errors.push(...(await validateActions(actions)));
    errors.push(...(await validateConditions(conditions)));

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const newAutomation = new Automation({
      userId,
      triggers,
      actions,
      conditions,
      name,
    });

    console.log('newAutomation', newAutomation);

    const saved = await newAutomation.save();
    res.status(201).json({ message: 'Automation created successfully', automation: saved });
  } catch (error) {
    res.status(500).json({ message: 'Error creating automation', error: error.message });
  }
};

const getUserAutomations = async (req, res) => {
  try {
    const userId = req.user.id;

    const automations = await Automation.find({ userId })
      .populate({
        path: 'triggers.sensorId',
        select: 'type sensorId value',
      })
      .populate({
        path: 'actions.data.deviceId',
        select: 'type data',
      })
      .populate({
        path: 'conditions.deviceId',
        select: 'type sensorId state',
      })
      .exec();

    if (!automations || automations.length === 0) {
      return res.status(404).json({
        message: 'No automations found for this user',
      });
    }

    res.status(200).json({
      automations,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user automations',
      error: error.message,
    });
  }
};

const deleteAutomation = async (req, res) => {
  try {
    const { automationId } = req.params;
    const userId = req.user.id;

    const automation = await Automation.findOne({ _id: automationId, userId: userId });

    if (!automation) {
      return res.status(404).json({
        message: 'Automation not found or you do not have permission to delete it',
      });
    }

    await automation.deleteOne();

    res.status(200).json({
      message: 'Automation deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error deleting automation',
      error: error.message,
    });
  }
};

const updateAutomation = async (req, res) => {
  try {
    const { automationId } = req.params;

    const userId = req.user.id;

    const automation = await Automation.findOne({ _id: automationId, userId: userId });

    if (!automation) {
      return res.status(404).json({
        message: 'Automation not found or you do not have permission to update it',
      });
    }

    const updatedData = req.body;

    Object.assign(automation, updatedData);

    const updatedAutomation = await automation.save();

    res.status(200).json({
      message: 'Automation updated successfully',
      automation: updatedAutomation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error updating automation',
      error: error.message,
    });
  }
};

const applyAutomation = async (req, res) => {
  try {
    const { automationId } = req.params;
    const userId = req.user.id;

    const automation = await fetchAutomation(automationId, userId);

    await checkConditions(automation.conditions);

    await executeActions(automation.actions, userId);

    return res.status(200).json({ message: 'Automation applied successfully' });
  } catch (error) {
    console.error(error);

    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Automation not found or unauthorized' });
    }

    if (error.message === 'CONDITION_NOT_MET') {
      return res.status(400).json({ message: 'Conditions were not met' });
    }

    if (error.message === 'INVALID_NOTIFICATION_DATA') {
      return res.status(400).json({ message: 'Notification data is missing' });
    }

    if (error.message === 'DEVICE_NOT_FOUND') {
      return res.status(404).json({ message: 'Device in action not found' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const fetchAutomation = async (automationId, userId) => {
  const automation = await Automation.findOne({ _id: automationId, userId });
  if (!automation) throw new Error('NOT_FOUND');
  return automation;
};

const checkConditions = async (conditions = []) => {
  for (const condition of conditions) {
    if (condition.type === 'DEVICE') {
      const device = await Device.findById(condition.deviceId);
      if (!device || device.state !== condition.state) {
        throw new Error('CONDITION_NOT_MET');
      }
    } else if (condition.type === 'SENSOR') {
      const sensor = await Sensor.findById(condition.deviceId);
      if (!sensor || sensor.value !== condition.state) {
        throw new Error('CONDITION_NOT_MET');
      }
    }
  }
};

const executeActions = async (actions, userId) => {
  for (const action of actions) {
    if (action.type === 'NOTIFICATION') {
      const { title, message } = action.data;
      if (!title || !message) throw new Error('INVALID_NOTIFICATION_DATA');

      const user = await User.findById(userId);

      if (!user || !user.deviceToken) {
        console.error('User not found or device token missing');
        return;
      }

      await sendNotification({
        deviceToken: user.deviceToken,
        title,
        message,
      });
    } else if (action.type === 'DEVICE') {
      const { deviceId, state } = action.data;
      const device = await Device.findById(deviceId);
      if (!device) throw new Error('DEVICE_NOT_FOUND');

      device.state = state;
      await device.save();
    }
  }
};

const validateTriggers = async triggers => {
  const errors = [];
  if (!Array.isArray(triggers)) return errors;

  triggers.forEach((trigger, index) => {
    if (!trigger.type || !['SENSOR', 'SCHEDULE'].includes(trigger.type)) {
      errors.push(`Trigger[${index}].type is invalid or missing.`);
    }
    if (trigger.type === 'SENSOR') {
      if (!mongoose.Types.ObjectId.isValid(trigger.sensorId)) {
        errors.push(`Trigger[${index}].sensorId is invalid.`);
      }
      if (typeof trigger.value !== 'number') {
        errors.push(`Trigger[${index}].value must be a number.`);
      }
    }
    if (trigger.type === 'SCHEDULE') {
      if (typeof trigger.value !== 'number') {
        errors.push(`Trigger[${index}].value must be a number for schedule.`);
      }
    }
  });

  return errors;
};
const validateActions = async actions => {
  const errors = [];
  if (!Array.isArray(actions)) return errors;

  actions.forEach((action, index) => {
    if (!action.type || !['NOTIFICATION', 'DEVICE'].includes(action.type)) {
      errors.push(`Action[${index}].type is invalid or missing.`);
    }

    const data = action.data || {};

    if (action.type === 'NOTIFICATION') {
      if (!data.title) errors.push(`Action[${index}].data.title is required.`);
      if (!data.message) errors.push(`Action[${index}].data.message is required.`);
    }

    if (action.type === 'DEVICE') {
      if (!mongoose.Types.ObjectId.isValid(data.deviceId)) {
        errors.push(`Action[${index}].data.deviceId is invalid.`);
      }
      if (!['ON', 'OFF'].includes(data.state)) {
        errors.push(`Action[${index}].data.state must be 'ON' or 'OFF'.`);
      }
    }
  });

  return errors;
};
const validateConditions = async conditions => {
  const errors = [];
  if (!Array.isArray(conditions)) return errors;

  conditions.forEach((condition, index) => {
    if (!condition.type || !['DEVICE', 'SENSOR'].includes(condition.type)) {
      errors.push(`Condition[${index}].type is invalid or missing.`);
    }

    if (condition.type === 'DEVICE') {
      if (!mongoose.Types.ObjectId.isValid(condition.deviceId)) {
        errors.push(`Condition[${index}].deviceId is invalid.`);
      }
      if (!['ON', 'OFF'].includes(condition.deviceState)) {
        errors.push(`Condition[${index}].deviceState must be 'ON' or 'OFF'.`);
      }
    }

    if (condition.type === 'SENSOR') {
      if (!mongoose.Types.ObjectId.isValid(condition.sensorId)) {
        errors.push(`Condition[${index}].sensorId is invalid.`);
      }
      if (typeof condition.sensorValue !== 'number') {
        errors.push(`Condition[${index}].sensorValue must be a number.`);
      }
    }
  });

  return errors;
};

module.exports = { addAutomation, getUserAutomations, deleteAutomation, updateAutomation, applyAutomation };
