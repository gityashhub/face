// routes/taskRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  updateProgress,
  changeStatus,
  getTaskStats,
  toggleSubtask
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';

const router = express.Router();

// Validation middleware for task creation

const taskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })  // Changed from min: 3 to min: 1
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })  // Changed from min: 10 to min: 1
    .withMessage('Description must be between 1 and 1000 characters'),
  body('assignedTo')
    .isMongoId()
    .withMessage('Please provide a valid employee ID'),
  body('priority')
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Priority must be Low, Medium, High, or Critical'),
  body('dueDate')
    .isISO8601()
    .withMessage('Please provide a valid due date'),
  body('category')
    .isIn(['Development', 'Design', 'Testing', 'Documentation', 'Research', 'Bug Fix', 'Feature', 'Maintenance', 'Other'])
    .withMessage('Please select a valid category'),
  body('estimatedHours')
    .isNumeric()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000')
];

const commentValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
];

const progressValidation = [
  body('progress')
    .isNumeric()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
];

const statusValidation = [
  body('status')
    .isIn(['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'])
    .withMessage('Invalid status')
];

// Apply auth middleware to all routes
router.use(protect);
// Employees must belong to Developer or Designing to access task module
router.use(requireDepartment(['developer', 'development', 'design', 'designing']));

// Routes
router.route('/')
  .get(getTasks)
  .post(taskValidation, createTask);

router.get('/stats', getTaskStats);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/comments', commentValidation, addComment);
router.put('/:id/progress', progressValidation, updateProgress);
router.put('/:id/status', statusValidation, changeStatus);
router.put('/:id/subtasks/:subtaskId', toggleSubtask);

export default router;