const express = require("express");
const { createAccount, verifyEmail, login, resendVerficationCode, requestPasswordReset, verifyResetCode, resetPassword } = require("../controller/authController.js");


const Router = express.Router();

Router.post('/auth/register', createAccount)

Router.post('/auth/login', login)

Router.post('/auth/verify', verifyEmail);
Router.post('/auth/verification/resend/:userId', resendVerficationCode);


Router.post('/auth/password/forget', requestPasswordReset)
Router.post('/auth/password/forget/verify', verifyResetCode)


Router.patch('/auth/password/reset', resetPassword)

Router.post('/auth/facebook/login', (req, res) => {
    res.json({ statusCode: 201, message: "Facebook Login Successfully" });
})

Router.post('/auth/google/login', (req, res) => {
    res.json({ statusCode: 201, message: "Google Login Successfully" });
})

module.exports = Router;
