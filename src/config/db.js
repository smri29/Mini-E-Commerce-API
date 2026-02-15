const mongoose = require('mongoose');

let listenersAttached = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment variables');
    }

    mongoose.set('strictQuery', true);

    // Reuse existing connection (helpful in tests/hot-reload scenarios)
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== 'production'
    });

    if (!listenersAttached) {
      mongoose.connection.on('error', (err) => {
        console.error('\nMongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('\nMongoDB disconnected');
      });

      listenersAttached = true;
    }

    console.log(`\nMongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\nDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
