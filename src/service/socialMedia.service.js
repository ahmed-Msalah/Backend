const axios = require('axios');
const User = require('../models/user.model');
const { generateToken } = require('./generateToken.service');

exports.handleFacebookLogin = async (accessToken) => {
    try {
        const fbResponse = await axios.get(`https://graph.facebook.com/me`, {
            params: {
                fields: 'id,name,email',
                access_token: accessToken,
            },
        });

        const { id, email, name } = fbResponse.data;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = await User.create({
                email,
                first_name: name,
                last_mame: name,
                username: name,
                facebookLogin: true,
            });
        } else {
            user.facebookLogin = true;
            await user.save();
        }

        // Generate JWT
        const token = generateToken(user);
        return { token, user };
    } catch (error) {
        throw new Error('Failed to authenticate with Facebook');
    }
};


exports.handleGoogleLogin = async (accessToken) => {
  try {
    // Get user info from Google API
    const googleResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { sub, email, name, picture } = googleResponse.data;

    // Check if user exists in DB
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        first_name: name.split(" ")[0],
        last_name: name.split(" ")[1] || "",
        username: name,
        googleLogin: true,
      });
    } else {
      user.googleLogin = true;
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user);
    return { token, user };
  } catch (error) {
    throw new Error("Failed to authenticate with Google");
  }
};
