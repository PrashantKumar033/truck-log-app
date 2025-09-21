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
  
  // No default users - clean start
  
  await db.write()
}

await initDB()

export default db