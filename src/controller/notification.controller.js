const Notification = require('../models/notification.model');

const saveNotificationInDatabase = async (userId, title, message) => {
  try {
    await Notification.create({
      userId,
      title,
      message,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notification = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const markedAsRead = await Notification.findByIdAndUpdate(id, { isRead: true });

    if (markedAsRead) return res.status(200).json({ message: 'Marked Sucessfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });

    if (result)
      return res.status(200).json({
        message: 'Marked all as read successfully',
      });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, saveNotificationInDatabase };
