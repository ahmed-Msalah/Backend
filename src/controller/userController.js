const User = require('../models/user.model.js');
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({ ALL_USERS: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ 
         id: user.id,
         first_name: user.first_namec,
         last_name: user.last_name,
         email: user.email,
         username: user.username
    } );
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    id = req.params.id;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User updated successfully', data: req.body});
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOOR: error.message });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const id = req.params.id.trim();

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOORr: error.message });
  }
};

const bcrypt = require('bcrypt');

const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.params.id.trim();

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', EROOOORr: error.message });
  }
};

module.exports = { deleteUserById, getUserById, updateUserById, getAllUsers, changePassword };
