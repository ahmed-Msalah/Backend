const jwt = require('jsonwebtoken');
const JWT_SECRET = "yhxqejiytxmderhv";

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("token", token)

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Token missing.' });
  }


  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("error", err)
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    req.user = user;
    next();
  });
};
