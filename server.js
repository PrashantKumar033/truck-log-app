import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Low(new JSONFile("db.json"), { entries: [] });
await db.read();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Create entry
app.post("/api/entries", async (req, res) => {
  const { date, truckNo, loadLocation, dieselLiters, amountPaid, notes } = req.body;
  const entry = { id: nanoid(), date, truckNo, loadLocation, dieselLiters: Number(dieselLiters), amountPaid: Number(amountPaid), notes };
  db.data.entries.push(entry);
  await db.write();
  res.json(entry);
});

// List entries (all or by date range)
app.get("/api/entries", async (req, res) => {
  let { from, to } = req.query;
  let entries = db.data.entries;
  if (from && to) {
    entries = entries.filter(e => e.date >= from && e.date <= to);
  }
  res.json(entries);
});

// Month-wise entries
app.get("/api/entries/month/:ym", async (req, res) => {
  const [year, month] = req.params.ym.split("-").map(Number);
  const entries = db.data.entries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });
  res.json(entries);
});

// Summary
app.get("/api/entries/summary", async (req, res) => {
  const { from, to } = req.query;
  let entries = db.data.entries;
  if (from && to) entries = entries.filter(e => e.date >= from && e.date <= to);

  const totalDiesel = entries.reduce((sum, e) => sum + e.dieselLiters, 0);
  const totalAmount = entries.reduce((sum, e) => sum + e.amountPaid, 0);

  res.json({ count: entries.length, totalDiesel, totalAmount });
});

// Delete entry
app.delete("/api/entries/:id", async (req, res) => {
  db.data.entries = db.data.entries.filter(e => e.id !== req.params.id);
  await db.write();
  res.sendStatus(204);
});

app.listen(PORT, () => console.log(`🚚 Truck log app running at http://localhost:${PORT}`));
