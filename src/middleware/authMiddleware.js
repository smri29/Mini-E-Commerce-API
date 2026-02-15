const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

const extractBearerToken = (authorizationHeader = '') => {
  // Supports: "Bearer <token>" (case-insensitive for Bearer)
  const parts = authorizationHeader.trim().split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(new ApiError(401, 'Not authorized to access this route'));
  }

  if (!process.env.JWT_SECRET) {
    return next(new ApiError(500, 'JWT secret is not configured'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // password is select:false by default, no need to exclude explicitly
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    // Enforce account block status for every protected request
    if (user.isBlocked) {
      return next(new ApiError(403, 'Account suspended due to suspicious activity'));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Not authorized to access this route'));
  }
});

module.exports = { protect };
