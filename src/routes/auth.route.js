const express = require("express");
const { createAccount, verifyEmail, login, resendVerficationCode, requestPasswordReset, verifyResetCode, resetPassword } = require("../controller/authController.js");
const { facebookLogin, googleLogin } = require("../controller/socialMediaController.js");


const Router = express.Router();

Router.post('/auth/register', createAccount)

Router.post('/auth/login', login)

Router.post('/auth/verify', verifyEmail);
Router.post('/auth/verification/resend/:userId', resendVerficationCode);


Router.post('/auth/password/forget', requestPasswordReset)
Router.post('/auth/password/forget/verify', verifyResetCode)


Router.patch('/auth/password/reset', resetPassword)

Router.post('/auth/facebook/login', facebookLogin);

Router.post('/auth/google/login', googleLogin)

module.exports = Router;
