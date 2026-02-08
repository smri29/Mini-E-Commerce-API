class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Identifies operational errors vs programming bugs

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ApiError;