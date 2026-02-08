const User = require('../models/User');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// Helper: Generate JWT Token
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d' // Token valid for 30 days
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ApiError(400, 'User already exists');
    }

    // Create User
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'customer' // Default to customer if not specified
    });

    // Send Token
    const token = signToken(user._id);

    // Remove password from output
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

    // 1. Check if email and password exist
    if (!email || !password) {
        throw new ApiError(400, 'Please provide email and password');
    }

    // 2. Check if user exists & password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        throw new ApiError(401, 'Incorrect email or password');
    }

    // 3. 🛡️ Fraud Check: Deny access if user is blocked
    if (user.isBlocked) {
        throw new ApiError(403, 'Your account has been suspended due to suspicious activity. Please contact support.');
    }

    // 4. Send Token
    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
        status: 'success',
        token,
        data: { user }
    });
});