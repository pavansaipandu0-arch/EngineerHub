import nodemailer from 'nodemailer';

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    const error = new Error(
      'Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.',
    );
    error.status = 503;
    throw error;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function getAppUrl(path) {
  const baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) throw new Error('FRONTEND_URL is required to send account emails.');
  return new URL(path, `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    const error = new Error('Email delivery is not configured. Set EMAIL_FROM.');
    error.status = 503;
    throw error;
  }
  await getTransport().sendMail({ from, to, subject, text, html });
}

export async function sendVerificationEmail(user, token) {
  const verificationUrl = getAppUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  await sendEmail({
    to: user.email,
    subject: 'Verify your EngineerHub email',
    text: `Hello ${user.name},\n\nVerify your email address to activate your EngineerHub account:\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(user.name)},</p><p>Verify your email address to activate your EngineerHub account.</p><p><a href="${verificationUrl}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = getAppUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await sendEmail({
    to: user.email,
    subject: 'Reset your EngineerHub password',
    text: `Hello ${user.name},\n\nUse this link to reset your EngineerHub password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a reset, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(user.name)},</p><p>Use this link to reset your EngineerHub password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>`,
  });
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}
