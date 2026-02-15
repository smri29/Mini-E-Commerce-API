const User = require('../models/User');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const resolveJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Safety fallback for test runtime only
  if (process.env.NODE_ENV === 'test') return 'test_jwt_secret_123';

  throw new ApiError(500, 'Server configuration error: JWT_SECRET is missing');
};

const signToken = (id) => {
  return jwt.sign(
    { id: id.toString() },
    resolveJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, adminKey } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Please provide name, email, and password');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedName = String(name).trim();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    throw new ApiError(400, 'User already exists');
  }

  // Prevent role escalation
  let finalRole = 'customer';
  const requestedRole = role ? String(role).toLowerCase().trim() : 'customer';

  if (requestedRole === 'admin') {
    const keyFromHeader = req.headers['x-admin-signup-key'];
    const providedKey = adminKey || keyFromHeader;

    if (!process.env.ADMIN_SIGNUP_KEY) {
      throw new ApiError(403, 'Admin registration is disabled');
    }
    if (!providedKey || providedKey !== process.env.ADMIN_SIGNUP_KEY) {
      throw new ApiError(403, 'Invalid admin signup key');
    }

    finalRole = 'admin';
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
    role: finalRole
  });

  const token = signToken(user._id);
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    token,
    data: { user }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  if (user.isBlocked) {
    throw new ApiError(
      403,
      'Your account has been suspended due to suspicious activity. Please contact support.'
    );
  }

  const token = signToken(user._id);
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: { user }
  });
});
