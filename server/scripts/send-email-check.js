import transporter from '../config/mailer.js';

// Explicit manual diagnostic: sends only when the developer supplies a recipient.
const recipient = process.argv[2]?.trim();
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error('Usage: npm run test-email -- your-own-email@example.com');
  process.exitCode = 1;
} else {
  try {
    const result = await transporter.sendMail({
      to: recipient,
      subject: 'MERN Auth email delivery test',
      text: 'Your project successfully submitted this test email. If you can read this message in your inbox, email delivery is working. You can now request a new verification or password reset code in the app.',
    });
    console.log('Provider accepted the test email. Check the recipient inbox and Spam folder.');
    console.log('Message reference:', result.messageId || '(not supplied)');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
