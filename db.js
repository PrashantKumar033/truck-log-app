// db.js
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Path for your database file
const adapter = new JSONFile('db.json')
const db = new Low(adapter, { entries: [], users: [] })

// Initialize DB
async function initDB() {
  await db.read()
  // If db.json is empty, set defaults
  db.data ||= { entries: [], users: [] }
  
  // Add default users if none exist
  if (!db.data.users || db.data.users.length === 0) {
    db.data.users = [
      { id: "user1", username: "admin", password: "admin123", name: "Admin User" },
      { id: "user2", username: "driver1", password: "driver123", name: "Driver 1" },
      { id: "user3", username: "driver2", password: "driver123", name: "Driver 2" }
    ];
  }
  
  await db.write()
}

await initDB()

export default db