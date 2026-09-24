import mailer from '../config/mailer.js';

try {
  await mailer.verify();
  console.log('Gmail connection and login succeeded. Run npm run test-email -- YOUR_RECIPIENT_EMAIL to check real delivery.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
