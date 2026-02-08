const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorMiddleware');
const ApiError = require('./utils/apiError');

const app = express();

// 1. Global Middleware
app.use(helmet()); // Set security HTTP headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logger

// 2. Routes (We will import these properly in the next steps)
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/products', require('./routes/productRoutes'));
// app.use('/api/cart', require('./routes/cartRoutes'));
// app.use('/api/orders', require('./routes/orderRoutes'));

// 3. Health Check Route (To test if server is running)
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Mini E-Commerce API is running' });
});

// 4. Handle Unhandled Routes (404)
// FIXED: specific wildcard matching for newer Express versions
app.all(/(.*)/, (req, res, next) => {
    next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
});

// 5. Global Error Handler
app.use(errorHandler);

module.exports = app;