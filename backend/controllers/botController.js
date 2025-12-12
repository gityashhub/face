// backend/controllers/botController.js
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Message from '../models/Message.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// HR FAQs
const HR_FAQS = {
  'leave policy': 'Our leave policy allows 21 annual leaves, 10 sick leaves, and 5 casual leaves per year. Unused leaves can be carried forward up to a maximum of 15 days.',
  'salary credit': 'Salaries are credited on the 1st of every month to your registered bank account. If the 1st is a holiday, it will be credited on the next working day.',
  'appraisal': 'Performance appraisals are conducted annually in December. Ratings are based on KPIs, peer reviews, and manager feedback.',
  'working hours': 'Standard working hours are 9:00 AM to 6:00 PM, Monday to Friday. Flexible hours can be arranged with manager approval.'
};

const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Greeting detection
  if (lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || 
      lowerMessage.includes('hey') || 
      lowerMessage.includes('good morning') || 
      lowerMessage.includes('good evening') ||
      lowerMessage.includes('how are you')) {
    return 'greeting';
  }

  if (lowerMessage.includes('attendance') || lowerMessage.includes('report')) return 'attendance_report';
  if (lowerMessage.includes('leave day') || lowerMessage.includes('leave balance')) return 'leave_balance';
  for (const key of Object.keys(HR_FAQS)) {
    if (lowerMessage.includes(key)) return 'hr_faq';
  }
  if (lowerMessage.includes('salary slip') || lowerMessage.includes('generate salary')) return 'generate_salary_slip';
  if (lowerMessage.includes('appraisal letter')) return 'generate_appraisal_letter';
  if (lowerMessage.includes('leave approval')) return 'generate_leave_approval';
  if (lowerMessage.includes('apply for leave')) return 'apply_leave';
  if (lowerMessage.includes('update details')) return 'update_details';
  return 'unknown';
};

// Helper to get safe employee ID
const getEmployeeId = (user) => {
  return user.employeeId?.employeeId || 
         user.employeeId?._id || 
         user.employeeId || 
         user._id.toString() || 
         'unknown';
};

// PDF Generators
const generateSalarySlipPDF = async (user, month = 'current', year = new Date().getFullYear()) => {
  const PDFDocument = require('pdfkit');
  const empId = getEmployeeId(user);
  const fileName = `salary_slip_${empId}_${month}_${year}_${uuidv4().slice(0,8)}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Salary Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Employee: ${user.name || user.fullName || 'N/A'}`)
      .text(`ID: ${empId}`)
      .text(`Month: ${month} ${year}`)
      .moveDown()
      .text('Basic Salary: $5000')
      .text('HRA: $1000')
      .text('Conveyance: $500')
      .text('Total: $6500');

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

const generateAppraisalLetterPDF = async (user) => {
  const PDFDocument = require('pdfkit');
  const empId = getEmployeeId(user);
  const fileName = `appraisal_letter_${empId}_${uuidv4().slice(0,8)}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Appraisal Letter', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Dear ${user.name || user.fullName || 'Employee'},`)
      .moveDown()
      .text('Congratulations on your performance this year. Your rating is Excellent.')
      .text('Salary increment: 10%')
      .moveDown()
      .text('Best regards,')
      .text('HR Department');

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

// Core logic: returns { response, intent }
export const processBotMessage = async (text, userId) => {
  try {
    console.log('Bot processing message:', text, 'for user:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return { 
        response: 'Sorry, I cannot find your profile. Please contact HR support.', 
        intent: 'error' 
      };
    }

    const intent = detectIntent(text);
    let response = '';

    switch (intent) {
      case 'greeting':
        response = `Hello! 👋 I'm your HR Assistant. How can I help you today?\n\nYou can ask me about:\n• **Attendance** or **leave balance**\n• **HR policies** (leave, salary, working hours)\n• **Generate documents** (salary slip, appraisal letter)\n• **Apply for leave** or **update personal details**`;
        break;

      case 'attendance_report':
        try {
          const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          const endDate = new Date();
          
          // Try multiple field names to find the correct one
          let attendance = [];
          
          // Method 1: Try employeeId field
          attendance = await Attendance.find({
            employeeId: user.employeeId?._id || userId,
            date: { $gte: startDate, $lte: endDate }
          });
          
          // Method 2: If no results, try user field
          if (attendance.length === 0) {
            attendance = await Attendance.find({
              user: userId,
              date: { $gte: startDate, $lte: endDate }
            });
          }
          
          // Method 3: If still no results, try employee field
          if (attendance.length === 0) {
            attendance = await Attendance.find({
              employee: userId,
              date: { $gte: startDate, $lte: endDate }
            });
          }
          
          console.log('Attendance records found:', attendance.length);
          
          const present = attendance.filter(a => 
            ['present', 'Present', 'late', 'Late'].includes(a.status)
          ).length;
          
          response = attendance.length > 0 
            ? `Your attendance this month: ${present} present out of ${attendance.length} working days.`
            : 'No attendance records found for this month.';
        } catch (err) {
          console.error('Attendance query error:', err);
          response = 'Sorry, I cannot access your attendance records right now. Please try again later.';
        }
        break;

      case 'leave_balance':
        try {
          let leaves = [];
          
          // Method 1: Try employeeId field
          leaves = await Leave.find({ 
            employeeId: user.employeeId?._id || userId,
            status: 'approved' 
          });
          
          // Method 2: If no results, try user field
          if (leaves.length === 0) {
            leaves = await Leave.find({ 
              user: userId,
              status: 'approved' 
            });
          }
          
          // Method 3: If still no results, try employee field
          if (leaves.length === 0) {
            leaves = await Leave.find({ 
              employee: userId,
              status: 'approved' 
            });
          }
          
          console.log('Approved leaves found:', leaves.length);
          
          const remaining = 21 - leaves.length;
          response = `You have ${remaining} annual leave days remaining this year.`;
        } catch (err) {
          console.error('Leave query error:', err);
          response = 'Sorry, I cannot access your leave records right now. Please try again later.';
        }
        break;

      case 'hr_faq':
        const faqKey = Object.keys(HR_FAQS).find(key => text.toLowerCase().includes(key));
        response = faqKey ? HR_FAQS[faqKey] : 'I can help with HR policies. Ask about leave policy, salary credit, appraisal, or working hours.';
        break;

      case 'generate_salary_slip':
        try {
          const fileName = await generateSalarySlipPDF(user);
          response = `✅ Your salary slip is ready! [Download here](/api/bot/download/${fileName})`;
        } catch (err) {
          console.error('Salary slip error:', err);
          response = '❌ Failed to generate salary slip. Please try again later.';
        }
        break;

      case 'generate_appraisal_letter':
        try {
          const fileName = await generateAppraisalLetterPDF(user);
          response = `✅ Your appraisal letter is ready! [Download here](/api/bot/download/${fileName})`;
        } catch (err) {
          console.error('Appraisal letter error:', err);
          response = '❌ Failed to generate appraisal letter. Please try again later.';
        }
        break;

      case 'apply_leave':
        response = 'To apply for leave, please use the "Apply Leave" button in your dashboard or specify the dates and reason for your leave request.';
        break;

      case 'update_details':
        response = 'To update your personal details, please go to your profile settings in the dashboard or contact HR support directly.';
        break;

      default:
        response = 'I can help with attendance, leave balance, HR policies, or documents like salary slips. Try asking something like:\n• "Show my attendance"\n• "How many leave days do I have?"\n• "What\'s the leave policy?"\n• "Generate salary slip"';
    }

    // Save bot message to DB
    await new Message({
      from: null,
      to: userId,
      text: response,
      fromBot: true
    }).save();

    return { response, intent };

  } catch (error) {
    console.error('Bot processing error:', error);
    return { 
      response: 'Sorry, I encountered an unexpected error. Please try again or contact HR support.', 
      intent: 'error' 
    };
  }
};

// Express route handler
export const processMessage = async (req, res) => {
  const { text, userId } = req.body;

  // Save user message
  await new Message({
    from: userId,
    to: userId, // Self-message for bot conversation
    text: text.trim()
  }).save();

  const { response } = await processBotMessage(text, userId);
  res.json({ success: true, response });
};

export const getBotHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { to: userId, fromBot: true },
        { from: userId }
      ]
    }).sort({ timestamp: 1 });

    res.json({ success: true,  messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load history' });
  }
};