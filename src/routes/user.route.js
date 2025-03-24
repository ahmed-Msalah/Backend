const express = require('express');
const Router = express.Router();
const {
  getUserById,
  updateUserById,
  getAllUsers,
  deleteUserById,
  changePassword,
  getRecommendations,
  calculateAverageCost,
} = require(`../controller/userController.js`);
const { authenticateToken } = require('../middleware/authorized.middleware.js');



Router.route('/').get(authenticateToken, getAllUsers);
Router.route('/:id').get(authenticateToken, getUserById);
Router.route('/:id').put(authenticateToken, updateUserById);
Router.route('/:id/changePassword').put(authenticateToken, changePassword);
Router.route('/:id').delete(authenticateToken, deleteUserById);
Router.route('/get/recomendations').get(authenticateToken, getRecommendations);
Router.route('/get/cost/avarage').get(authenticateToken, calculateAverageCost);

module.exports = Router;
