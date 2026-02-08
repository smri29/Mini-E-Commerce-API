const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Development: Send full stack trace
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        // Production: Send clean message
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }
};

module.exports = errorHandler;