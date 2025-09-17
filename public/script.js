const API = "/api/entries";

document.getElementById("entryForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = {
    date: date.value,
    truckNo: truckNo.value,
    loadLocation: loadLocation.value,
    dieselLiters: dieselLiters.value,
    amountPaid: amountPaid.value,
    notes: notes.value
  };
  const r = await fetch(API, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) });
  if (r.ok) { alert("Saved!"); loadEntries(); e.target.reset(); }
});

async function loadEntries() {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  let url = API;
  if (from && to) url += `?from=${from}&to=${to}`;
  const res = await fetch(url);
  const data = await res.json();
  render(data);
  if (from && to) loadSummary(from, to);
}

async function loadMonth() {
  const ym = document.getElementById("month").value;
  if (!ym) return;
  const res = await fetch(`${API}/month/${ym}`);
  const data = await res.json();
  render(data);
}

async function loadSummary(from, to) {
  const r = await fetch(`${API}/summary?from=${from}&to=${to}`);
  const s = await r.json();
  summary.innerHTML = `Total Entries: ${s.count}, Diesel: ${s.totalDiesel} L, Amount: ₹${s.totalAmount}`;
}

async function removeEntry(id) {
  await fetch(`${API}/${id}`, { method: "DELETE" });
  loadEntries();
}

function render(data) {
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";
  data.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.truckNo}</td>
      <td>${e.loadLocation}</td>
      <td>${e.dieselLiters}</td>
      <td>${e.amountPaid}</td>
      <td>${e.notes || ""}</td>
      <td><button onclick="removeEntry('${e.id}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

loadEntries();








// undo for the delete element

let lastDeleted = null; // store deleted entry

function deleteRow(button) {
  const row = button.closest("tr");
  lastDeleted = {
    rowHTML: row.innerHTML,
    rowIndex: row.rowIndex
  };

  // Replace row content with Undo message
  row.innerHTML = `
    <td colspan="7" style="background:#ffeb3b; text-align:center;">
      Entry deleted. <button class="undo-btn">Undo</button>
    </td>
  `;

  // Add Undo button functionality
  row.querySelector(".undo-btn").addEventListener("click", () => {
    undoDelete(row);
  });
}

function undoDelete(row) {
  // Restore old content
  row.innerHTML = lastDeleted.rowHTML;

  // Re-bind delete button functionality
  const deleteBtn = row.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      deleteRow(deleteBtn);
    });
  }

  lastDeleted = null;
}
