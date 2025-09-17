import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Entry from './models/Entry.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
console.log(`Server will run on port ${PORT}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/truck-log';
mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error', err));

// API routes
app.post('/api/entries', async (req, res) => {
  try {
    const { date, truckNo, loadLocation, dieselLiters, amountPaid, notes } = req.body;
    const entry = new Entry({ date, truckNo, loadLocation, dieselLiters: Number(dieselLiters), amountPaid: Number(amountPaid), notes });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entries', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // Include full day
      filter.date = { $gte: fromDate, $lte: toDate };
    }
    const entries = await Entry.find(filter).sort({ date: -1 }).exec();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entries/month/:ym', async (req, res) => {
  try {
    const [year, month] = req.params.ym.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // Last day of month
    end.setHours(23, 59, 59, 999);
    const entries = await Entry.find({ date: { $gte: start, $lte: end } }).sort({ date: -1 }).exec();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entries/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      match.date = { $gte: fromDate, $lte: toDate };
    }
    const entries = await Entry.find(match).exec();
    const totalDiesel = entries.reduce((s, e) => s + (e.dieselLiters || 0), 0);
    const totalAmount = entries.reduce((s, e) => s + (e.amountPaid || 0), 0);
    res.json({ count: entries.length, totalDiesel, totalAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve client in production (if built into /client/dist)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(clientIndex);
  });
}

app.listen(PORT, () => {
  console.log(`🚚 Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/entries`);
});
