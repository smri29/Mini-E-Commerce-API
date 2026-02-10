const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Not authorized to access this route'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user (exclude password by default; password is select:false anyway)
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    // CRITICAL: block enforcement must happen here (not only at login)
    if (user.isBlocked) {
      return next(new ApiError(403, 'Account suspended due to suspicious activity'));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Not authorized to access this route'));
  }
});

module.exports = { protect };
