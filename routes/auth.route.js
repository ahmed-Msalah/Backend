import express from "express";


const Router = express.Router();

Router.post('/auth/create', (req, res) => {
    res.json({ statusCode: 201, message: "Account Created Sucessfully" })
})

Router.post('/auth/login', (req, res) => {
    res.json({ statusCode: 201, message: "Login Successfully" })
})

Router.post('/auth/verify', (req, res) => {
    res.json({ statusCode: 201, message: "Account Verified Successfully" });
});

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

export default Router;