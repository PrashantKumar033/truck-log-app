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
const db = new Low(new JSONFile("db.json"), { entries: [], users: [], sessions: [], transports: [] });
await db.read();

// Ensure all required arrays exist
if (!db.data) {
  db.data = { entries: [], users: [], sessions: [], transports: [] };
}
if (!db.data.entries) db.data.entries = [];
if (!db.data.users) db.data.users = [];
if (!db.data.sessions) db.data.sessions = [];
if (!db.data.transports) db.data.transports = [];

// No demo users - clean start

await db.write();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Authentication middleware
function requireAuth(req, res, next) {
  console.log(`Auth check for ${req.method} ${req.path}`);
  const sessionId = req.headers['x-session-id'];
  console.log('Session ID:', sessionId);
  
  if (!sessionId) {
    console.log('No session ID provided');
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const session = db.data.sessions.find(s => s.id === sessionId);
  if (!session) {
    console.log('Invalid session:', sessionId);
    return res.status(401).json({ error: "Invalid session" });
  }
  
  const user = db.data.users.find(u => u.id === session.userId);
  if (!user) {
    console.log('User not found for session:', session.userId);
    return res.status(401).json({ error: "User not found" });
  }
  
  console.log('Auth successful for user:', user.username);
  req.user = user;
  req.sessionId = sessionId;
  next();
}

// Authentication endpoints
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt: ${username}`);
    
    const user = db.data.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      const sessionId = nanoid();
      const session = { id: sessionId, userId: user.id, createdAt: new Date() };
      db.data.sessions.push(session);
      await db.write();
      
      res.json({ sessionId, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  
  if (db.data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }
  
  const user = { id: nanoid(), username, password, role: "driver" };
  db.data.users.push(user);
  await db.write();
  
  res.json({ message: "Account created successfully" });
});

app.post("/api/logout", async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  db.data.sessions = db.data.sessions.filter(s => s.id !== sessionId);
  await db.write();
  res.json({ message: "Logged out successfully" });
});

// Transport endpoints
app.get("/api/transports", requireAuth, async (req, res) => {
  try {
    console.log('Fetching transports for user:', req.user.username);
    console.log('Total transports in DB:', db.data.transports.length);
    res.json(db.data.transports);
  } catch (error) {
    console.error('Error fetching transports:', error);
    res.status(500).json({ error: "Failed to fetch transports" });
  }
});

app.post("/api/transports", requireAuth, async (req, res) => {
  try {
    console.log('Transport creation request:', req.body);
    const { name, location, dieselRate, transportRate, labourCost } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Transport name is required" });
    }
    
    const transport = { 
      id: nanoid(), 
      name: name.trim(), 
      location: location ? location.trim() : '', 
      dieselRate: Number(dieselRate || 0), 
      transportRate: Number(transportRate || 0), 
      labourCost: Number(labourCost || 0) 
    };
    
    db.data.transports.push(transport);
    await db.write();
    console.log('Transport created successfully:', transport);
    res.json(transport);
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ error: "Failed to create transport" });
  }
});

app.put("/api/transports/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, dieselRate, transportRate, labourCost } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Transport name is required" });
    }
    
    const transportIndex = db.data.transports.findIndex(t => t.id === id);
    if (transportIndex === -1) {
      return res.status(404).json({ error: "Transport not found" });
    }
    
    db.data.transports[transportIndex] = {
      ...db.data.transports[transportIndex],
      name: name.trim(),
      location: location ? location.trim() : '',
      dieselRate: Number(dieselRate || 0),
      transportRate: Number(transportRate || 0),
      labourCost: Number(labourCost || 0)
    };
    
    await db.write();
    console.log('Transport updated successfully:', db.data.transports[transportIndex]);
    res.json(db.data.transports[transportIndex]);
  } catch (error) {
    console.error('Error updating transport:', error);
    res.status(500).json({ error: "Failed to update transport" });
  }
});

app.delete("/api/transports/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = db.data.transports.length;
    db.data.transports = db.data.transports.filter(t => t.id !== id);
    
    if (db.data.transports.length === initialLength) {
      return res.status(404).json({ error: "Transport not found" });
    }
    
    await db.write();
    console.log('Transport deleted successfully');
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting transport:', error);
    res.status(500).json({ error: "Failed to delete transport" });
  }
});

// Entry endpoints
app.get("/api/entries", requireAuth, async (req, res) => {
  let { from, to } = req.query;
  let entries = db.data.entries;
  if (from && to) {
    entries = entries.filter(e => e.date >= from && e.date <= to);
  }
  res.json(entries);
});

app.post("/api/entries", requireAuth, async (req, res) => {
  const { date, truckNo, transportName, loadLocation, dieselLiters, amountPaid, labourCost, notes } = req.body;
  const entry = { 
    id: nanoid(), 
    date, 
    truckNo, 
    transportName, 
    loadLocation, 
    dieselLiters: Number(dieselLiters), 
    amountPaid: Number(amountPaid), 
    labourCost: Number(labourCost || 0), 
    notes 
  };
  db.data.entries.push(entry);
  await db.write();
  res.json(entry);
});

app.get("/api/entries/month/:ym", requireAuth, async (req, res) => {
  const [year, month] = req.params.ym.split("-").map(Number);
  const entries = db.data.entries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });
  res.json(entries);
});

app.get("/api/entries/summary", requireAuth, async (req, res) => {
  const { from, to } = req.query;
  let entries = db.data.entries;
  if (from && to) entries = entries.filter(e => e.date >= from && e.date <= to);

  const totalDiesel = entries.reduce((sum, e) => sum + e.dieselLiters, 0);
  const totalAmount = entries.reduce((sum, e) => sum + e.amountPaid, 0);

  res.json({ count: entries.length, totalDiesel, totalAmount });
});

app.delete("/api/entries/:id", requireAuth, async (req, res) => {
  db.data.entries = db.data.entries.filter(e => e.id !== req.params.id);
  await db.write();
  res.sendStatus(204);
});

// Test endpoints
app.get("/api/test-transports", (req, res) => {
  res.json({ 
    message: "Transport endpoint test", 
    transports: db.data.transports,
    count: db.data.transports.length 
  });
});

// Serve main app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚚 Truck log app running at http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('- POST /api/login');
  console.log('- POST /api/signup');
  console.log('- POST /api/logout');
  console.log('- GET /api/transports (auth required)');
  console.log('- POST /api/transports (auth required)');
  console.log('- PUT /api/transports/:id (auth required)');
  console.log('- DELETE /api/transports/:id (auth required)');
  console.log('- GET /api/entries (auth required)');
  console.log('- POST /api/entries (auth required)');
  console.log('Database initialized with:');
  console.log(`  - ${db.data.entries.length} entries`);
  console.log(`  - ${db.data.users.length} users`);
  console.log(`  - ${db.data.transports.length} transports`);
});