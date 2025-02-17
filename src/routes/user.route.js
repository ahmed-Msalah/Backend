const express = require('express');
const Router = express.Router();
const {
  getUserById,
  updateUserById,
  getAllUsers,
  deleteUserById,
  changePassword,
} = require(`../controller/userController.js`);
Router.route('/').get(getAllUsers);
Router.route('/:id').get(getUserById);
Router.route('/:id').put(updateUserById);
Router.route('/:id/changePassword').put(changePassword);
Router.route('/:id').delete(deleteUserById);

module.exports = Router;
