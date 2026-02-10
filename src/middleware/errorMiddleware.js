const ApiError = require('../utils/apiError');

const handleCastErrorDB = (err) => {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
};

const handleDuplicateFieldsDB = (err) => {
  const fields = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
  return new ApiError(400, `Duplicate value for: ${fields}`);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors || {}).map((e) => e.message);
  return new ApiError(400, messages.join(', ') || 'Invalid input data');
};

const handleJWTError = () => new ApiError(401, 'Invalid token. Please log in again.');
const handleJWTExpired = () => new ApiError(401, 'Your token has expired. Please log in again.');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize mongoose + jwt errors
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpired();

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Show stack traces in development AND test
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      name: error.name,
      error,
      stack: error.stack
    });
  }

  // Production: do not leak internals
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong.'
  });
};

module.exports = errorHandler;
