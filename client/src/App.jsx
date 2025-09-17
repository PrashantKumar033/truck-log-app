import React, { useEffect, useState } from 'react'
import EntryForm from './components/EntryForm'
import EntriesTable from './components/EntriesTable'

const API = '/api/entries'

export default function App() {
  const [entries, setEntries] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [month, setMonth] = useState('')
  const [summary, setSummary] = useState(null)

  async function loadEntries() {
    let url = API
    if (from && to) url += `?from=${from}&to=${to}`
    const res = await fetch(url)
    const data = await res.json()
    setEntries(data)
    if (from && to) loadSummary(from, to)
  }

  async function loadMonth() {
    if (!month) return
    const res = await fetch(`${API}/month/${month}`)
    const data = await res.json()
    setEntries(data)
    // compute summary for month
    const [y, m] = month.split('-')
    const lastDay = new Date(y, m, 0).getDate()
    const fromDate = `${y}-${m.padStart(2, '0')}-01`
    const toDate = `${y}-${m.padStart(2, '0')}-${lastDay}`
    loadSummary(fromDate, toDate)
  }

  async function loadSummary(fromDate, toDate) {
    const r = await fetch(`${API}/summary?from=${fromDate}&to=${toDate}`)
    const s = await r.json()
    setSummary(s)
  }

  useEffect(() => { loadEntries() }, [])

  return (
    <div className="container">
      <h1>🚚 Truck Log (MERN)</h1>

      <div className="card">
        <EntryForm onSaved={loadEntries} />
      </div>

      <div className="card">
        <h3>Filters / Load</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px' }}>
            <label>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button onClick={loadEntries}>Load Entries</button>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button onClick={loadMonth}>Load Month</button>
          </div>
        </div>

        {summary && (
          <div style={{ marginTop: 12 }}>
            <strong>Summary:</strong> Total Entries: {summary.count}, Diesel: {summary.totalDiesel} L, Amount: ₹{summary.totalAmount}
          </div>
        )}
      </div>

      <div className="card">
        <EntriesTable entries={entries} onDeleted={loadEntries} />
      </div>
    </div>
  )
}
