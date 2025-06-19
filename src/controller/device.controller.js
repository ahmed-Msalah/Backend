const Device = require('../models/device.model');
const Room = require('../models/room.model');
const PowerUsage = require('../models/power.usage.model');
const moment = require('moment');
const createDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, pinNumber, roomId, categoryId, priority } = req.body;

    if (!name) res.status(500).json({ message: 'Must Provide Device Name' });
    if (!categoryId) res.status(500).json({ message: 'Must Provide Device Category' });
    if (!pinNumber) res.status(500).json({ message: 'Must Provide Pin Number' });
    if (!roomId) res.status(500).json({ message: 'Must Provide Room Id' });
    if (!priority) res.status(500).json({ message: 'Must Provide priority' });

    const room = await Room.findOne({ _id: roomId, userId });
    if (!room) res.status(400).json({ message: "You Can't Add This Device For This Room" });

    const pinNumberUsed = await Device.findOne({ roomId, pinNumber });
    if (pinNumberUsed) res.status(400).json({ message: 'Pin Number aleady used try to use another one' });
    const newDevice = new Device({
      name,
      categoryId,
      description,
      pinNumber,
      roomId,
      priority,
    });

    const deviceSaved = await newDevice.save();

    if (deviceSaved) res.status(201).json({ message: 'Device Created Successfully', deviceSaved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const updatedData = req.body;

    const device = await Device.findById(deviceId);
    if (!device) res.status(404).json({ message: 'Device Not Found' });

    const room = await Room.findById(device.roomId);
    if (!room) res.status(404).json({ messae: 'Room Not Found' });

    if (userId !== room.userId.toString())
      res.status(403).json({ message: 'Unauthorized: You are not the owner of this device' });

    const updatedDevice = await Device.findOneAndUpdate({ _id: deviceId }, updatedData, { new: true });

    if (updatedDevice) res.status(200).json({ message: 'Device updated Sucessfully', updatedDevice });
    else res.status(400).json({ message: 'Updated Failed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const device = await Device.findById(deviceId);
    if (!device) res.status(404).json({ message: 'Device Not Found' });

    const room = await Room.findById(device.roomId);
    if (!room) res.status(404).json({ messae: 'Room Not Found' });

    if (userId !== room.userId.toString())
      res.status(403).json({ message: 'Unauthorized: You are not the owner of this device' });

    const deletedDevice = await Device.findOneAndDelete({ _id: deviceId });

    if (deletedDevice) res.status(201).json({ message: 'Device Deleted Sucessfully' });
    else res.status(400).json({ message: 'Deleted Failed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllDevices = async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await Room.find({ userId }).select('_id').lean();
    const roomIds = rooms.map(room => room._id);

    if (roomIds.length === 0) {
      return res.status(200).json({ devices: [] });
    }

    const devices = await Device.find({ roomId: { $in: roomIds } })
      .select('_id pinNumber status priority name description roomId categoryId')
      .lean();

    const deviceIds = devices.map(device => device._id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageData = await PowerUsage.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          totalUsage: { $sum: '$usage' },
        },
      },
    ]);

    const usageMap = usageData.reduce((acc, usage) => {
      acc[usage._id.toString()] = usage.totalUsage;
      return acc;
    }, {});

    const devicesWithUsage = devices.map(device => ({
      ...device,
      totalUsage: usageMap[device._id.toString()] || 0,
    }));

    res.status(200).json({ devices: devicesWithUsage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getRunningDevices = async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await Room.find({ userId }).select('_id');
    const roomIds = rooms.map(room => room._id);

    const devices = await Device.find({ roomId: { $in: roomIds }, status: 'ON' });

    res.status(200).json({ devices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({ userId });
    if (!room) {
      return res.status(404).json({ message: 'Device NOt Found' });
    }
    const device = await Device.findOne({ _id: deviceId, roomId: room._id });

    if (!device) {
      return res.status(404).json({ message: 'Device NOt Found' });
    }
    if (device.status === 'ON') {
      device.status = 'OFF';
      const updatedDevice = await device.save();
      console.log('Saved device:', updatedDevice);
      return res.status(200).json({ message: 'Device Status Updated Sucessfully' });
    }
    if (device.status === 'OFF') {
      device.status = 'ON';
      const updatedDevice = await device.save();
      console.log('Saved device:', updatedDevice);
      return res.status(200).json({ message: 'Device Status Updated Sucessfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createDevice, updateDevice, deleteDevice, getAllDevices, getRunningDevices, toggleDevice };
