const express = require('express');
const router = express.Router();
const { getNotifications, markAllAsRead, markAsRead } = require('../controller/notification.controller');
const { authenticateToken } = require('../middleware/authorized.middleware');

router.get('/', authenticateToken, getNotifications);
router.patch('/read/:id', authenticateToken, markAsRead);
router.patch('/all/read', authenticateToken, markAllAsRead);

module.exports = router;
