import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Entry from '../models/Entry.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/truck-log';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const file = path.join(process.cwd(), 'db.json');
    if (!fs.existsSync(file)) {
      console.error('db.json not found at', file);
      process.exit(1);
    }
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.entries)) {
      console.error('db.json does not contain entries array');
      process.exit(1);
    }

    for (const e of data.entries) {
      // ensure date is a Date object
      const entry = new Entry({
        date: new Date(e.date),
        truckNo: e.truckNo,
        loadLocation: e.loadLocation,
        dieselLiters: Number(e.dieselLiters || 0),
        amountPaid: Number(e.amountPaid || 0),
        notes: e.notes
      });
      await entry.save();
      console.log('Imported', entry._id.toString());
    }
    console.log('Migration finished');
    process.exit(0);
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
}

migrate();
