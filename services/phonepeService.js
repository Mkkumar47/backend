/**
 * PhonePe PG (Standard Checkout) integration.
 * Docs: https://developer.phonepe.com/v1/reference/pay-api
 *
 * For sandbox set:
 *   PHONEPE_BASE=https://api-preprod.phonepe.com/apis/pg-sandbox
 *   PHONEPE_MERCHANT_ID=PGTESTPAYUAT
 *   PHONEPE_SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
 *   PHONEPE_SALT_INDEX=1
 *
 * For production use the credentials issued by PhonePe.
 */
const crypto = require('crypto');

const BASE_URL = process.env.PHONEPE_BASE || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Build the X-VERIFY header for a given endpoint + body
const buildChecksum = (payloadBase64, endpoint) => {
  const str = payloadBase64 + endpoint + SALT_KEY;
  return `${sha256(str)}###${SALT_INDEX}`;
};

const initiatePayment = async ({ merchantTransactionId, amount, userId, redirectUrl, callbackUrl, mobile }) => {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: `MUID_${userId}`,
    amount: Math.round(amount * 100), // paise
    redirectUrl,
    redirectMode: 'POST',
    callbackUrl,
    mobileNumber: mobile,
    paymentInstrument: { type: 'PAY_PAGE' }
  };
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const xVerify = buildChecksum(base64, '/pg/v1/pay');

  const res = await fetch(`${BASE_URL}/pg/v1/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify, accept: 'application/json' },
    body: JSON.stringify({ request: base64 })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'PhonePe init failed');
  return data;
};

const verifyPayment = async (merchantTransactionId) => {
  const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const xVerify = `${sha256(endpoint + SALT_KEY)}###${SALT_INDEX}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify, 'X-MERCHANT-ID': MERCHANT_ID, accept: 'application/json' }
  });
  return res.json();
};

// Verify callback signature from PhonePe
const verifyCallbackSignature = (xVerifyHeader, base64Response) => {
  if (!xVerifyHeader) return false;
  const expected = `${sha256(base64Response + SALT_KEY)}###${SALT_INDEX}`;
  return xVerifyHeader === expected;
};

module.exports = { initiatePayment, verifyPayment, verifyCallbackSignature };
