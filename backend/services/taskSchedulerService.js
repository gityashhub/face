import cron from 'node-cron';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { sendTaskStatusEmail } from './emailService.js';

let scheduledJobs = [];

const startTaskStatusScheduler = async () => {
  try {
    // Schedule jobs at 12:05 PM, 12:10 PM, and 12:15 PM IST
    // IST is UTC+5:30, so we calculate the cron times accordingly
    // For 12:05 PM IST = 06:35 UTC (in standard IST offset)
    // For 12:10 PM IST = 06:40 UTC
    // For 12:15 PM IST = 06:45 UTC

    const scheduleTimes = [
      { time: '5 12 * * *', name: '12:05 PM IST' }, // 12:05 PM IST
      { time: '10 12 * * *', name: '12:10 PM IST' }, // 12:10 PM IST
      { time: '15 12 * * *', name: '12:15 PM IST' } // 12:15 PM IST
    ];

    for (const schedule of scheduleTimes) {
      const job = cron.schedule(schedule.time, async () => {
        console.log(`\n🔔 Task Status Report scheduled job started at ${schedule.name}`);
        await sendTaskStatusReports();
      });

      scheduledJobs.push(job);
      console.log(`✅ Scheduled task status report job at ${schedule.name}`);
    }

    console.log('✅ Task status scheduler initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize task status scheduler:', error.message);
    return false;
  }
};

const sendTaskStatusReports = async () => {
  try {
    console.log('📧 Starting task status report generation...');

    // Get all employees with their tasks
    const employees = await Employee.find({ isActive: true })
      .populate('workInfo.department')
      .lean();

    if (!employees || employees.length === 0) {
      console.log('ℹ️  No active employees found');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Send email for each employee with their tasks
    for (const employee of employees) {
      try {
        const tasks = await Task.find({ assignedTo: employee._id })
          .select('description status priority dueDate estimatedHours actualHours')
          .lean();

        // Send email regardless of task count (even if no tasks, send report)
        const emailSent = await sendTaskStatusEmail(employee, tasks);
        if (emailSent) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing employee ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}:`,
          error.message
        );
        failureCount++;
      }
    }

    console.log(
      `✅ Task status reports completed. Success: ${successCount}, Failed: ${failureCount} (Total Employees: ${employees.length})`
    );

    // Log summary
    if (successCount > 0) {
      console.log(`📊 ${successCount} task status emails sent successfully`);
    }
    if (failureCount > 0) {
      console.log(`⚠️  ${failureCount} task status emails failed to send`);
    }
  } catch (error) {
    console.error('❌ Error in task status report generation:', error.message);
  }
};

const stopTaskStatusScheduler = () => {
  try {
    for (const job of scheduledJobs) {
      job.stop();
    }
    scheduledJobs = [];
    console.log('✅ Task status scheduler stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop task status scheduler:', error.message);
    return false;
  }
};

const getSchedulerStatus = () => {
  return {
    isRunning: scheduledJobs.length > 0,
    jobCount: scheduledJobs.length,
    scheduledTimes: ['12:05 PM IST', '12:10 PM IST', '12:15 PM IST'],
    recipient: 'tarunatechnology@gmail.com'
  };
};

export { startTaskStatusScheduler, sendTaskStatusReports, stopTaskStatusScheduler, getSchedulerStatus };
