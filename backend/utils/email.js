import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration (e.g., Gmail SMTP)
    return nodemailer.createTransport({
      service: 'gmail', // or use custom SMTP host
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD, // App Password for Gmail
      },
    });
  } else {
    // Development - use Ethereal Email for testing
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'ethereal.pass',
      },
    });
  }
};

/**
 * Send email utility function
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'CompanyName EMS',
        address: process.env.EMAIL_FROM || 'noreply@company.com',
      },
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback plain text
    };

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl:
        process.env.NODE_ENV !== 'production'
          ? nodemailer.getTestMessageUrl(info)
          : null,
    };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    console.error('❌ Error details:', {
      to,
      subject,
      error: error.message,
      code: error.code,
      command: error.command
    });

    // Don't throw error in production to prevent breaking the main flow
    // Instead return a failure result
    return {
      success: false,
      error: error.message,
      message: 'Email could not be sent'
    };
  }
};

/**
 * Email template wrapper with company branding
 */
const createEmailTemplate = (content, title = 'CompanyName EMS') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; background: #f4f4f7; color: #333; }
        .email-container { max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #e91e63, #9c27b0); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 14px 28px; border-radius: 8px; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; text-decoration: none; }
        .info-box, .warning-box, .success-box { padding: 15px; border-radius: 6px; margin: 20px 0; }
        .info-box { background: #f8f9fa; border-left: 4px solid #e91e63; }
        .warning-box { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 13px; color: #666; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>CompanyName</h1>
          <p>Employee Management System</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated email from CompanyName EMS. Please do not reply.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}">Visit Portal</a> | 
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@company.com'}">Contact Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Password reset request email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const emailContent = `
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Click below to reset your password:</p>
    <div style="text-align:center;margin:20px;">
      <a href="${resetURL}" class="button">Reset Password</a>
    </div>
    <div class="warning-box">
      <p>⚠️ This link expires in <strong>10 minutes</strong>. If you didn’t request this, ignore this email.</p>
    </div>
    <p>If the button doesn’t work, copy and paste this link:<br>
    <a href="${resetURL}">${resetURL}</a></p>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Password Reset Request');

  return await sendEmail({
    to: user.email,
    subject: '🔐 Password Reset Request - CompanyName EMS',
    html: htmlContent,
  });
};

/**
 * Password reset confirmation
 */
export const sendPasswordResetConfirmation = async (user) => {
  const emailContent = `
    <h2>✅ Password Reset Successful</h2>
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Your password was successfully changed. You can now login with your new password.</p>
    <div style="text-align:center;margin:20px;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Password Reset Confirmation');

  return await sendEmail({
    to: user.email,
    subject: '✅ Password Reset Confirmation - CompanyName EMS',
    html: htmlContent,
  });
};

/**
 * Welcome email
 */
export const sendWelcomeEmail = async (employee, tempPassword) => {
  const emailContent = `
    <h2>Welcome to Our Team 🎉</h2>
    <p>Hello <strong>${employee.fullName}</strong>,</p>
    <p>Your account has been created. Here are your login details:</p>
    <div class="info-box">
      <p><strong>Email:</strong> ${employee.user.email}</p>
      <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    </div>
    <div style="text-align:center;margin:20px;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
    </div>
    <div class="warning-box">
      <p>⚠️ Please change your temporary password after first login.</p>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Welcome to CompanyName');

  return await sendEmail({
    to: employee.user.email,
    subject: '🎉 Welcome to CompanyName - Your Account is Ready!',
    html: htmlContent,
  });
};
