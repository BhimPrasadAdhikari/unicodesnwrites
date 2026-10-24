import nodemailer from 'nodemailer';

async function testEmail() {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM;
  
  if (!host || !user || !pass || !from) {
    console.error('❌ Missing email environment variables');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
  
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'unicodesnwrites'}" <${from}>`,
      to: 'uniquekumar98@gmail.com', // Replace with your email for testing
      subject: 'Test Email from unicodesnwrites',
      text: 'This is a test email to verify production email configuration.',
      html: '<p>This is a test email to verify production email configuration.</p>',
    });
    
    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Email failed:', error);
    process.exit(1);
  }
}

testEmail().catch(console.error);
