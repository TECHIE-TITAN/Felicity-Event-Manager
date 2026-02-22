const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
};

module.exports = generateQRCode;
