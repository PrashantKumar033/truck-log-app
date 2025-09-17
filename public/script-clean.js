const API = "/api/entries";
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// Check authentication
if (!sessionId || !currentUser) {
  window.location.href = '/login.html';
}

// Set auth headers for all requests
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId
  };
}

// Logout function
function logout() {
  fetch('/api/logout', {
    method: 'POST',
    headers: getAuthHeaders()
  }).finally(() => {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  });
}

// Get form elements
const form = document.getElementById("entryForm");
const dateInput = document.getElementById("date");
const truckNoInput = document.getElementById("truckNo");
const loadLocationInput = document.getElementById("loadLocation");
const dieselLitersInput = document.getElementById("dieselLiters");
const amountPaidInput = document.getElementById("amountPaid");
const notesInput = document.getElementById("notes");
const summaryDiv = document.getElementById("summary");

// Form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const body = {
      date: dateInput.value,
      truckNo: truckNoInput.value,
      loadLocation: loadLocationInput.value,
      dieselLiters: dieselLitersInput.value,
      amountPaid: amountPaidInput.value,
      notes: notesInput.value
    };

    let response;
    if (editingEntryId) {
      // Update existing entry
      response = await fetch(`${API}/${editingEntryId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
    } else {
      // Create new entry
      response = await fetch(API, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
    }

    if (response.ok) {
      showMessage(editingEntryId ? "Entry updated successfully!" : "Entry saved successfully!", "success");
      form.reset();
      editingEntryId = null;
      document.querySelector("form button[type='submit']").textContent = "💾 Save Entry";
      loadEntries();
    } else {
      const error = await response.json();
      showMessage(error.error || "Failed to save entry", "error");
    }
  } catch (error) {
    console.error("Error saving entry:", error);
    showMessage("Network error. Please try again.", "error");
  }
});

// Load entries
async function loadEntries() {
  try {
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;
    let url = API;
    
    if (from && to) {
      url += `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    
    console.log('Loading entries from:', url);
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error("Failed to fetch entries");
    }
    
    const data = await response.json();
    console.log('Received data:', data);
    renderEntries(data);
    
    if (from && to) {
      loadSummary(from, to);
    } else {
      // Load summary for all entries
      loadAllSummary();
    }
  } catch (error) {
    console.error("Error loading entries:", error);
    showMessage("Failed to load entries", "error");
  }
}

// Load summary for all entries
async function loadAllSummary() {
  try {
    const response = await fetch(`${API}/summary`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch summary");
    
    const summaryData = await response.json();
    summaryDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="margin: 5px 0;"><strong>📊 Total Entries:</strong> ${summaryData.count}</div>
        <div style="margin: 5px 0;"><strong>⛽ Total Diesel:</strong> ${summaryData.totalDiesel} L</div>
        <div style="margin: 5px 0;"><strong>💰 Total Amount:</strong> ₹${summaryData.totalAmount}</div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading summary:", error);
    summaryDiv.innerHTML = "Failed to load summary";
  }
}

// Load month entries
async function loadMonth() {
  try {
    const monthInput = document.getElementById("month").value;
    if (!monthInput) return;
    
    const response = await fetch(`${API}/month/${encodeURIComponent(monthInput)}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch monthly entries");
    
    const data = await response.json();
    renderEntries(data);
    
    // Load summary for the month
    const [year, month] = monthInput.split('-');
    const lastDay = new Date(year, month, 0).getDate();
    const fromDate = `${year}-${month.padStart(2, '0')}-01`;
    const toDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    loadSummary(fromDate, toDate);
  } catch (error) {
    console.error("Error loading monthly entries:", error);
    showMessage("Failed to load monthly entries", "error");
  }
}

// Load summary
async function loadSummary(from, to) {
  try {
    const response = await fetch(`${API}/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch summary");
    
    const summaryData = await response.json();
    summaryDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="margin: 5px 0;"><strong>📊 Total Entries:</strong> ${summaryData.count}</div>
        <div style="margin: 5px 0;"><strong>⛽ Total Diesel:</strong> ${summaryData.totalDiesel} L</div>
        <div style="margin: 5px 0;"><strong>💰 Total Amount:</strong> ₹${summaryData.totalAmount}</div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading summary:", error);
    summaryDiv.innerHTML = "Failed to load summary";
  }
}

let editingEntryId = null;

// Edit entry
async function editEntry(id) {
  try {
    const response = await fetch(`${API}`, { headers: getAuthHeaders() });
    const entries = await response.json();
    const entry = entries.find(e => e.id === id);
    
    if (!entry) {
      showMessage("Entry not found", "error");
      return;
    }
    
    // Fill form with entry data
    document.getElementById("date").value = entry.date;
    document.getElementById("truckNo").value = entry.truckNo;
    document.getElementById("loadLocation").value = entry.loadLocation;
    document.getElementById("dieselLiters").value = entry.dieselLiters;
    document.getElementById("amountPaid").value = entry.amountPaid;
    document.getElementById("notes").value = entry.notes || "";
    
    editingEntryId = id;
    document.querySelector("form button[type='submit']").textContent = "Update Entry";
    showMessage("Entry loaded for editing", "success");
  } catch (error) {
    console.error("Error loading entry for edit:", error);
    showMessage("Failed to load entry", "error");
  }
}

// Remove entry
async function removeEntry(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;
  
  try {
    const response = await fetch(`${API}/${encodeURIComponent(id)}`, { 
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (response.ok) {
      showMessage("Entry deleted successfully!", "success");
      loadEntries();
    } else {
      showMessage("Failed to delete entry", "error");
    }
  } catch (error) {
    console.error("Error deleting entry:", error);
    showMessage("Network error. Please try again.", "error");
  }
}

// Render entries in both table and cards
function renderEntries(data) {
  // Render desktop table
  renderTable(data);
  // Render mobile cards
  renderCards(data);
}

// Render desktop table
function renderTable(data) {
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666;">No entries found</td></tr>';
    return;
  }
  
  data.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.date)}</td>
      <td>${escapeHtml(entry.truckNo)}</td>
      <td>${escapeHtml(entry.loadLocation)}</td>
      <td>${entry.dieselLiters}</td>
      <td>₹${entry.amountPaid}</td>
      <td>${escapeHtml(entry.notes || "")}</td>
      <td>
        <button onclick="editEntry('${escapeHtml(entry.id)}')" class="edit-btn">Edit</button>
        <button onclick="removeEntry('${escapeHtml(entry.id)}')" class="delete-btn">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Render mobile cards
function renderCards(data) {
  const cardsContainer = document.getElementById("entryCards");
  cardsContainer.innerHTML = "";
  
  if (data.length === 0) {
    cardsContainer.innerHTML = '<div class="entry-card"><p style="text-align: center; color: #666; margin: 0;">No entries found</p></div>';
    return;
  }
  
  data.forEach(entry => {
    const card = document.createElement("div");
    card.className = "entry-card";
    
    const formattedDate = new Date(entry.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    card.innerHTML = `
      <div class="entry-header">
        <div class="entry-date">${formattedDate}</div>
        <div class="entry-truck">Truck ${escapeHtml(entry.truckNo)}</div>
      </div>
      
      <div class="entry-details">
        <div class="entry-detail">
          <div class="entry-label">Load Location</div>
          <div class="entry-value">${escapeHtml(entry.loadLocation)}</div>
        </div>
        <div class="entry-detail">
          <div class="entry-label">Diesel (L)</div>
          <div class="entry-value">${entry.dieselLiters} L</div>
        </div>
        <div class="entry-detail">
          <div class="entry-label">Amount Paid</div>
          <div class="entry-value">₹${entry.amountPaid}</div>
        </div>
        <div class="entry-detail">
          <div class="entry-label">Entry ID</div>
          <div class="entry-value">#${escapeHtml(entry.id.substring(0, 8))}</div>
        </div>
      </div>
      
      ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${escapeHtml(entry.notes)}</div>` : ''}
      
      <div class="entry-actions">
        <button onclick="editEntry('${escapeHtml(entry.id)}')" class="edit-btn">✏️ Edit</button>
        <button onclick="removeEntry('${escapeHtml(entry.id)}')" class="delete-btn">🗑️ Delete</button>
      </div>
    `;
    
    cardsContainer.appendChild(card);
  });
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showMessage(message, type) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${message}</span>
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease-out;
  `;
  
  // Add animation keyframes
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

// Clear filters and load all entries
function clearFiltersAndLoad() {
  document.getElementById('from').value = '';
  document.getElementById('to').value = '';
  document.getElementById('month').value = '';
  loadEntries();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Show user info
  if (currentUser) {
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('welcomeText').textContent = `Welcome, ${currentUser.name}!`;
  }
  loadEntries();
});