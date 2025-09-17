import React, { useState } from 'react'

const API = '/api/entries'

export default function EntryForm({ onSaved }) {
  const [form, setForm] = useState({ date: '', truckNo: '', loadLocation: '', dieselLiters: '', amountPaid: '', notes: '' })
  const [saving, setSaving] = useState(false)

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        setForm({ date: '', truckNo: '', loadLocation: '', dieselLiters: '', amountPaid: '', notes: '' })
        onSaved()
        alert('Entry saved successfully!')
      } else {
        alert('Error saving entry')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="entry-form">
      <input name="date" type="date" value={form.date} onChange={onChange} required />
      <input name="truckNo" placeholder="Truck No" value={form.truckNo} onChange={onChange} required />
      <input name="loadLocation" placeholder="Load Location" value={form.loadLocation} onChange={onChange} required />
      <input name="dieselLiters" placeholder="Diesel (L)" type="number" step="0.01" value={form.dieselLiters} onChange={onChange} required />
      <input name="amountPaid" placeholder="Amount (₹)" type="number" step="0.01" value={form.amountPaid} onChange={onChange} required />
      <input name="notes" placeholder="Notes" value={form.notes} onChange={onChange} />
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
    </form>
  )
}
