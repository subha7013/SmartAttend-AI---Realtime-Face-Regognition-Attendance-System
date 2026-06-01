require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database connected!');

    const email = 'admin@smartattend.com';
    const existingAdmin = await User.findOne({ email, role: 'admin' });

    if (existingAdmin) {
      console.log(`Admin account with email "${email}" already exists. Skipping seed.`);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Administrator',
      email: email,
      password: 'admin123', // Will be hashed automatically by pre-save hooks
      role: 'admin',
    });

    console.log('------------------------------------------------');
    console.log('Admin account created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log('Password: admin123');
    console.log('------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Seeding admin failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
