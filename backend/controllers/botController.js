// backend/controllers/botController.js
import Groq from 'groq-sdk';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Message from '../models/Message.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const HR_CONTEXT = `You are an HR Assistant bot for an Employee Management System. You can ONLY help with HR-related topics. You must be helpful, professional, and concise.

Your allowed topics and capabilities:
1. **Leave Policies**: Annual leave (21 days), Sick leave (10 days), Casual leave (5 days). Unused leaves can carry forward up to 15 days.
2. **Salary Information**: Salaries credited on 1st of every month. If holiday, next working day.
3. **Working Hours**: Standard hours are 9:00 AM to 6:00 PM, Monday to Friday. Flexible hours possible with manager approval.
4. **Performance Appraisals**: Conducted annually in December. Based on KPIs, peer reviews, and manager feedback.
5. **Attendance Queries**: Help employees understand their attendance records and policies.
6. **Leave Applications**: Guide on how to apply for leave through the system.
7. **Document Requests**: Can generate salary slips and appraisal letters.
8. **Company Policies**: General HR policies and guidelines.
9. **Benefits Information**: Employee benefits and perks.
10. **Onboarding/Offboarding**: Process information for new joiners and exits.

IMPORTANT RULES:
- ONLY respond to HR-related questions
- If asked about non-HR topics (coding, general knowledge, politics, entertainment, etc.), politely decline and redirect to HR topics
- Keep responses concise and professional
- Use markdown formatting for better readability
- Be friendly but maintain professional tone
- If you cannot answer something, suggest contacting the HR department directly

For document generation requests, respond with the appropriate action marker:
- For salary slip: Include "[GENERATE_SALARY_SLIP]" in your response
- For appraisal letter: Include "[GENERATE_APPRAISAL_LETTER]" in your response`;

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groqClient;
};

const getEmployeeId = (user) => {
  return user.employeeId?.employeeId || 
         user.employeeId?._id || 
         user.employeeId || 
         user._id.toString() || 
         'unknown';
};

const generateSalarySlipPDF = async (user, month = 'current', year = new Date().getFullYear()) => {
  const PDFDocument = (await import('pdfkit')).default;
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
  const PDFDocument = (await import('pdfkit')).default;
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

const getEmployeeContext = async (userId) => {
  try {
    const user = await User.findById(userId).populate('employeeId');
    if (!user) return '';

    let contextParts = [];
    contextParts.push(`Employee Name: ${user.fullName || 'Unknown'}`);
    contextParts.push(`Employee ID: ${getEmployeeId(user)}`);

    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date();
    
    let attendance = await Attendance.find({
      $or: [
        { employeeId: user.employeeId?._id || userId },
        { user: userId },
        { employee: userId }
      ],
      date: { $gte: startDate, $lte: endDate }
    });
    
    if (attendance.length > 0) {
      const present = attendance.filter(a => 
        ['present', 'Present', 'late', 'Late'].includes(a.status)
      ).length;
      contextParts.push(`Attendance This Month: ${present} present out of ${attendance.length} working days`);
    }

    let leaves = await Leave.find({ 
      $or: [
        { employeeId: user.employeeId?._id || userId },
        { user: userId },
        { employee: userId }
      ],
      status: 'approved' 
    });
    
    const usedLeaves = leaves.length;
    const remainingLeaves = 21 - usedLeaves;
    contextParts.push(`Leave Balance: ${remainingLeaves} annual leaves remaining (${usedLeaves} used)`);

    return contextParts.join('\n');
  } catch (error) {
    console.error('Error getting employee context:', error);
    return '';
  }
};

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

    const employeeContext = await getEmployeeContext(userId);
    
    let response = '';
    
    const groq = getGroqClient();
    if (!groq) {
      response = getFallbackResponse(text, user, employeeContext);
    } else {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: HR_CONTEXT
            },
            {
              role: 'system',
              content: `Current Employee Information:\n${employeeContext}`
            },
            {
              role: 'user',
              content: text
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: false
        });

        response = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.';
        
        if (response.includes('[GENERATE_SALARY_SLIP]')) {
          try {
            const fileName = await generateSalarySlipPDF(user);
            response = response.replace('[GENERATE_SALARY_SLIP]', `\n\n✅ Your salary slip is ready! [Download here](/api/bot/download/${fileName})`);
          } catch (err) {
            console.error('Salary slip generation error:', err);
            response = response.replace('[GENERATE_SALARY_SLIP]', '\n\n❌ Failed to generate salary slip. Please try again later.');
          }
        }
        
        if (response.includes('[GENERATE_APPRAISAL_LETTER]')) {
          try {
            const fileName = await generateAppraisalLetterPDF(user);
            response = response.replace('[GENERATE_APPRAISAL_LETTER]', `\n\n✅ Your appraisal letter is ready! [Download here](/api/bot/download/${fileName})`);
          } catch (err) {
            console.error('Appraisal letter generation error:', err);
            response = response.replace('[GENERATE_APPRAISAL_LETTER]', '\n\n❌ Failed to generate appraisal letter. Please try again later.');
          }
        }
      } catch (groqError) {
        console.error('Groq API error:', groqError);
        response = getFallbackResponse(text, user, employeeContext);
      }
    }

    await new Message({
      from: null,
      to: userId,
      text: response,
      fromBot: true
    }).save();

    return { response, intent: 'groq_response' };

  } catch (error) {
    console.error('Bot processing error:', error);
    return { 
      response: 'Sorry, I encountered an unexpected error. Please try again or contact HR support.', 
      intent: 'error' 
    };
  }
};

const getFallbackResponse = (text, user, employeeContext) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
    return `Hello! 👋 I'm your HR Assistant. How can I help you today?\n\nYou can ask me about:\n• **Attendance** or **leave balance**\n• **HR policies** (leave, salary, working hours)\n• **Generate documents** (salary slip, appraisal letter)\n• **Apply for leave** or **update personal details**`;
  }
  
  if (lowerText.includes('leave') && (lowerText.includes('policy') || lowerText.includes('policies'))) {
    return 'Our leave policy allows **21 annual leaves**, **10 sick leaves**, and **5 casual leaves** per year. Unused leaves can be carried forward up to a maximum of 15 days.';
  }
  
  if (lowerText.includes('leave') && (lowerText.includes('balance') || lowerText.includes('remaining') || lowerText.includes('days'))) {
    const match = employeeContext.match(/Leave Balance: (\d+) annual leaves remaining/);
    if (match) {
      return `You have **${match[1]} annual leave days** remaining this year.`;
    }
    return 'I cannot access your leave records right now. Please check your dashboard or contact HR.';
  }
  
  if (lowerText.includes('attendance')) {
    const match = employeeContext.match(/Attendance This Month: (\d+) present out of (\d+)/);
    if (match) {
      return `Your attendance this month: **${match[1]} present** out of ${match[2]} working days.`;
    }
    return 'No attendance records found for this month.';
  }
  
  if (lowerText.includes('salary') && lowerText.includes('slip')) {
    return 'I can generate your salary slip! Please wait while I prepare it... [GENERATE_SALARY_SLIP]';
  }
  
  if (lowerText.includes('appraisal') && lowerText.includes('letter')) {
    return 'I can generate your appraisal letter! Please wait... [GENERATE_APPRAISAL_LETTER]';
  }
  
  if (lowerText.includes('salary') || lowerText.includes('pay')) {
    return 'Salaries are credited on the **1st of every month** to your registered bank account. If the 1st is a holiday, it will be credited on the next working day.';
  }
  
  if (lowerText.includes('working hours') || lowerText.includes('work hours')) {
    return 'Standard working hours are **9:00 AM to 6:00 PM**, Monday to Friday. Flexible hours can be arranged with manager approval.';
  }
  
  if (lowerText.includes('appraisal') || lowerText.includes('performance')) {
    return 'Performance appraisals are conducted **annually in December**. Ratings are based on KPIs, peer reviews, and manager feedback.';
  }
  
  return 'I can help with HR-related questions about:\n• **Leave policies** and balance\n• **Attendance** records\n• **Salary** information\n• **Working hours** and policies\n• **Document generation** (salary slip, appraisal letter)\n\nPlease ask me about any of these topics!';
};

export const processMessage = async (req, res) => {
  const { text, userId } = req.body;

  await new Message({
    from: userId,
    to: userId,
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

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load history' });
  }
};