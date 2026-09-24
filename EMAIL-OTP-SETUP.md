# Gmail OTP setup — no domain purchase

This version uses your existing personal Gmail account to automatically send verification and password-reset OTPs. No custom domain or paid email-provider account is required. Google still applies sending limits and security checks; this is not unlimited or guaranteed delivery.

## 1. Create your sender App Password

1. Sign in to the Gmail account you want your app to send emails from.
2. Open https://myaccount.google.com/security and enable 2-Step Verification.
3. Open https://myaccount.google.com/apppasswords .
4. Create an App Password named MERN Auth and copy the generated 16-character password.
5. Keep this password private. It is different from your normal Gmail password.

If App Passwords is unavailable, Google may restrict it for your account type or security configuration. Follow https://support.google.com/accounts/answer/185833 . Do not disable protections to work around restrictions.

## 2. Add the two values

Extract this ZIP into a new folder and open mern-auth in VS Code. Open server/.env and edit the two existing lines:

    GMAIL_USER=your-sender@gmail.com
    GMAIL_APP_PASSWORD=your_generated_app_password

Replace both example values with your actual details. Do not add duplicate lines. Leave your MongoDB and JWT settings in place. Never put these credentials in client/.env or send them in chat.

Only you, the app owner, configure the sender credentials. Users simply register their email and receive OTPs there. Recipients do not need an App Password and can use other email providers.

## 3. Run the checks

Stop the previous server and client terminals with Ctrl+C. In the new project, open a terminal:

    cd server
    npm install
    npm run check-email

Use Node.js 20.19+ or a supported newer version. The check verifies the Gmail connection and login without sending a message.

Then send a diagnostic email to an address you control (replace the example address):

    npm run test-email -- your-recipient@gmail.com

The test prints an acceptance status and message reference, never an OTP. Check the inbox and Spam/Junk folder. Acceptance does not guarantee inbox placement.

Start the server:

    npm run server

In another terminal at the project root:

    cd client
    npm install
    npm run dev

Open http://localhost:5173 . Restart the backend after editing server/.env.

## 4. Use your app

- Verification: log in, hover over your profile initial, and click Verify email.
- Forgot password: enter the email you registered with, receive the OTP, then set a new password. You do not need the old password or to be logged in. An unverified account can also reset its password.
- New users must sign up first, because there is no existing password to reset.
- Both codes expire in 10 minutes. Use the newest code. Resend becomes available after the 60-second screen cooldown.
- Read the emails on your phone using Gmail or your email app. This sends email, not SMS.

## Troubleshooting

- Gmail login failed: verify the sender address, 2-Step Verification and App Password. Do not use your regular Gmail password. Changing your Google password can revoke App Passwords.
- Cannot connect: check internet access and whether your network/hosting permits Gmail SMTP port 465. Some hosts block SMTP.
- Accepted but missing: check recipient spelling, Spam/Junk, Google security alerts and bounce messages in the sender account. Google can block unusual activity and apply sending limits.
- Never share the App Password in a screenshot. Share only the error text if you need help.

## Changes and checks

The mailer now uses only Gmail. Previous provider settings and credentials were removed. Existing MongoDB and JWT configuration is retained. Resend-code controls, duplicate-click protection, accurate acceptance messages and ten-minute expiry remain in place.

Seven automated tests passed with simulated email/database operations. They check Gmail settings and sender selection, authentication/network/recipient failures, code delivery content, expiration, one-time use, absence of OTP logging and password reset without login through local HTTP routes. No real Gmail email was sent because you must enter your credentials locally. The frontend files previously passed JSX syntax checks and were not changed in this version.

Dependencies and generated builds are omitted; npm install restores dependencies. Private database settings from your original project are included, so keep the archive private.

Official references:
https://support.google.com/accounts/answer/185833
https://nodemailer.com/guides/using-gmail
