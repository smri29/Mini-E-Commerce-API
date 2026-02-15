const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const errorHandler = require('./middleware/errorMiddleware');
const ApiError = require('./utils/apiError');

const app = express();

// If deployed behind proxies (Render/Heroku/Nginx), helps IP-based middlewares
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 1) Security + Parsing
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients / Postman (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// 2) Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts, please try again later.'
  }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// 3) Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4) Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// 5) Health checks
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Mini E-Commerce API is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', uptime: process.uptime() });
});

// 6) 404 handler
app.all('*', (req, res, next) => {
  next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
});

// 7) Global error handler
app.use(errorHandler);

module.exports = app;
