const jwt = require('jsonwebtoken');


const JWT_SECRET = "yhxqejiytxmderhv";

// دالة لتوليد التوكن
module.exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' } // مدة صلاحية التوكن
  );
};