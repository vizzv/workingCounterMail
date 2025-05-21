const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { getCachedOrGenerateGif } = require('./gifMasnager');
const mailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;
dotenv.config();


const transporter = mailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});

const mailOptions = {
  from: "jazzadam71@gmail.com",
  to: "vishwa10032003@gmail.com",
  subject: "HTML Email with GIF 🎉",
  html: `
    <div style="font-family: Arial, sans-serif; text-align: center;">
      <h2>Hello from NodeMailer 👋</h2>
      <p>This email includes a cool animated GIF!</p>
      <img src="${process.env.RAILWAY_PUBLIC_DOMAIN}/countdown?t=${1747787366}" alt="Celebration GIF" style="width:100%; border-radius: 10px;"/>
      <p style="margin-top: 20px;">Enjoy! 🚀</p>
    </div>
  `
};
app.get('/', async (req, res) => {
  res.json({ "message": "Home" });
})

app.get('/mail', async (req, res) => {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log("Error:", error);
    }
    console.log("Email sent:", info.response);
    res.json({ message: "Email sent successfully!" });
  });
})

app.get('/countdown', async (req, res) => {
  const t = parseInt(req.query.t);

  if (!t || isNaN(t)) {
    return res.status(400).send('❌ Missing or invalid "t" query parameter (UNIX timestamp)');
  }

  try {
      const gifBuffer = await getCachedOrGenerateGif(t);

  res.setHeader('Content-Type', 'image/gif');
  

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0, max-age=0',
      'Content-Type': 'image/gif',
      'Pragma': 'no-cache',
      'Expires': '-1'
    });


    res.send(gifBuffer);
  } catch (err) {
    console.error('❌ Error generating or retrieving GIF:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}/countdown?t=UNIX_TIMESTAMP`);
});
