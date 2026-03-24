require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
  console.log('--- Email Configuration Test ---');
  console.log('HOST:', process.env.EMAIL_HOST);
  console.log('PORT:', process.env.EMAIL_PORT);
  console.log('USER:', process.env.EMAIL_USER);
  console.log('FROM:', process.env.EMAIL_FROM);
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified!');

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self
      subject: 'Test Email from PayQusta Script',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<b>This is a test email to verify SMTP configuration.</b>'
    };

    console.log('Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error);
    process.exit(1);
  }
};

testEmail();
