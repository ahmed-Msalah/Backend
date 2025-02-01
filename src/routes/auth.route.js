const express = require("express");
const { createAccount, verifyEmail, login } = require("../controller/user.controller.js");


const Router = express.Router();

Router.post('/auth/register', createAccount)

Router.post('/auth/login', login)

Router.post('/auth/verify', verifyEmail);

Router.post('/auth/password/forget', (req, res) => {
    res.json({ statusCode: 201, message: "Check Email For Rest Password Code" });
})

Router.post('/auth/password/reset', (req, res) => {
    res.json({ statusCode: 201, message: "Password Reset Sucessfully" });
})

Router.post('/auth/facebook/login', (req, res) => {
    res.json({ statusCode: 201, message: "Facebook Login Successfully" });
})

Router.post('/auth/google/login', (req, res) => {
    res.json({ statusCode: 201, message: "Google Login Successfully" });
})

module.exports = Router;