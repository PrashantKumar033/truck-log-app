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

// Database setup with error handling
let db;
try {
  db = new Low(new JSONFile("db.json"), { entries: [], users: [] });
  await db.read();
  db.data ||= { entries: [], users: [] };
  await db.write();
} catch (error) {
  console.error("Database initialization failed:", error);
  process.exit(1);
}

// Simple session storage
const sessions = new Map();

// Default users
if (!db.data.users || db.data.users.length === 0) {
  db.data.users = [
    { id: "user1", username: "admin", password: "admin123", name: "Admin User" },
    { id: "user2", username: "driver1", password: "driver123", name: "Driver 1" },
    { id: "user3", username: "driver2", password: "driver123", name: "Driver 2" }
  ];
  await db.write();
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper function to sanitize input
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '');
}

// Authentication middleware
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.user = sessions.get(sessionId);
  next();
}

// Signup route
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    // Check if username already exists
    const existingUser = db.data.users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    const newUser = {
      id: nanoid(),
      username: sanitizeInput(username),
      password: password, // In production, hash this!
      name: sanitizeInput(name)
    };
    
    db.data.users.push(newUser);
    await db.write();
    
    res.json({ message: "User created successfully", user: { id: newUser.id, username: newUser.username, name: newUser.name } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.data.users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const sessionId = nanoid();
    sessions.set(sessionId, { id: user.id, username: user.username, name: user.name });
    
    res.json({ sessionId, user: { id: user.id, username: user.username, name: user.name } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout route
app.post("/api/logout", (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ message: "Logged out successfully" });
});

// Create entry
app.post("/api/entries", requireAuth, async (req, res) => {
  try {
    const { date, truckNo, loadLocation, dieselLiters, amountPaid, notes } = req.body;
    
    // Basic validation
    if (!date || !truckNo || !loadLocation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const entry = {
      id: nanoid(),
      userId: req.user.id,
      date: sanitizeInput(date),
      truckNo: sanitizeInput(truckNo),
      loadLocation: sanitizeInput(loadLocation),
      dieselLiters: Number(dieselLiters) || 0,
      amountPaid: Number(amountPaid) || 0,
      notes: sanitizeInput(notes) || ""
    };

    db.data.entries.push(entry);
    await db.write();
    res.json(entry);
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// List entries
app.get("/api/entries", requireAuth, async (req, res) => {
  try {
    let { from, to } = req.query;
    let entries = db.data.entries.filter(e => e.userId === req.user.id);
    
    if (from && to) {
      entries = entries.filter(e => e.date >= from && e.date <= to);
    }
    
    res.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// Month-wise entries
app.get("/api/entries/month/:ym", requireAuth, async (req, res) => {
  try {
    const [year, month] = req.params.ym.split("-").map(Number);
    const entries = db.data.entries.filter(e => {
      const d = new Date(e.date);
      return e.userId === req.user.id && d.getFullYear() === year && (d.getMonth() + 1) === month;
    });
    res.json(entries);
  } catch (error) {
    console.error("Error fetching monthly entries:", error);
    res.status(500).json({ error: "Failed to fetch monthly entries" });
  }
});

// Summary
app.get("/api/entries/summary", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let entries = db.data.entries.filter(e => e.userId === req.user.id);
    
    if (from && to) {
      entries = entries.filter(e => e.date >= from && e.date <= to);
    }

    const totalDiesel = entries.reduce((sum, e) => sum + (e.dieselLiters || 0), 0);
    const totalAmount = entries.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

    res.json({ count: entries.length, totalDiesel, totalAmount });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Update entry
app.put("/api/entries/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, truckNo, loadLocation, dieselLiters, amountPaid, notes } = req.body;
    
    const entryIndex = db.data.entries.findIndex(e => e.id === id && e.userId === req.user.id);
    if (entryIndex === -1) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    db.data.entries[entryIndex] = {
      ...db.data.entries[entryIndex],
      date: sanitizeInput(date),
      truckNo: sanitizeInput(truckNo),
      loadLocation: sanitizeInput(loadLocation),
      dieselLiters: Number(dieselLiters) || 0,
      amountPaid: Number(amountPaid) || 0,
      notes: sanitizeInput(notes) || ""
    };
    
    await db.write();
    res.json(db.data.entries[entryIndex]);
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// Delete entry
app.delete("/api/entries/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = db.data.entries.length;
    db.data.entries = db.data.entries.filter(e => e.id !== id || e.userId !== req.user.id);
    
    if (db.data.entries.length === initialLength) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    await db.write();
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

app.listen(PORT, () => {
  console.log(`🚚 Truck log app running at http://localhost:${PORT}`);
  console.log(`📊 Database initialized with ${db.data.entries.length} entries`);
});