import './env.js';
import nodemailer from 'nodemailer';

export function getMailConfig(env = process.env) {
  const user = env.GMAIL_USER?.trim();
  const pass = env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !/^[^\s@]+@gmail\.com$/i.test(user)) {
    const error = new Error('Set GMAIL_USER to your complete Gmail address in server/.env.');
    error.statusCode = 503;
    throw error;
  }
  if (!pass || pass.length !== 16) {
    const error = new Error('Set GMAIL_APP_PASSWORD in server/.env to the 16-character Google App Password, not your normal Gmail password.');
    error.statusCode = 503;
    throw error;
  }
  return { user, pass };
}

function safeMailError(error) {
  let message = 'Gmail could not accept the email. Check your sender account, recipient address and Google security alerts.';
  if (error.code === 'EAUTH') message = 'Gmail login failed. Check GMAIL_USER, enable 2-Step Verification and generate a valid Google App Password.';
  else if (['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'EDNS', 'ESOCKET'].includes(error.code)) {
    message = 'Cannot connect to Gmail. Check your internet connection and whether your network or hosting service allows SMTP port 465.';
  } else if (error.code === 'EENVELOPE') message = 'Gmail rejected the recipient. Check the email address and your Gmail sending limits.';
  const safe = new Error(message);
  safe.statusCode = 502;
  return safe;
}

let transport;
let signature;
function getTransport() {
  const auth = getMailConfig();
  const nextSignature = JSON.stringify(auth);
  if (!transport || signature !== nextSignature) {
    transport?.close?.();
    transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true, auth,
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
      logger: false, debug: false,
    });
    signature = nextSignature;
  }
  return transport;
}

// Send automatically through Gmail; never print message bodies or OTPs.
export default {
  async sendMail(message) {
    const { user } = getMailConfig();
    try {
      const result = await getTransport().sendMail({ ...message, from: user });
      if (!result.accepted?.length || result.rejected?.length) {
        throw Object.assign(new Error('Recipient rejected'), { code: 'EENVELOPE' });
      }
      return result;
    } catch (error) { throw safeMailError(error); }
  },
  async verify() {
    getMailConfig();
    try { return await getTransport().verify(); }
    catch (error) { throw safeMailError(error); }
  },
};
