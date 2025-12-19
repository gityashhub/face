import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let transporter = null;
let adminEmail = null;

const initializeEmailService = () => {
  adminEmail = process.env.ADMIN_SYSTEM_EMAIL;
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
      to: 'vrundafadadu@gmail.com',
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

const aggregateStatusCounts = (tasks) => {
  const counts = { Completed: 0, 'In Progress': 0, 'Not Started': 0, Review: 0, 'On Hold': 0, Cancelled: 0 };
  tasks.forEach(t => {
    const key = counts[t.status] !== undefined ? t.status : 'Not Started';
    counts[key] += 1;
  });
  return counts;
};

const ensureTempDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const generateConsolidatedTasksPDF = async (sections) => {
  const PDFDocument = (await import('pdfkit')).default;
  const tempDir = path.join(process.cwd(), 'temp', 'task-reports');
  ensureTempDir(tempDir);
  const fileName = `consolidated_tasks_${uuidv4().slice(0, 8)}.pdf`;
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('Consolidated Task Status Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Generated: ${formatDateIST(new Date())}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    sections.forEach(({ employee, tasks }, index) => {
      const name = `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() || 'Employee';
      // Fallback: workInfo.email -> user.email -> contactInfo.personalEmail
      const email = employee.workInfo?.email || (employee.user && employee.user.email) || employee.contactInfo?.personalEmail || 'N/A';
      const dept = employee.workInfo?.department?.name || 'N/A';
      const empId = employee.employeeId || 'N/A';
      const counts = aggregateStatusCounts(tasks);

      // --- Employee Header (Card Style) ---
      const startY = doc.y;
      doc.rect(50, startY, 500, 70).fillAndStroke('#f3f4f6', '#e5e7eb'); // Light gray bg
      doc.fillColor('#111827'); // Dark text

      doc.fontSize(14).font('Helvetica-Bold').text(name, 65, startY + 15);
      doc.fontSize(10).font('Helvetica').fillColor('#4b5563'); // Gray text
      
      doc.text(`ID: ${empId}`, 65, startY + 38);
      doc.text(`Dept: ${dept}`, 200, startY + 38);
      doc.text(`Email: ${email}`, 350, startY + 38);
      
      doc.moveDown(4); // Move past header box

      // --- Tasks Section ---
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`Tasks Overview (${tasks.length})`, 50);
      doc.moveDown(0.5);

      if (!tasks.length) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#6b7280').text('No tasks assigned at this time.', 50);
      } else {
        // Table Header
        const tableTop = doc.y;
        doc.rect(50, tableTop, 500, 20).fill('#e5e7eb');
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
        doc.text('Description', 60, tableTop + 6);
        doc.text('Status', 300, tableTop + 6);
        doc.text('Priority', 380, tableTop + 6);
        doc.text('Hours', 450, tableTop + 6);
        doc.text('Due', 500, tableTop + 6);
        
        doc.moveDown(1.5);

        // Table Rows
        tasks.forEach((task, i) => {
          const rowY = doc.y;
          const isEven = i % 2 === 0;
          if (!isEven) doc.rect(50, rowY - 2, 500, 20).fill('#f9fafb'); // Zebra stripe
          
          doc.fillColor('#1f2937').fontSize(9).font('Helvetica');
          
          // Truncate long descriptions
          let desc = task.description || 'N/A';
          if (desc.length > 50) desc = desc.substring(0, 47) + '...';

          const status = task.status || 'Not Started';
          const priority = task.priority || 'Medium';
          const due = task.dueDate ? formatDateIST(task.dueDate).split(',')[0] : '-'; // Date only
          const hours = task.estimatedHours || 0;

          // Status Color Logic
          let statusColor = '#374151'; // Default gray
          if (status === 'Completed') statusColor = '#059669'; // Green
          if (status === 'In Progress') statusColor = '#2563eb'; // Blue
          if (status === 'Review') statusColor = '#d97706'; // Amber

          doc.text(desc, 60, rowY);
          
          doc.fillColor(statusColor).font('Helvetica-Bold').text(status, 300, rowY);
          
          doc.fillColor('#374151').font('Helvetica'); // Reset
          doc.text(priority, 380, rowY);
          doc.text(`${hours}h`, 450, rowY);
          doc.text(due, 500, rowY);
          
          doc.moveDown(1.2);
        });
      }

      doc.moveDown(1);
      
      // --- Summary Metrics ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Metrics:', 50);
      doc.fontSize(10).font('Helvetica').fillColor('#4b5563');
      const metrics = `Completed: ${counts['Completed']}  |  In Progress: ${counts['In Progress']}  |  Pending: ${counts['Not Started']}  |  Review: ${counts['Review']}`;
      doc.text(metrics, 50);

      doc.moveDown(2);
      
      // Separator line (unless last item)
      if (index < sections.length - 1) {
        doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).strokeColor('#e5e7eb').stroke();
        doc.moveDown(2);
      }
    });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

const sendConsolidatedTaskStatusEmail = async (sections) => {
  if (!transporter) {
    console.warn('⚠️  Email service not initialized. Cannot send email.');
    return false;
  }

  try {
    const allTasks = sections.flatMap(s => s.tasks);
    const counts = aggregateStatusCounts(allTasks);
    const totalEmployees = sections.length;
    const totalTasks = allTasks.length;

    const summaryHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .container { max-width: 900px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 30px; }
          .section { margin-bottom: 10px; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .card { background: #f9f9f9; padding: 14px; border-radius: 6px; }
          .label { color: #667eea; font-weight: bold; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
          .timestamp { color: #999; font-size: 12px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Consolidated Daily Task Status Report</h1>
            <p>Report Generated: ${formatDateIST(new Date())}</p>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">Summary</div>
              <div class="summary-grid">
                <div class="card"><span class="label">Employees:</span> ${totalEmployees}</div>
                <div class="card"><span class="label">Total Tasks:</span> ${totalTasks}</div>
                <div class="card"><span class="label">Completed:</span> ${counts['Completed']}</div>
                <div class="card"><span class="label">In Progress:</span> ${counts['In Progress']}</div>
                <div class="card"><span class="label">Pending:</span> ${counts['Not Started']}</div>
              </div>
            </div>
            <div class="section">
              The detailed per-employee tasks are attached as a PDF.
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

    const pdfPath = await generateConsolidatedTasksPDF(sections);
    const recipient = process.env.TASK_REPORT_RECIPIENT || 'vrundafadadu@gmail.com';

    const mailOptions = {
      from: {
        name: 'CompanyName EMS',
        address: adminEmail
      },
      to: recipient,
      replyTo: adminEmail,
      subject: `Consolidated Task Status Report [${formatDateIST(new Date())}]`,
      html: summaryHtml,
      attachments: [
        {
          filename: `Consolidated_Task_Status_Report_${formatDateIST(new Date()).replace(/[^\w\s-]/g, '')}.pdf`,
          path: pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    try {
      fs.unlinkSync(pdfPath);
    } catch {}
    console.log(`✅ Consolidated report email sent | Employees: ${totalEmployees} | Tasks: ${totalTasks}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send consolidated report: ${error.message}`);
    return false;
  }
};

export { sendConsolidatedTaskStatusEmail };
