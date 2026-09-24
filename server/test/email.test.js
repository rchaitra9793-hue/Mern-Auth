import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import mailer, { getMailConfig } from '../config/mailer.js';
import userModel from '../models/userModel.js';
import { sendVerifyOtp, sendResetOtp, verifyEmail, resetPassword } from '../controllers/authcontroller.js';

const settings = { GMAIL_USER: 'sender@gmail.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' };
Object.assign(process.env, settings);
let mode = 'accepted';
let delivered;
mock.method(nodemailer, 'createTransport', options => {
  assert.equal(options.host, 'smtp.gmail.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.auth.pass, 'abcdefghijklmnop');
  return {
    async sendMail(message) {
      delivered = message;
      if (mode === 'auth') throw Object.assign(new Error('secret provider detail'), { code: 'EAUTH' });
      if (mode === 'network') throw Object.assign(new Error('secret provider detail'), { code: 'ETIMEDOUT' });
      return { messageId: 'test-message-reference', accepted: mode === 'accepted' ? [message.to] : [], rejected: mode === 'rejected' ? [message.to] : [] };
    },
    async verify() {
      if (mode === 'auth') throw Object.assign(new Error('secret provider detail'), { code: 'EAUTH' });
      return true;
    },
  };
});
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test('Gmail requires valid sender and app password; pasted spaces are removed', () => {
  assert.deepEqual(getMailConfig(settings), { user: settings.GMAIL_USER, pass: 'abcdefghijklmnop' });
  assert.throws(() => getMailConfig({ ...settings, GMAIL_USER: '' }), /GMAIL_USER/);
  assert.throws(() => getMailConfig({ ...settings, GMAIL_APP_PASSWORD: '' }), /GMAIL_APP_PASSWORD/);
  assert.throws(() => getMailConfig({ ...settings, GMAIL_APP_PASSWORD: 'wrong-password' }), /16-character/);
});

test('Gmail sends to recipient, forces the authenticated sender, and handles failures safely', async () => {
  const message = { to: 'recipient@example.test', from: 'wrong@example.test', subject: 'test', text: 'test' };
  mode = 'accepted';
  assert.equal((await mailer.sendMail(message)).messageId, 'test-message-reference');
  assert.equal(delivered.from, settings.GMAIL_USER);
  assert.equal(await mailer.verify(), true);
  for (const [value, pattern] of [['auth', /Gmail login failed/], ['rejected', /rejected the recipient/], ['network', /Cannot connect/]]) {
    mode = value;
    await assert.rejects(mailer.sendMail(message), pattern);
  }
  mode = 'auth';
  await assert.rejects(mailer.verify(), /Gmail login failed/);
  mode = 'accepted';
});

for (const [send, verify, field, expiry, lookup] of [
  [sendVerifyOtp, verifyEmail, 'verifyOtp', 'verifyOtpExpireAt', 'findById'],
  [sendResetOtp, resetPassword, 'resetOtp', 'resetOtpExpireAt', 'findOne'],
]) {
  test(`${field}: email contains persisted code, no code logs, one use and expiration`, async () => {
    const user = { email: 'recipient@example.test', isAccountVerified: false, async save() {} };
    const lookupMock = mock.method(userModel, lookup, async () => user);
    const logs = mock.method(console, 'log', () => {});
    try {
      mode = 'accepted';
      const req = { user: { userId: 'id' }, body: { email: user.email } };
      const res = response();
      await send(req, res);
      assert.equal(res.code, 200);
      assert.equal(delivered.to, user.email);
      assert.match(user[field], /^\d{6}$/);
      assert.ok(delivered.html.includes(user[field]));
      assert.ok(delivered.text.includes(user[field]));
      assert.ok(delivered.html.includes('10 minutes'));
      assert.ok(user[expiry] > Date.now());
      assert.equal(logs.mock.callCount(), 0);
      const otp = user[field];
      req.body = { email: user.email, otp, newPassword: 'new-test-password' };
      const ok = response(); await verify(req, ok);
      assert.equal(ok.code, 200);
      assert.equal(user[field], '');
      const reused = response(); await verify(req, reused);
      assert.equal(reused.code, 401);
      user[field] = otp; user[expiry] = Date.now() - 1000;
      const expired = response(); await verify(req, expired);
      assert.equal(expired.body.message, 'OTP expired');
    } finally { lookupMock.mock.restore(); logs.mock.restore(); }
  });

  test(`${field}: failed email never reports success or exposes an OTP`, async () => {
    const user = { email: 'recipient@example.test', async save() {} };
    const lookupMock = mock.method(userModel, lookup, async () => user);
    try {
      mode = 'auth';
      const res = response();
      await send({ user: { userId: 'id' }, body: { email: user.email } }, res);
      assert.equal(res.code, 502);
      assert.equal(res.body.success, false);
      assert.ok(!JSON.stringify(res.body).includes(user[field]));
      assert.ok(!JSON.stringify(res.body).includes('secret provider detail'));
    } finally { lookupMock.mock.restore(); mode = 'accepted'; }
  });
}

test('registered user can request and reset password without login or old password', async () => {
  const { default: express } = await import('express');
  const { default: authRouter } = await import('../routes/authRoutes.js');
  const user = { email: 'forgot@example.test', async save() {} };
  const lookupMock = mock.method(userModel, 'findOne', async ({ email }) => email === user.email ? user : null);
  const app = express(); app.use(express.json()); app.use('/api/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (path, body) => fetch(endpoint + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const sent = await post('/send-reset-otp', { email: user.email });
    assert.equal(sent.status, 200);
    const reset = await post('/reset-password', { email: user.email, otp: user.resetOtp, newPassword: 'changed-password' });
    assert.equal(reset.status, 200);
    assert.ok(user.password);
    const absent = await post('/send-reset-otp', { email: 'never-registered@example.test' });
    assert.equal(absent.status, 404);
    assert.match((await absent.json()).message, /sign up first/);
  } finally {
    lookupMock.mock.restore();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
