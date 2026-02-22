const axios = require('axios');
const SecurityLog = require('../models/SecurityLog');

/**
 * verifyCaptcha — middleware
 * Verifies a Google reCAPTCHA v2 token sent in req.body.captchaToken.
 * Also checks whether the request IP is currently blocked (has a 'blocked' SecurityLog entry).
 * On failure: logs the event and returns 403.
 */
const verifyCaptcha = async (req, res, next) => {
  const ip = req.ip;

  // 1. IP block check
  const isBlocked = await SecurityLog.findOne({ ipAddress: ip, actionType: 'blocked' }).lean();
  if (isBlocked) {
    return res.status(403).json({ message: 'Your IP has been blocked. Contact support.' });
  }

  // 2. Skip CAPTCHA verification if secret key not configured (dev mode)
  if (!process.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY.startsWith('your_')) {
    return next();
  }

  const { captchaToken } = req.body;
  if (!captchaToken) {
    await SecurityLog.create({ ipAddress: ip, actionType: 'captcha_fail' });
    return res.status(400).json({ message: 'CAPTCHA verification required.' });
  }

  try {
    const verifyRes = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: captchaToken } }
    );

    if (!verifyRes.data.success) {
      await SecurityLog.create({ ipAddress: ip, actionType: 'captcha_fail' });
      return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
    }

    next();
  } catch (err) {
    // If Google is unreachable let the request through rather than block all users
    console.error('reCAPTCHA verify error:', err.message);
    next();
  }
};

module.exports = verifyCaptcha;
