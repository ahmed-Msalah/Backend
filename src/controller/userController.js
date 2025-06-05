const moment = require('moment');
const PowerUsage = require('../models/power.usage.model.js');
const User = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const { getUserRecomndations } = require('../service/GeminiApiService.js');
const Room = require('../models/room.model.js');
const Device = require('../models/device.model.js');
const Automation = require('../models/automation.model.js');

const getAllUsers = async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== 'admin') res.status(401).json({ message: 'Forbeddin' });

    const users = await User.find().select('email username first_name last_name _id');

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({ all: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { user } = req;

    if (user.id === req.params.id || user.role === 'admin') {
      const userData = await User.findById(req.params.id).select('email username first_name last_name _id');
      if (!userData) return res.status(404).json({ message: 'User not found' });
      res.status(200).json({ userData });
    } else res.status(401).json({ message: 'Forbeddin' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const { user } = req;

    if (user.id !== id) res.status(401).json({ message: 'Forbeddin' });

    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { user } = req;

    if (user.id !== id && user.role !== 'admin') {
      return res.status(401).json({ message: 'Forbidden' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rooms = await Room.find({ userId: id });
    const roomIds = rooms.map(room => room._id);

    await Sensor.deleteMany({ userId: id });

    const devices = await Device.find({ roomId: { $in: roomIds } });
    const deviceIds = devices.map(device => device._id);

    await Device.deleteMany({ roomId: { $in: roomIds } });

    await PowerUsage.deleteMany({ deviceId: { $in: deviceIds } });

    await Room.deleteMany({ userId: id });

    await Automation.deleteMany({ userId: id });

    return res.status(200).json({ message: 'User and related data deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.params.id.trim();
    const { user } = req;
    console.log('user from change password endpoint', user);

    if (user.id !== userId) res.status(401).json({ message: 'Forbeddin' });

    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(old_password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    userData.password = hashedPassword;
    await userData.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOORr: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    // جلب الغرف الخاصة بالمستخدم
    const rooms = await Room.find({ userId }).select('_id');
    const roomIds = rooms.map(room => room._id);

    // جلب الأجهزة داخل هذه الغرف
    const devices = await Device.find({ roomId: { $in: roomIds } });
    const deviceIds = devices.map(device => device._id);

    // تحديد بداية الشهر الحالي باستخدام moment
    const startOfMonth = moment().startOf('month').toDate();

    // جلب بيانات الاستهلاك من بداية الشهر الحالي فقط
    const usageData = await PowerUsage.find({
      deviceId: { $in: deviceIds },
      createdAt: { $gte: startOfMonth },
    });

    if (!usageData.length) {
      return res.status(404).json({ message: 'No usage data available for current month.' });
    }

    // تصفية البيانات المرسلة للنموذج (لو مطلوب)
    const filteredUsageData = usageData.map(u => ({
      time: u.createdAt,
      deviceId: u.deviceId.toString(),
      usage: u.usage,
    }));

    // استدعاء دالة التوصيات وتمرير البيانات المصفاة
    const recommendations = await getUserRecomndations(filteredUsageData);

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateAverageCost = async (req, res) => {
  try {
    const ELECTRICITY_TARIFF = 0.75;
    const userId = req.user.id;

    // Get all rooms for the user
    const rooms = await Room.find({ userId }).select('_id');
    const roomIds = rooms.map(room => room._id);

    // Get all running devices
    const devices = await Device.find({
      roomId: { $in: roomIds },
    }).select('_id name');

    if (devices.length === 0) {
      return res.status(200).json({ averageCost: 0, message: 'No running devices' });
    }

    const deviceIds = devices.map(device => device._id);
    const usages = await PowerUsage.find({ deviceId: { $in: deviceIds } });

    let totalCost = 0;
    let totalDevices = devices.length;

    usages.forEach(record => {
      totalCost += record.usage * ELECTRICITY_TARIFF;
    });

    let averageCost = totalCost / totalDevices;

    res.status(200).json({ averageCost });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  deleteUserById,
  getUserById,
  updateUserById,
  getAllUsers,
  changePassword,
  getRecommendations,
  calculateAverageCost,
};
