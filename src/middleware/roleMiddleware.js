const ApiError = require('../utils/apiError');

const authorize = (...roles) => {
  const allowedRoles = roles.map((r) => String(r).toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    const userRole = String(req.user.role || '').toLowerCase().trim();

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    return next();
  };
};

module.exports = authorize;
