const ApiError = require('../utils/apiError');

const handleCastErrorDB = (err) => {
  const path = err.path || 'field';
  const value = err.value;
  return new ApiError(400, `Invalid ${path}: ${value}`);
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
  // Normalize unknown throws (string/object/etc.)
  let error =
    err instanceof Error
      ? err
      : new ApiError(500, typeof err === 'string' ? err : 'Something went wrong');

  // Map common DB/Auth errors to operational ApiError
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpired();

  const statusCode = error.statusCode || 500;
  const status = error.status || (String(statusCode).startsWith('4') ? 'fail' : 'error');
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  if (isDevOrTest) {
    return res.status(statusCode).json({
      status,
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }

  // Production behavior
  if (error.isOperational) {
    return res.status(statusCode).json({
      status,
      message: error.message
    });
  }

  // Log unknown/internal errors server-side only
  console.error('UNEXPECTED_ERROR:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong.'
  });
};

module.exports = errorHandler;
