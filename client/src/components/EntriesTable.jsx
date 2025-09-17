import React from 'react'

export default function EntriesTable({ entries = [], onDeleted }) {
  async function remove(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
        alert('Entry deleted successfully!')
      } else {
        alert('Error deleting entry')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div>
      <h3>Entries</h3>
      {entries.length === 0 ? (
        <div style={{ padding: 20, color: '#666' }}>No entries yet. Click "Load Entries" to fetch saved data.</div>
      ) : (
        <table className="responsive-table">
          <thead>
            <tr><th>Date</th><th>Truck</th><th>Load</th><th>Diesel</th><th>Amount</th><th>Notes</th><th>Action</th></tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e._id}>
                <td data-label="Date">{new Date(e.date).toLocaleDateString()}</td>
                <td data-label="Truck">{e.truckNo}</td>
                <td data-label="Load">{e.loadLocation}</td>
                <td data-label="Diesel">{e.dieselLiters}</td>
                <td data-label="Amount">{e.amountPaid}</td>
                <td data-label="Notes">{e.notes}</td>
                <td data-label="Action"><button className="delete-btn" onClick={() => remove(e._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
