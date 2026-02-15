require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;
let server;

// Crash early on sync errors
process.on('uncaughtException', (err) => {
  console.error('\nUNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1) Connect DB first
    await connectDB();

    // 2) Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`\nServer running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('\nFailed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

// 3) Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\nUNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);

  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } finally {
        process.exit(1);
      }
    });
  } else {
    process.exit(1);
  }
});

// 4) Graceful shutdown signals
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing server gracefully...`);

  try {
    if (server) {
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('HTTP server and MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing MongoDB connection:', err.message);
          process.exit(1);
        }
      });
    } else {
      await mongoose.connection.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('Graceful shutdown failed:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
