const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
    console.error('MongoDB connection error: MONGO_URI is not set.');
    console.error('Set MONGO_URI (or MONGODB_URI / DATABASE_URL) in Render environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
