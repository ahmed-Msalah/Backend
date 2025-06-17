const User = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const { sendVerificationEmail, resendVerificationEmail, sendResetCodeEmail } = require('../service/email.service.js');
const { generateToken } = require('../service/generateToken.service.js');
const PowerSavingMode = require('../models/power.saving.mode.model.js');

const createAccount = async (req, res) => {
  try {
    const { first_name, last_name, username, email, password, role } = req.body;

    if (!first_name || !last_name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    const newUser = new User({
      first_name,
      last_name,
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      role,
    });

    const createdUser = await newUser.save();

    await PowerSavingMode.insertMany([
      { userId: createdUser._id, usage: 100, mode: 'POWERSAVING' },
      { userId: createdUser._id, usage: 150, mode: 'ULTRAPOWERSAVING' },
      { userId: createdUser._id, usage: 200, mode: 'EMERGENCY' },
    ]);

    try {
      await sendVerificationEmail(email, username, verificationCode);
    } catch (emailError) {
      return res.status(201).json({
        message: 'Account created, but failed to send verification email. Please try resending the code.',
        data: { id: createdUser.id },
      });
    }

    const token = generateToken(createdUser);

    res.status(201).json({
      message: 'Account created successfully',
      data: { id: createdUser.id, token },
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const { id, code } = req.body;

    if (!id || !code) {
      return res.status(400).json({ message: 'User ID and verification code are required.' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'Account is already verified.' });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({
        message: 'Verification code has expired. Please request a new verification code.',
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Account has been successfully verified!' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'An error occurred while verifying the account.' });
  }
};

const resendVerficationCode = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('params', req.params);

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User Not Found' });

    if (user.verified) return res.status(400).json({ message: 'Account is already verified.' });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;

    await user.save();

    resendVerificationEmail(user.email, user.username, verificationCode);

    res.status(201).json({ message: 'Check Your Email To Use The Verification Code' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful!',
      token,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login.' });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate a 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // Code expires in 10 minutes

    // Store in user document
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = resetCodeExpires;
    await user.save({ validateBeforeSave: false });

    // Send the code via email
    await sendResetCodeEmail(user.email, user.username, resetCode);

    return res.status(200).json({ message: 'Password reset code sent to your email', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyResetCode = async (req, res) => {
  try {
    const { id, code } = req.body;

    if (!id || !code) {
      return res.status(400).json({ message: 'User ID and verification code are required.' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        message: 'Verification code has expired. Please request a new verification code.',
      });
    }

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordVerified = true;
    await user.save();

    res.status(200).json({ message: 'Account has been successfully verified!' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while verifying the account.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id, new_password } = req.body;

    if (!id || !new_password) {
      return res.status(400).json({ message: 'User ID and New Password  are required.' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.resetPasswordVerified) {
      return res.status(400).json({ message: 'You Must Verified Your Email for reset Password' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    user.password = hashedPassword;
    user.resetPasswordVerified = undefined;
    await user.save();

    res.status(200).json({ message: 'Password Change Sucessfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while verifying the account.' });
  }
};

module.exports = {
  createAccount,
  verifyEmail,
  login,
  resendVerficationCode,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
};
