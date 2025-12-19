import nodemailer from 'nodemailer';

let transporter = null;

const initializeEmailService = () => {
  const adminEmail = process.env.ADMIN_SYSTEM_EMAIL;
  const adminPassword = process.env.ADMIN_SYSTEM_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  Email service not configured. Set ADMIN_SYSTEM_EMAIL and ADMIN_SYSTEM_PASSWORD environment variables.');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: adminEmail,
        pass: adminPassword
      }
    });

    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    return false;
  }
};

const formatDateIST = (date) => {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  };
  return new Date(date).toLocaleDateString('en-IN', options);
};

const sendTaskStatusEmail = async (employee, tasks) => {
  if (!transporter) {
    console.warn('⚠️  Email service not initialized. Cannot send email.');
    return false;
  }

  try {
    const employeeEmail = employee.workInfo?.email || employee.email;
    if (!employeeEmail) {
      console.warn(`⚠️  No email found for employee: ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}`);
      return false;
    }

    // Build task rows for HTML email
    const taskRows = tasks
      .map(
        (task) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px; text-align: left;">${task.description || 'N/A'}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            ${getStatusColor(task.status)}
          ">${task.status || 'Not Started'}</span>
        </td>
        <td style="padding: 10px; text-align: center;">
          <span style="
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            ${getPriorityColor(task.priority)}
          ">${task.priority || 'Medium'}</span>
        </td>
        <td style="padding: 10px; text-align: center;">${formatDateIST(task.dueDate) || 'N/A'}</td>
        <td style="padding: 10px; text-align: center;">${task.estimatedHours || 0} hrs</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 900px;
            margin: 20px auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 30px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
          }
          .employee-info {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #667eea;
            width: 150px;
          }
          .info-value {
            color: #333;
            word-break: break-word;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
          }
          thead {
            background-color: #667eea;
            color: white;
          }
          th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px;
            text-align: left;
          }
          .no-tasks {
            text-align: center;
            padding: 40px;
            color: #999;
            font-style: italic;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
          }
          .timestamp {
            color: #999;
            font-size: 12px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Daily Task Status Report</h1>
            <p>Report Generated: ${formatDateIST(new Date())}</p>
          </div>
          
          <div class="content">
            <!-- Employee Information Section -->
            <div class="section">
              <div class="section-title">Employee Information</div>
              <div class="employee-info">
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${employeeEmail}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Department:</span>
                  <span class="info-value">${employee.workInfo?.department?.name || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Employee ID:</span>
                  <span class="info-value">${employee.employeeId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <!-- Task Details Section -->
            <div class="section">
              <div class="section-title">Task Details (${tasks.length} tasks)</div>
              ${
                tasks.length > 0
                  ? `
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style="text-align: center;">Status</th>
                      <th style="text-align: center;">Priority</th>
                      <th style="text-align: center;">Due Date</th>
                      <th style="text-align: center;">Est. Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taskRows}
                  </tbody>
                </table>
              `
                  : '<div class="no-tasks">No tasks assigned at this time.</div>'
              }
            </div>

            <!-- Summary Section -->
            <div class="section">
              <div class="section-title">Summary</div>
              <div class="employee-info">
                <div class="info-row">
                  <span class="info-label">Total Tasks:</span>
                  <span class="info-value">${tasks.length}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Completed:</span>
                  <span class="info-value">${tasks.filter((t) => t.status === 'Completed').length}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">In Progress:</span>
                  <span class="info-value">${tasks.filter((t) => t.status === 'In Progress').length}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Pending:</span>
                  <span class="info-value">${tasks.filter((t) => t.status === 'Not Started').length}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated report. Please do not reply to this email.</p>
            <p class="timestamp">Generated on ${formatDateIST(new Date())}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`,
        address: adminEmail
      },
      to: 'tarunatechnology@gmail.com',
      replyTo: employeeEmail,
      subject: `Daily Task Status Report - ${employee.personalInfo?.firstName || 'Employee'} [${formatDateIST(new Date())}]`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully for employee: ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email for employee: ${error.message}`);
    return false;
  }
};

const getStatusColor = (status) => {
  const colors = {
    'Not Started': 'background-color: #e0e0e0; color: #666;',
    'In Progress': 'background-color: #2196F3; color: white;',
    'Review': 'background-color: #FF9800; color: white;',
    'Completed': 'background-color: #4CAF50; color: white;',
    'On Hold': 'background-color: #FFC107; color: white;',
    'Cancelled': 'background-color: #f44336; color: white;'
  };
  return colors[status] || colors['Not Started'];
};

const getPriorityColor = (priority) => {
  const colors = {
    'Low': 'background-color: #4CAF50; color: white;',
    'Medium': 'background-color: #FF9800; color: white;',
    'High': 'background-color: #f44336; color: white;',
    'Critical': 'background-color: #8B0000; color: white;'
  };
  return colors[priority] || colors['Medium'];
};

export { initializeEmailService, sendTaskStatusEmail };
