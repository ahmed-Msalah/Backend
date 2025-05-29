const Automation = require('../models/automation.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');

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
    const { triggers, conditions, actions } = req.body;
    const userId = req.user.id;

    const newAutomation = new Automation({
      userId,
      triggers,
      actions,
      conditions,
    });

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

    await automation.remove();

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

module.exports = { addAutomation, getUserAutomations, deleteAutomation, updateAutomation };
