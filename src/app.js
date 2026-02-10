const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const errorHandler = require('./middleware/errorMiddleware');
const ApiError = require('./utils/apiError');

const app = express();

// If deployed behind proxies (Render/Heroku/etc.), helps rate limiter + IP-based logic
app.set('trust proxy', 1);

// 1) Security + Parsing
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // basic payload hardening
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// Rate limiting (lightweight bonus hardening)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // 200 requests / 15 minutes / IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Logging
app.use(morgan('dev'));

// 2) Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// 3) Health Check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Mini E-Commerce API is running' });
});

// 4) 404
app.all(/(.*)/, (req, res, next) => {
  next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
});

// 5) Global Error Handler
app.use(errorHandler);

module.exports = app;
