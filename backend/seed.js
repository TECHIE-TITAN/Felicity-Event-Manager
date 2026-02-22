/**
 * Seed script: Creates the first admin user
 * Run once: node backend/seed.js
 */
require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'felicity' });
  console.log('MongoDB connected');
};

const seed = async () => {
  await connectDB();

  const User = require('./models/User');

  const email = process.env.ADMIN_EMAIL || 'admin@felicity.fest';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@Felicity2024';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(12);
  const password = await bcrypt.hash(plainPassword, salt);

  await User.create({
    email,
    password,
    role: 'admin',
    isEmailVerified: true,
    lastLogin: new Date()
  });

  console.log('✅ Admin user created');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${plainPassword}`);
  console.log('\n⚠️  Change the password after first login!');
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
