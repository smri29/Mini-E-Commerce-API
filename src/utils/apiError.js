class ApiError extends Error {
  constructor(statusCode, message) {
    super(message || 'Something went wrong');
    this.name = 'ApiError';
    this.statusCode = statusCode || 500;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
