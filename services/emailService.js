require('dotenv').config();
const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = (process.env.SMTP_SECURE === 'true') || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const baseTemplate = (title, body) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:24px 28px;">
      <h1 style="margin:0;font-size:22px;">HostelHub</h1>
      <p style="margin:6px 0 0;opacity:.9;">${title}</p>
    </div>
    <div style="padding:28px;color:#1f2937;line-height:1.6;">${body}</div>
    <div style="background:#f9fafb;padding:16px 28px;text-align:center;color:#6b7280;font-size:12px;">
      © ${new Date().getFullYear()} HostelHub. All rights reserved.
    </div>
  </div>
</body></html>`;

const sendEmail = async ({ to, subject, html, attachments }) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured, skipping email to', to);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HostelHub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to, subject, html, attachments
  });
};

// Email templates
const templates = {
  welcome: (name) => baseTemplate('Welcome to HostelHub!',
    `<h2>Hi ${name} 👋</h2>
     <p>Thanks for joining HostelHub. Your account is ready and you can start exploring hostels right away.</p>
     <p><a href="${process.env.CLIENT_URL}/rooms" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Browse rooms</a></p>`),

  bookingConfirmed: (name, booking) => baseTemplate('Booking Confirmed',
    `<h2>Hi ${name},</h2>
     <p>Your booking <b>#${booking.bookingId}</b> has been confirmed.</p>
     <p><b>Check-in:</b> ${new Date(booking.checkIn).toDateString()}<br>
        <b>Check-out:</b> ${new Date(booking.checkOut).toDateString()}<br>
        <b>Total:</b> ₹${booking.pricing.totalAmount}</p>
     <p><a href="${process.env.CLIENT_URL}/bookings/${booking._id}" style="display:inline-block;padding:12px 20px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;">View booking</a></p>`),

  paymentSuccess: (name, booking, txnId) => baseTemplate('Payment Successful',
    `<h2>Thanks, ${name}!</h2>
     <p>We've received your payment for booking <b>#${booking.bookingId}</b>.</p>
     <p><b>Transaction ID:</b> ${txnId}<br>
        <b>Amount:</b> ₹${booking.pricing.totalAmount}</p>
     <p>Your receipt is attached.</p>`),

  resetPassword: (name, url) => baseTemplate('Reset your password',
    `<h2>Hi ${name},</h2>
     <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
     <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
     <p>If you didn't request this, ignore this email.</p>`),

  verifyEmail: (name, url) => baseTemplate('Verify your email',
    `<h2>Welcome ${name},</h2>
     <p>Please verify your email by clicking below.</p>
     <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Verify email</a></p>`),

  adminBookingAlert: (booking) => baseTemplate('New booking received',
    `<p>A new booking <b>#${booking.bookingId}</b> was placed.</p>
     <p><b>Amount:</b> ₹${booking.pricing.totalAmount}<br>
        <b>Check-in:</b> ${new Date(booking.checkIn).toDateString()}</p>`)
};

module.exports = { sendEmail, templates };
