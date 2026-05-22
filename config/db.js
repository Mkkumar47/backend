const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = 'mongodb+srv://hostelhub_admin:hcEwICNDZ2FZSTyY@hostelhub-cluster.w7uoawk.mongodb.net/?appName=hostelhub-cluster';
    if (!uri) throw new Error('MONGODB_URI not defined');
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
