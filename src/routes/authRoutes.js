const express = require('express');
const { body } = require('express-validator');

const { register, login } = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('name is required').isLength({ min: 2 }).withMessage('name too short'),
    body('email').isEmail().withMessage('valid email required'),
    body('password').isLength({ min: 6 }).withMessage('password must be at least 6 chars'),
    body('role').optional().isIn(['customer', 'admin']).withMessage('role must be customer or admin'),
    body('adminKey').optional().isString().withMessage('adminKey must be a string')
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('valid email required'),
    body('password').notEmpty().withMessage('password required')
  ],
  validate,
  login
);

module.exports = router;
