import express from 'express';
import { body, validationResult } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Public routes
router.post('/login', loginValidation, authController.login);
router.post('/register', registerValidation, authController.register);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.put('/reset-password/:resetToken', resetPasswordValidation, authController.resetPassword);

// Protected routes
router.use(protect); // All routes below this middleware are protected

// Employee profile endpoints
router.get('/me', authController.getMe);  // NEW: Get current employee's profile
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', changePasswordValidation, authController.changePassword);
router.post('/logout', authController.logout);
router.delete('/delete-account', authController.deleteAccount);

// Admin only routes
router.get('/users', authController.getAllUsers); // Admin can view all users
router.put('/users/:id/status', authController.updateUserStatus); // Admin can activate/deactivate users
router.put('/users/:id/unlock', authController.unlockAccount); // Admin can unlock locked accounts

export default router;
