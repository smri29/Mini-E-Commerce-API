const express = require('express');
const { body } = require('express-validator');

const { register, login } = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('name is required')
      .isLength({ min: 2, max: 80 })
      .withMessage('name must be between 2 and 80 characters'),

    body('email')
      .trim()
      .isEmail()
      .withMessage('valid email required')
      .normalizeEmail(),

    // bcrypt has practical 72-byte input limit; cap length to avoid silent truncation risks
    body('password')
      .isLength({ min: 6, max: 72 })
      .withMessage('password must be between 6 and 72 characters'),

    body('role')
      .optional()
      .trim()
      .toLowerCase()
      .isIn(['customer', 'admin'])
      .withMessage('role must be customer or admin'),

    body('adminKey')
      .optional()
      .trim()
      .isString()
      .withMessage('adminKey must be a string')
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('valid email required')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('password required')
  ],
  validate,
  login
);

module.exports = router;
