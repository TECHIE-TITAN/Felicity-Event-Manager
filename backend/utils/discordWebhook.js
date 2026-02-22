const https = require('https');
const http = require('http');

/**
 * Send a message to the global Discord webhook defined in DISCORD_WEBHOOK_URL.
 * Silently ignores failures so it never breaks the main request.
 * @param {object} embed - Discord embed object
 */
const sendDiscordWebhook = async (embed) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK')) return;

  try {
    const payload = JSON.stringify({ embeds: [embed] });
    const parsedUrl = new URL(webhookUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    await new Promise((resolve) => {
      const req = lib.request(options, (res) => {
        res.resume(); // drain the response
        res.on('end', resolve);
      });
      req.on('error', (err) => {
        console.error('[Discord Webhook] Request error:', err.message);
        resolve();
      });
      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error('[Discord Webhook] Failed to send:', err.message);
    // silently ignore — Discord webhook failure must never break the API
  }
};

module.exports = sendDiscordWebhook;
