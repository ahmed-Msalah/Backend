const User = require('../models/user.model.js')
const bcrypt = require("bcrypt");
const { sendVerificationEmail } = require('../service/email.service.js');
const { generateToken } = require('../service/generateToken.service.js');

const createAccount = async (req, res) => {
    try {
        const { first_name, last_name, username, email, password } = req.body;

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
        });

        const createdUser = await newUser.save();

        await sendVerificationEmail(email, username, verificationCode);

        const token = generateToken(createdUser);

        res.status(201).json({ message: 'Account created successfully', data: { id: createdUser.id, token } });
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

        if (new Date() > user.verificationCodeExpiresAt) {
            return res.status(400).json({
                message: 'Verification code has expired. Please request a new verification code.',
            });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'Incorrect verification code.' });
        }

        // تحديث حالة التحقق
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

const login = async (req, res) => {
    try {
        console.log("body", req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!user.verified) {
            return res.status(401).json({ message: 'Please verify your email before logging in.' });
        }


        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        const token = generateToken(user);

        res.status(200).json({
            message: 'Login successful!',
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
};



module.exports = { createAccount, verifyEmail, login };
