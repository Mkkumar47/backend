require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');

const seed = async () => {
  await mongoose.connect('mongodb+srv://hostelhub_admin:hcEwICNDZ2FZSTyY@hostelhub-cluster.w7uoawk.mongodb.net/?appName=hostelhub-cluster');
  console.log('Connected. Seeding...');

  await User.deleteMany({});
  await Room.deleteMany({});

  const admin = await User.create({
    name: 'Admin User', email: 'admin@hostelhub.com', mobile: '9999999999',
    password: 'Admin@1234', role: 'admin', isVerified: true
  });
  const reception = await User.create({
    name: 'Reception', email: 'reception@hostelhub.com', mobile: '9999999998',
    password: 'Recep@1234', role: 'reception', isVerified: true
  });
  const customer = await User.create({
    name: 'Test Customer', email: 'customer@hostelhub.com', mobile: '9999999997',
    password: 'Cust@1234', role: 'customer', isVerified: true
  });

  const sample = (overrides) => ({
    title: 'Cozy Room',
    description: 'A clean, comfortable room with all basic amenities.',
    hostelName: 'Sunshine Hostel',
    location: { address: '12 MG Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    category: '1-bed', ac: true, foodIncluded: false,
    pricing: { daily: 800, weekly: 5000, monthly: 18000 },
    totalUnits: 5, occupiedUnits: 0,
    amenities: ['Wi-Fi', 'Hot Water', 'Laundry', 'Daily Cleaning'],
    images: [{ url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200', public_id: 'demo1' }],
    owner: admin._id,
    ...overrides
  });

  await Room.insertMany([
    sample({ title: 'Private Single AC', category: '1-bed', ac: true, pricing: { daily: 900, weekly: 5500, monthly: 19000 } }),
    sample({ title: 'Shared Double Non-AC', category: '2-bed', ac: false, pricing: { daily: 600, weekly: 3800, monthly: 14000 } }),
    sample({ title: 'Triple Sharing AC + Food', category: '3-bed', ac: true, foodIncluded: true,
      pricing: { daily: 1200, weekly: 7500, monthly: 26000 }, hostelName: 'Royal Stay', location: { city: 'Bengaluru', state: 'Karnataka' } }),
    sample({ title: 'Deluxe Single Room', category: '1-bed', ac: true, pricing: { daily: 1500, weekly: 9000, monthly: 32000 }, hostelName: 'Comfort Inn', location: { city: 'Mumbai', state: 'Maharashtra' } }),
    sample({ title: 'Budget Double Sharing', category: '2-bed', ac: false, pricing: { daily: 450, weekly: 2800, monthly: 9500 }, hostelName: 'Backpackers Lodge', location: { city: 'Pune', state: 'Maharashtra' } }),
    sample({ title: 'Family Triple Room', category: '3-bed', ac: true, foodIncluded: true,
      pricing: { daily: 1800, weekly: 11000, monthly: 38000 }, hostelName: 'Heritage Stay', location: { city: 'Jaipur', state: 'Rajasthan' } })
  ]);

  console.log('✅ Seeded users:');
  console.log('   admin@hostelhub.com / Admin@1234');
  console.log('   reception@hostelhub.com / Recep@1234');
  console.log('   customer@hostelhub.com / Cust@1234');
  console.log('✅ Seeded 6 rooms');
  process.exit(0);
};

seed().catch((e) => { console.error(e); process.exit(1); });
