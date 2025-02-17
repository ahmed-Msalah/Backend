const User = require('../models/user.model.js');
const bcrypt = require('bcrypt');


const getAllUsers = async (req, res) => {
  try {

    const { user } = req;

    if (user.role !== 'admin')
      res.status(401).json({ message: "Forbeddin" });

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
    }
    else res.status(401).json({ message: "Forbeddin" });


  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const { user } = req;

    if (user.id !== id)
      res.status(401).json({ message: "Forbeddin" });

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

    if (user.id === id || user.role === 'admin') {
      const deletedUser = await User.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
    }

    else res.status(401).json({ message: "Forbeddin" });



  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOORr: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.params.id.trim();
    const { user } = req;
    console.log("user from change password endpoint", user);

    if (user.id !== userId)
      res.status(401).json({ message: "Forbeddin" });


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

module.exports = { deleteUserById, getUserById, updateUserById, getAllUsers, changePassword };
