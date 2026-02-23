const axios = require('axios');
const EmailLog = require('../models/EmailLog');

/**
 * Send a transactional email via the Brevo (Sendinblue) REST API.
 * Env vars required:
 *   BREVO_API_KEY  – your Brevo API key
 *   EMAIL_FROM     – verified sender address  e.g. noreply@felicity.fest
 *   EMAIL_PROVIDER – optional label stored in logs (defaults to 'brevo')
 */
const sendEmail = async ({ to, subject, html, type, metadata = {} }) => {
  const provider = process.env.EMAIL_PROVIDER || 'brevo';
  let status = 'sent';

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.FROM_NAME || 'Felicity Fest',
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      }
    );
  } catch (err) {
    const errDetail = err.response?.data || err.message;
    console.error('Email send error:', JSON.stringify(errDetail, null, 2));
    status = 'failed';
    // Re-throw so callers (e.g. /register) can roll back DB writes
    throw new Error(`Email failed: ${JSON.stringify(errDetail)}`);
  }

  await EmailLog.create({
    to,
    subject,
    type,
    status,
    provider,
    metadata,
    sentAt: new Date(),
  });
};

module.exports = sendEmail;

