const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html, type, metadata = {} }) => {
  let status = 'sent';
  try {
    await transporter.sendMail({
      from: `"Felicity Fest" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('Email send error:', err.message);
    status = 'failed';
  }

  await EmailLog.create({
    to,
    subject,
    type,
    status,
    provider: 'gmail',
    metadata,
    sentAt: new Date()
  });
};

module.exports = sendEmail;
