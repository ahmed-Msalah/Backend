const { createRoom, updateRoom, deleteRoom, getRoom, getAllRoom } = require('../controller/room.controller');
const { authenticateToken } =  require('../middleware/authorized.middleware');

const express = require('express');

const Route = express.Router();

Route.post('/create', authenticateToken, createRoom);
Route.patch('/update/:roomId', authenticateToken, updateRoom);
Route.delete('/delete/:roomId', authenticateToken, deleteRoom);
Route.get('/get/:roomId', authenticateToken, getRoom);
Route.get('/getAll', authenticateToken, getAllRoom);

module.exports = Route;
