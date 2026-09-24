# Mern-Auth
A MERN authentication system with user registration, login, email OTP verification, and password reset using Gmail.
# MERN Authentication System

A full-stack authentication application built using MongoDB,
Express.js, React and Node.js. It supports registration, login,
email verification and password reset through email OTPs.

## Features

- User registration and login
- Password hashing using bcrypt
- JWT authentication with HTTP-only cookies
- Email verification using a six-digit OTP
- Password reset without needing the old password
- OTP expiration after 10 minutes
- Resend-code option
- Automatic email delivery through Gmail

## Technologies Used

- Frontend: React, Vite, Tailwind CSS and Axios
- Backend: Node.js and Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT and bcrypt
- Email: Nodemailer with Gmail SMTP

## How It Works

1. Users register with their name, email and password.
2. Users log in using their registered email and app password.
3. Selecting Verify email sends an OTP to their registered inbox.
4. Users enter the OTP to verify their email.
5. If they forget their password, they request a reset OTP.
6. After providing the correct OTP, they can set a new password.

Normal login does not require an OTP.

## Email Configuration

The backend uses a configured Gmail account to send OTPs
automatically to users' email addresses.

Set GMAIL_USER and GMAIL_APP_PASSWORD in server/.env.
Use a Google App Password, not your normal Gmail password.

Never upload real credentials or .env files to GitHub.

## Running Locally

Backend:
- cd server
- npm install
- npm run server

Frontend — in a separate terminal:
- cd client
- npm install
- npm run dev

Configure the database, JWT secret and email credentials first.
See EMAIL-OTP-SETUP.md for detailed email setup instructions.

## Current Limitations

Gmail sending limits apply. Server-side OTP request limits and
incorrect-attempt limits are still needed before public deployment.
