const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "aliismailh08@gmail.com",
    pass: "yhxq ejiy txmd erhv",
  },
});

const sendVerificationEmail = async (to, username, code) => {

  const htmlContent = `
    <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
          margin: 0;
        }
        .container {
          max-width: 600px;
          margin: auto;
          background: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          font-size: 16px;
        }
        .header {
          text-align: center;
          font-size: 28px;
          color: #333;
          margin-bottom: 30px;
          font-weight: bold;
          color: #007bff;
        }
        .content {
          font-size: 16px;
          color: #666;
          line-height: 1.6;
        }
        .content p {
          margin-bottom: 10px;
        }
        .button {
          display: inline-block;
          padding: 15px 25px;
          margin-top: 20px;
          background-color: #007bff;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
          font-size: 16px;
          text-align: center;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .activation-code {
          font-size: 24px;
          font-weight: bold;
          background-color: #f0f8ff;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 10px 0;
        }
        .expiration-note {
          color: #d9534f;
          font-weight: bold;
          margin-top: 15px;
        }
        .footer {
          font-size: 12px;
          color: #999;
          text-align: center;
          margin-top: 30px;
          border-top: 1px solid #e0e0e0;
          padding-top: 15px;
        }
        .footer a {
          color: #007bff;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .emoji {
          font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          📨 Account Activation
        </div>
        <div class="content">
          <p>Hi <strong>${username}</strong> 👋,</p>
          <p>Thank you for registering with us! 🎉 To complete your account setup, please use the following activation code:</p>
          <div class="activation-code">${code}</div>
          <p class="expiration-note">⚠️ This activation code will expire in 1 hour from now.</p>
          <p>Simply enter this code in the app to activate your account. If you didn't request this, please ignore this email, and your account will not be activated. 🔒</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Your Company. All rights reserved. <br>
        </div>
      </div>
    </body>
    </html>
`;
  const mailOptions = {
    from: '"Tarsheed" <aliismailh08@gmail.com>',
    to,
    subject: "Email Verification Code",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

const resendVerificationEmail = async (to, username, code) => {
  const htmlContent = `
  <html>
  <head>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
        margin: 0;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        font-size: 16px;
      }
      .header {
        text-align: center;
        font-size: 28px;
        color: #333;
        margin-bottom: 30px;
        font-weight: bold;
        color: #007bff;
      }
      .content {
        font-size: 16px;
        color: #666;
        line-height: 1.6;
      }
      .content p {
        margin-bottom: 10px;
      }
      .button {
        display: inline-block;
        padding: 15px 25px;
        margin-top: 20px;
        background-color: #007bff;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
        text-align: center;
      }
      .button:hover {
        background-color: #0056b3;
      }
      .activation-code {
        font-size: 24px;
        font-weight: bold;
        background-color: #f0f8ff;
        padding: 10px 20px;
        border-radius: 5px;
        margin: 10px 0;
      }
      .expiration-note {
        color: #d9534f;
        font-weight: bold;
        margin-top: 15px;
      }
      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 30px;
        border-top: 1px solid #e0e0e0;
        padding-top: 15px;
      }
      .footer a {
        color: #007bff;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
      .emoji {
        font-size: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        🔄 Resent Verification Code
      </div>
      <div class="content">
        <p>Hi <strong>${username}</strong> 👋,</p>
        <p>We noticed you requested a new verification code. Here is your updated code:</p>
        <div class="activation-code">${code}</div>
        <p class="expiration-note">⚠️ This activation code will expire in 1 hour.</p>
        <p>For security reasons, any previous codes are no longer valid. Please use this new code to verify your account. ✅</p>
        <p>If you didn't request this, simply ignore this email</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Your Company. All rights reserved. <br>
      </div>
    </div>
  </body>
  </html>
`;

  const mailOptions = {
    from: '"Tarsheed" <aliismailh08@gmail.com>',
    to,
    subject: "Resent Verification Code",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

const sendResetCodeEmail = async (to, username, code) => {
  const htmlContent = `
  <html>
  <head>
    <style>
      body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; padding: 20px; }
      .container { max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.1); font-size: 16px; }
      .header { text-align: center; font-size: 28px; color: #d9534f; margin-bottom: 30px; font-weight: bold; }
      .content { font-size: 16px; color: #666; line-height: 1.6; }
      .activation-code { font-size: 24px; font-weight: bold; background-color: #f0f8ff; padding: 10px 20px; border-radius: 5px; margin: 10px 0; text-align: center; }
      .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">🔒 Password Reset Request</div>
      <div class="content">
        <p>Hi <strong>${username}</strong>,</p>
        <p>You requested to reset your password. Use the verification code below to proceed:</p>
        <div class="activation-code">${code}</div>
        <p>⚠️ This code will expire in 10 minutes.</p>
        <p>If you didn't request this, ignore this email. Your account is safe.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;


  const mailOptions = {
    from: '"Tarsheed" <aliismailh08@gmail.com>',
    to,
    subject: "Resent Verification Code",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};



module.exports = { sendVerificationEmail, resendVerificationEmail, sendResetCodeEmail };
