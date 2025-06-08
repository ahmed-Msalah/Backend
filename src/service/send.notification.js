const admin = require("../firebase/firebase");


const sendNotification = async (deviceToken, title, body) => {
    const payload = {
        token: deviceToken,
        notification: { title, body },
    }
    try {
        const response = await admin.messaging().send(payload);
        console.log("notification tresposne", response);
    } catch (error) { 
          return res.status(500).json({message: error.message})
    }
}

module.exports = sendNotification;