const { handleFacebookLogin, handleGoogleLogin } = require("../service/socialMedia.service");

exports.facebookLogin = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ message: 'Access Token Missing' });
  }

  try {
    const { token, user } = await handleFacebookLogin(accessToken);
    res.status(200).json({
        message: 'Login successful!',
        token,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
      });  } catch (error) {
    res.status(400).json({ message: 'Facebook Login Failed', error: error.message });
  }
};


exports.googleLogin = async (req, res) => {
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json({ message: "Access Token Missing" });
  }

  try {
    const { token, user } = await handleGoogleLogin(accessToken);
    res.status(200).json({
      message: "Login successful!",
      token,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ message: "Google Login Failed", error: error.message });
  }
};

