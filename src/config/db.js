const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Some safer defaults
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
