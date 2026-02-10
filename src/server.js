require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Crash early on sync errors
process.on('uncaughtException', (err) => {
  console.log('\n UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// 1) Connect to DB
connectDB();

// 2) Start Server
const server = app.listen(PORT, () => {
  console.log(`\n Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// 3) Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  console.log('\n UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});
