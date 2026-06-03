/**
 * Seeder
 * Fetches dataset from test server → validates → sanitizes → persists to MongoDB Atlas
 *
 * Usage:
 *   node src/utils/seeder.js                       # auto auth (E0123019 / 910131)
 *   node src/utils/seeder.js --token=<jwt_token>   # use token directly, skip auth
 *   node src/utils/seeder.js --use-local           # force local fallback dataset
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { syncDataset } = require('../services/dataset.service');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const tokenArg = process.argv.find(a => a.startsWith('--token='));
  const manualToken = tokenArg ? tokenArg.split('=').slice(1).join('=') : undefined;
  const useLocal = process.argv.includes('--use-local');
  if (useLocal) {
    process.env.DATASET_FORCE_LOCAL = 'true';
    console.log('Using local fallback dataset (--use-local)\n');
  }
  if (manualToken) console.log('Using provided token:', manualToken.substring(0, 40) + '...\n');

  try {
    const { stats } = await syncDataset(manualToken);

    // Create only the 3 required users — NO manual data
    await User.deleteMany({});
    await new User({ name: 'Admin User',        email: 'admin@test.com',         password: 'admin123',   role: 'admin' }).save();
    await new User({ name: 'Placement Officer', email: 'officer@test.com',       password: 'officer123', role: 'placement_officer' }).save();
    await new User({ name: 'ASHIKA S',          email: 'e0123019@sriher.edu.in', password: '910131',     role: 'student' }).save();

    console.log('\n🎉 Seeding complete!');
    console.log('   Students    :', stats.students.inserted,     '/', stats.students.total,     `(${stats.students.invalid} invalid)`);
    console.log('   Companies   :', stats.companies.inserted,    '/', stats.companies.total,    `(${stats.companies.invalid} invalid)`);
    console.log('   Drives      :', stats.drives.inserted,       '/', stats.drives.total,       `(${stats.drives.invalid} invalid)`);
    console.log('   Applications:', stats.applications.inserted, '/', stats.applications.total, `(${stats.applications.invalid} invalid)`);
    console.log('\n   Login: admin@test.com / admin123');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }

  await mongoose.disconnect();
}

run();
