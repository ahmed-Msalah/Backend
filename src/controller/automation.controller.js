const Automation = require('../models/automation.model');
const Device = require('../models/device.model');
const Room = require('../models/room.model');


const TrigerType = {
  SENSOR: "SENSOR",
  SCHEDULE: "SCHEDULE"
};

const ConditionType = {
  DEVICE: "DEVICE",
  SENSOR: "SENSOR"
};


const ActionType = {
  NOTIFICATION: "NOTIFICATION",
  SENSOR: "DEVICE"
}


const addAutomation = async (req, res) => {
  try {
    const { triggers, conditions, actions, name } = req.body;
    const userId = req.user.id;

    const newAutomation = new Automation({
      userId,
      triggers,
      actions,
      conditions,
      name
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
        path: 'trigger.sensorId',
        select: 'type sensorId value',
      })
      .populate({
        path: 'action.data.deviceId',
        select: 'type data',
      })
      .populate({
        path: 'condition.deviceId',
        select: 'type sensorId state',
      })
      .exec();

    if (!automations || automations.length === 0) {
      return res.status(404).json({
        message: 'No automations found for this user',
      });
    }

    res.status(200).json({
      automations
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

const applyAutomation = async (req, res) => {
  try {
    const { automationId } = req.params;
    const userId = req.user.id;

    const automation = await fetchAutomation(automationId, userId);

    await checkConditions(automation.conditions);

    await executeActions(automation.actions, userId);

    return res.status(200).json({ message: "Automation applied successfully" });

  } catch (error) {
    console.error(error);

    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Automation not found or unauthorized" });
    }

    if (error.message === "CONDITION_NOT_MET") {
      return res.status(400).json({ message: "Conditions were not met" });
    }

    if (error.message === "INVALID_NOTIFICATION_DATA") {
      return res.status(400).json({ message: "Notification data is missing" });
    }

    if (error.message === "DEVICE_NOT_FOUND") {
      return res.status(404).json({ message: "Device in action not found" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};


async function fetchAutomation(automationId, userId) {
  const automation = await Automation.findOne({ _id: automationId, userId });
  if (!automation) throw new Error("NOT_FOUND");
  return automation;
}

async function checkConditions(conditions = []) {
  for (const condition of conditions) {
    if (condition.type === "DEVICE") {
      const device = await Device.findById(condition.deviceId);
      if (!device || device.state !== condition.state) {
        throw new Error("CONDITION_NOT_MET");
      }
    } else if (condition.type === "SENSOR") {
      const sensor = await Sensor.findById(condition.deviceId);
      if (!sensor || sensor.value !== condition.state) {
        throw new Error("CONDITION_NOT_MET");
      }
    }
  }
}

async function executeActions(actions, userId) {
  for (const action of actions) {
    if (action.type === "NOTIFICATION") {
      const { title, message } = action.data;
      if (!title || !message) throw new Error("INVALID_NOTIFICATION_DATA");

      await NotificationService.send({ userId, title, message });
    }

    else if (action.type === "DEVICE") {
      const { deviceId, state } = action.data;
      const device = await Device.findById(deviceId);
      if (!device) throw new Error("DEVICE_NOT_FOUND");

      device.state = state;
      await device.save();
    }
  }
}


module.exports = { addAutomation, getUserAutomations, deleteAutomation, updateAutomation, applyAutomation };

