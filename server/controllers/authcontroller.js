import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/mailer.js';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

// Emails are matched exactly in MongoDB, so store and look them up in one form
const normalizeEmail = (email) => String(email).trim().toLowerCase();

// ------------------ REGISTER ------------------
export const register = async (req, res) => {
  const { name, password } = req.body;

  if (!name || !req.body.email || !password)
    return res.status(400).json({ success: false, message: "Missing Details" });

  const email = normalizeEmail(req.body.email);

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res.status(409).json({ success: false, message: "This email already has an account. Log in, or use Forgot password to set a new password." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Welcome email is best-effort: the account is already created, so don't fail the request
    try {
      await transporter.sendMail({
          to: email,
        subject: 'Welcome to our platform!',
        text: `Welcome! Your account has been created with email: ${email}`
      });
    } catch (mailError) {
      console.error('Welcome email failed:', mailError.message);
    }

    return res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ------------------ LOGIN ------------------
export const login = async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);

  try {
    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: "No account found with this email. Please sign up first." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: { _id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------ LOGOUT ------------------
export const logout = (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'strict',
    });
    res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ------------------ VERIFY EMAIL FLOW ------------------
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isAccountVerified)
      return res.status(400).json({ success: false, message: "Account already verified" });

    const otp = String(randomInt(100000, 1000000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      to: user.email,
      subject: 'Verify your account',
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: EMAIL_VERIFY_TEMPLATE.replace('{{email}}', user.email).replace('{{otp}}', otp),
    });

    res.status(200).json({ success: true, message: "Email provider accepted your OTP email. Check your inbox and Spam folder." });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { otp } = req.body;
  const { userId } = req.user;

  if (!otp || !userId)
    return res.status(400).json({ success: false, message: "Missing details" });

  try {
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.verifyOtp !== otp)
      return res.status(401).json({ success: false, message: "Invalid OTP" });

    if (user.verifyOtpExpireAt < Date.now())
      return res.status(401).json({ success: false, message: "OTP expired" });

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;
    await user.save();

    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ------------------ IS AUTH ------------------
export const isAuthenticated = (req, res) => {
  try {
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ------------------ PASSWORD RESET ------------------
export const sendResetOtp = async (req, res) => {
  if (!req.body.email) return res.status(400).json({ success: false, message: "Email is required" });

  const email = normalizeEmail(req.body.email);

  try {
    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email. Please sign up first." });

    const otp = String(randomInt(100000, 1000000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      to: user.email,
      subject: 'Reset your password',
      text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
      html: PASSWORD_RESET_TEMPLATE.replace('{{email}}', user.email).replace('{{otp}}', otp),
    });

    res.status(200).json({ success: true, message: "Email provider accepted your OTP email. Check your inbox and Spam folder." });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { otp, newPassword } = req.body;
  if (!req.body.email || !otp || !newPassword)
    return res.status(400).json({ success: false, message: "Missing fields" });

  const email = normalizeEmail(req.body.email);

  try {
    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email. Please sign up first." });

    if (user.resetOtp !== otp)
      return res.status(401).json({ success: false, message: "Invalid OTP" });

    if (user.resetOtpExpireAt < Date.now())
      return res.status(401).json({ success: false, message: "OTP expired" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = '';
    user.resetOtpExpireAt = 0;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};