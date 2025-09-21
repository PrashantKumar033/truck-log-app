const API = "/api/entries";
const TRANSPORT_API = "/api/transports";
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// Check authentication
if (!sessionId || !currentUser) {
  console.log('No session or user found, redirecting to login');
  window.location.href = '/login.html';
} else {
  console.log('Session found:', sessionId);
  console.log('User found:', currentUser);
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
const transportNameInput = document.getElementById("transportName");
const loadLocationInput = document.getElementById("loadLocation");
const dieselLitersInput = document.getElementById("dieselLiters");
const amountPaidInput = document.getElementById("amountPaid");
const labourCostInput = document.getElementById("labourCost");
const notesInput = document.getElementById("notes");
const summaryDiv = document.getElementById("summary");

// Transport form elements
const transportForm = document.getElementById("transportForm");

// Form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const body = {
      date: dateInput.value,
      truckNo: truckNoInput.value,
      transportName: transportNameInput.value,
      loadLocation: loadLocationInput.value,
      dieselLiters: dieselLitersInput.value,
      amountPaid: amountPaidInput.value,
      labourCost: labourCostInput.value,
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
      const savedEntry = await response.json();
      showMessage(editingEntryId ? "Entry updated successfully!" : "Entry saved successfully!", "success");
      form.reset();
      
      // Reset date to today after form reset
      const dateInput = document.getElementById('date');
      if (dateInput) {
        const today = new Date();
        const todayString = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');
        dateInput.value = todayString;
      }
      
      editingEntryId = null;
      document.querySelector("form button[type='submit']").textContent = "💾 Save Entry";
      await loadEntries();
      
      // Scroll to entry list to show the new entry
      setTimeout(() => {
        const entryCards = document.getElementById('entryCards');
        const entryTable = document.getElementById('table');
        
        if (entryCards && entryCards.firstChild) {
          // Mobile view - scroll to first card
          entryCards.scrollIntoView({ behavior: 'smooth', block: 'start' });
          entryCards.firstChild.style.animation = 'highlight 2s ease-in-out';
        } else if (entryTable) {
          // Desktop view - scroll to table
          entryTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
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
    document.getElementById("transportName").value = entry.transportName || "";
    document.getElementById("loadLocation").value = entry.loadLocation;
    document.getElementById("dieselLiters").value = entry.dieselLiters;
    document.getElementById("amountPaid").value = entry.amountPaid;
    document.getElementById("labourCost").value = entry.labourCost || "";
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
  // Sort entries by date (latest first)
  const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Render desktop table
  renderTable(sortedData);
  // Render mobile cards
  renderCards(sortedData);
}

// Render desktop table
function renderTable(data) {
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No entries found</td></tr>';
    return;
  }
  
  data.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.date)}</td>
      <td>${escapeHtml(entry.truckNo)}</td>
      <td>${escapeHtml(entry.transportName || "")}</td>
      <td>${escapeHtml(entry.loadLocation)}</td>
      <td>${entry.dieselLiters}</td>
      <td>₹${entry.amountPaid}</td>
      <td>₹${entry.labourCost || 0}</td>
      <td>${escapeHtml(entry.notes || "")}</td>
      <td>
        <button onclick="editEntry('${escapeHtml(entry.id)}')" class="edit-btn">Edit</button>
        <button onclick="shareEntry('${escapeHtml(entry.id)}')" class="share-btn">Share</button>
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
  
  data.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    
    // Highlight first entry (newest)
    if (index === 0) {
      card.classList.add('new-entry-highlight');
    }
    
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
        ${entry.transportName ? `<div class="entry-detail">
          <div class="entry-label">Transport</div>
          <div class="entry-value">${escapeHtml(entry.transportName)}</div>
        </div>` : ''}
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
        ${entry.labourCost ? `<div class="entry-detail">
          <div class="entry-label">Labour Cost</div>
          <div class="entry-value">₹${entry.labourCost}</div>
        </div>` : ''}
      </div>
      
      ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${escapeHtml(entry.notes)}</div>` : ''}
      
      <div class="entry-actions">
        <button onclick="shareEntry('${escapeHtml(entry.id)}')" class="share-btn">📤 Share</button>
        <div class="entry-actions-row">
          <button onclick="editEntry('${escapeHtml(entry.id)}')" class="edit-btn">✏️ Edit</button>
          <button onclick="removeEntry('${escapeHtml(entry.id)}')" class="delete-btn">🗑️ Delete</button>
        </div>
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

// Transport Functions
let allTransports = [];

async function loadTransportsList() {
  try {
    console.log('=== LOADING TRANSPORTS LIST ===');
    console.log('Session ID:', localStorage.getItem('sessionId'));
    console.log('User:', localStorage.getItem('user'));
    console.log('Headers:', getAuthHeaders());
    
    const response = await fetch(TRANSPORT_API, { headers: getAuthHeaders() });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      
      if (response.status === 401) {
        console.log('Authentication failed - redirecting to login');
        showMessage('Session expired. Please login again.', 'error');
        setTimeout(() => logout(), 2000);
        return;
      }
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    allTransports = await response.json();
    console.log('Successfully loaded transports:', allTransports);
    console.log('Transport count:', allTransports.length);
  } catch (error) {
    console.error('Error loading transports list:', error);
    showMessage('Failed to load transports list: ' + error.message, 'error');
  }
}

function filterTransports(searchTerm) {
  const dropdown = document.getElementById('transportDropdown');
  
  if (!searchTerm.trim()) {
    dropdown.classList.remove('show');
    return;
  }
  
  const filtered = allTransports.filter(transport => 
    transport.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  dropdown.innerHTML = '';
  
  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="no-transports">No transports found</div>';
  } else {
    filtered.forEach(transport => {
      const option = document.createElement('div');
      option.className = 'transport-option';
      option.innerHTML = `
        <div class="transport-option-name">${escapeHtml(transport.name)}</div>
        <div class="transport-option-details">
          ${transport.location ? `Location: ${escapeHtml(transport.location)} | ` : ''}Diesel: ${transport.dieselRate}L | Transport: ₹${transport.transportRate} | Labour: ₹${transport.labourCost}
        </div>
      `;
      
      option.addEventListener('click', () => {
        selectTransport(transport);
      });
      
      dropdown.appendChild(option);
    });
  }
  
  dropdown.classList.add('show');
}

function selectTransport(transport) {
  const transportInput = document.getElementById('transportName');
  const loadLocationInput = document.getElementById('loadLocation');
  const dieselLitersInput = document.getElementById('dieselLiters');
  const amountPaidInput = document.getElementById('amountPaid');
  const labourInput = document.getElementById('labourCost');
  const dropdown = document.getElementById('transportDropdown');
  
  // Auto-fill all form fields
  transportInput.value = transport.name;
  
  if (transport.location && !loadLocationInput.value) {
    loadLocationInput.value = transport.location;
  }
  
  if (transport.dieselRate > 0 && !dieselLitersInput.value) {
    dieselLitersInput.value = transport.dieselRate;
  }
  
  if (transport.transportRate > 0 && !amountPaidInput.value) {
    amountPaidInput.value = transport.transportRate;
  }
  
  if (transport.labourCost > 0 && !labourInput.value) {
    labourInput.value = transport.labourCost;
  }
  
  // Show success message
  showMessage(`Auto-filled from ${transport.name}`, 'success');
  
  dropdown.classList.remove('show');
}

let allTransportsForList = [];

async function loadTransports() {
  try {
    console.log('Loading transports with headers:', getAuthHeaders());
    const response = await fetch(TRANSPORT_API, { headers: getAuthHeaders() });
    console.log('Transport response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('Authentication failed, redirecting to login');
        logout();
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const transports = await response.json();
    console.log('Loaded transports:', transports);
    
    // Store all transports for search and reverse order (latest first)
    allTransportsForList = transports.reverse();
    
    renderTransportList(allTransportsForList);
  } catch (error) {
    console.error('Error loading transports:', error);
    showMessage('Failed to load transports', 'error');
  }
}

function renderTransportList(transports) {
  const container = document.getElementById('transportsList');
  container.innerHTML = '';
  
  if (transports.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No transports found</p>';
    return;
  }
  
  transports.forEach(transport => {
    const card = document.createElement('div');
    card.className = 'transport-card';
    card.innerHTML = `
      <div class="transport-header">
        <div class="transport-name">${escapeHtml(transport.name)}</div>
        <div class="transport-actions">
          <button onclick="editTransport('${escapeHtml(transport.id)}')" class="edit-btn transport-edit-btn">✏️</button>
          <button onclick="deleteTransport('${escapeHtml(transport.id)}')" class="delete-btn transport-delete-btn">🗑️</button>
        </div>
      </div>
      ${transport.location ? `<div class="transport-location">📍 ${escapeHtml(transport.location)}</div>` : ''}
      <div class="transport-details">
        <div class="transport-detail">
          <div class="transport-detail-label">Diesel</div>
          <div class="transport-detail-value">${transport.dieselRate} L</div>
        </div>
        <div class="transport-detail">
          <div class="transport-detail-label">Transport Rate</div>
          <div class="transport-detail-value">₹${transport.transportRate}</div>
        </div>
        <div class="transport-detail">
          <div class="transport-detail-label">Labour Cost</div>
          <div class="transport-detail-value">₹${transport.labourCost}</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function searchTransports(searchTerm) {
  if (!searchTerm.trim()) {
    renderTransportList(allTransportsForList);
    return;
  }
  
  const filtered = allTransportsForList.filter(transport => 
    transport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transport.location && transport.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  renderTransportList(filtered);
}

// Initialize transport form after DOM is loaded
function initializeTransportForm() {
  const transportForm = document.getElementById('transportForm');
  if (!transportForm) {
    console.warn('Transport form not found');
    return;
  }
  
  transportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const nameInput = document.getElementById('transportNameAdd');
      const locationInput = document.getElementById('transportLocation');
      const dieselRateInput = document.getElementById('dieselRate');
      const transportRateInput = document.getElementById('transportRate');
      const labourCostInput = document.getElementById('labourCostDefault');
      
      if (!nameInput || !nameInput.value.trim()) {
        showMessage('Transport name is required', 'error');
        return;
      }
      
      const body = {
        name: nameInput.value.trim(),
        location: locationInput ? locationInput.value.trim() : '',
        dieselRate: dieselRateInput ? Number(dieselRateInput.value) || 0 : 0,
        transportRate: transportRateInput ? Number(transportRateInput.value) || 0 : 0,
        labourCost: labourCostInput ? Number(labourCostInput.value) || 0 : 0
      };
      
      console.log('=== TRANSPORT FORM SUBMISSION ===');
      console.log('Submitting transport:', body);
      console.log('Auth headers:', getAuthHeaders());
      console.log('Session ID from localStorage:', localStorage.getItem('sessionId'));
      console.log('User from localStorage:', localStorage.getItem('user'));
      console.log('API URL:', editingTransportId ? `${TRANSPORT_API}/${editingTransportId}` : TRANSPORT_API);
      
      let response;
      if (editingTransportId) {
        // Update existing transport
        console.log('Updating transport with ID:', editingTransportId);
        response = await fetch(`${TRANSPORT_API}/${editingTransportId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });
      } else {
        // Create new transport
        console.log('Creating new transport');
        response = await fetch(TRANSPORT_API, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });
      }
      
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response URL:', response.url);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('Transport saved:', result);
        showMessage(editingTransportId ? 'Transport updated successfully!' : 'Transport added successfully!', 'success');
        transportForm.reset();
        
        editingTransportId = null;
        const submitBtn = document.querySelector('#transportForm button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '💾 Add Transport';
        
        // Reload data
        await loadTransports();
        await loadTransportsList();
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        try {
          const error = JSON.parse(errorText);
          showMessage(error.error || 'Failed to save transport', 'error');
        } catch {
          showMessage(`Server error: ${response.status} - ${errorText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      showMessage('Network error: ' + error.message, 'error');
    }
  });
}

// Transport input event listeners
if (transportNameInput) {
  transportNameInput.addEventListener('input', (e) => {
    const value = e.target.value;
    filterTransports(value);
    
    // Clear auto-filled values if transport name is cleared
    if (!value.trim()) {
      // Optional: Clear other fields when transport name is cleared
    }
  });
  
  transportNameInput.addEventListener('focus', () => {
    if (transportNameInput.value.trim()) {
      filterTransports(transportNameInput.value);
    }
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const container = document.querySelector('.transport-input-container');
    if (container && !container.contains(e.target)) {
      document.getElementById('transportDropdown').classList.remove('show');
    }
  });
  
  // Handle keyboard navigation
  transportNameInput.addEventListener('keydown', (e) => {
    const dropdown = document.getElementById('transportDropdown');
    const options = dropdown.querySelectorAll('.transport-option');
    
    if (e.key === 'Escape') {
      dropdown.classList.remove('show');
    } else if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault();
      options[0].click();
    }
  });
}

// Load detailed summary
async function loadDetailedSummary() {
  try {
    const response = await fetch(`${API}/summary`, { headers: getAuthHeaders() });
    const summaryData = await response.json();
    
    const container = document.getElementById('detailedSummary');
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
        <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #0077b6;">${summaryData.count}</div>
          <div style="color: #666; font-size: 14px;">Total Entries</div>
        </div>
        <div style="background: #fff3e0; padding: 15px; border-radius: 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #f57c00;">${summaryData.totalDiesel} L</div>
          <div style="color: #666; font-size: 14px;">Total Diesel</div>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #2e7d32;">₹${summaryData.totalAmount}</div>
          <div style="color: #666; font-size: 14px;">Total Amount</div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading detailed summary:', error);
    document.getElementById('detailedSummary').innerHTML = 'Failed to load summary';
  }
}

// Share Entry Function
async function shareEntry(entryId) {
  try {
    const response = await fetch(API, { headers: getAuthHeaders() });
    const entries = await response.json();
    const entry = entries.find(e => e.id === entryId);
    
    if (!entry) {
      showMessage('Entry not found', 'error');
      return;
    }
    
    const formattedDate = new Date(entry.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    const shareText = `🚚 *Truck Log Entry*

📅 *Date:* ${formattedDate}
🚛 *Truck No:* ${entry.truckNo}
${entry.transportName ? `🚚 *Transport:* ${entry.transportName}\n` : ''}📍 *Location:* ${entry.loadLocation}
⛽ *Diesel:* ${entry.dieselLiters} Liters
💰 *Amount:* ₹${entry.amountPaid}
${entry.labourCost ? `👷 *Labour Cost:* ₹${entry.labourCost}\n` : ''}${entry.notes ? `📝 *Notes:* ${entry.notes}\n` : ''}
————————————
📱 Shared from Truck Log App`;
    
    // Create share modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 25px; border-radius: 15px; max-width: 350px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 20px 0; color: #0077b6;">📤 Share Entry</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <button onclick="shareWhatsApp('${encodeURIComponent(shareText)}')" style="background: #25D366; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">
            📱 WhatsApp
          </button>
          
          <button onclick="shareSMS('${encodeURIComponent(shareText)}')" style="background: #007AFF; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">
            💬 SMS
          </button>
          
          <button onclick="shareFacebook('${encodeURIComponent(shareText)}')" style="background: #1877F2; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">
            🔗 Facebook
          </button>
          
          <button onclick="shareTwitter('${encodeURIComponent(shareText)}')" style="background: #1DA1F2; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">
            🐦 Twitter
          </button>
        </div>
        
        <div style="margin-bottom: 15px;">
          <button onclick="copyToClipboard('${escapeHtml(shareText)}')" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">
            📋 Copy Text
          </button>
        </div>
        
        <button onclick="closeShareModal()" style="background: #6c757d; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    window.currentShareModal = modal;
    
  } catch (error) {
    console.error('Error sharing entry:', error);
    showMessage('Failed to prepare share', 'error');
  }
}

// Share functions
function shareWhatsApp(text) {
  window.open(`https://wa.me/?text=${text}`, '_blank');
  closeShareModal();
}

function shareSMS(text) {
  window.open(`sms:?body=${text}`, '_blank');
  closeShareModal();
}

function shareFacebook(text) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${text}`, '_blank');
  closeShareModal();
}

function shareTwitter(text) {
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  closeShareModal();
}

function copyToClipboard(text) {
  // Decode the text first
  const decodedText = decodeURIComponent(text.replace(/\+/g, ' '));
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(decodedText).then(() => {
      showMessage('Text copied to clipboard!', 'success');
      closeShareModal();
    }).catch(() => {
      fallbackCopyTextToClipboard(decodedText);
    });
  } else {
    fallbackCopyTextToClipboard(decodedText);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showMessage('Text copied to clipboard!', 'success');
  } catch (err) {
    showMessage('Failed to copy text', 'error');
  }
  
  document.body.removeChild(textArea);
  closeShareModal();
}

function closeShareModal() {
  if (window.currentShareModal) {
    document.body.removeChild(window.currentShareModal);
    window.currentShareModal = null;
  }
}

// Navigation functions
function toggleNav() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  document.getElementById(sectionName + 'Section').classList.add('active');
  
  // Update desktop tab active state
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Find and activate the correct tab
  const activeTab = Array.from(document.querySelectorAll('.nav-tab')).find(tab => {
    return tab.onclick && tab.onclick.toString().includes(`showSection('${sectionName}')`);
  });
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  // Close mobile nav if open
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar && sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  }
  
  // Load data for the section
  if (sectionName === 'entries') {
    loadEntries();
    loadTransportsList();
  } else if (sectionName === 'transports') {
    loadTransports();
  } else if (sectionName === 'summary') {
    loadDetailedSummary();
  }
}

// Initialize on load
window.addEventListener('load', () => {
  showSection('entries');
});

// Transport Edit and Delete Functions
let editingTransportId = null;

async function editTransport(transportId) {
  try {
    const response = await fetch(TRANSPORT_API, { headers: getAuthHeaders() });
    const transports = await response.json();
    const transport = transports.find(t => t.id === transportId);
    
    if (!transport) {
      showMessage('Transport not found', 'error');
      return;
    }
    
    // Fill form with transport data
    document.getElementById('transportNameAdd').value = transport.name;
    document.getElementById('transportLocation').value = transport.location || '';
    document.getElementById('dieselRate').value = transport.dieselRate;
    document.getElementById('transportRate').value = transport.transportRate;
    document.getElementById('labourCostDefault').value = transport.labourCost;
    
    editingTransportId = transportId;
    const submitBtn = document.querySelector('#transportForm button[type="submit"]');
    submitBtn.textContent = '💾 Update Transport';
    
    // Scroll to form
    document.getElementById('transportForm').scrollIntoView({ behavior: 'smooth' });
    showMessage('Transport loaded for editing', 'success');
  } catch (error) {
    console.error('Error loading transport for edit:', error);
    showMessage('Failed to load transport', 'error');
  }
}

async function deleteTransport(transportId) {
  if (!confirm('Are you sure you want to delete this transport?')) return;
  
  try {
    const response = await fetch(`${TRANSPORT_API}/${transportId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      showMessage('Transport deleted successfully!', 'success');
      loadTransports();
      loadTransportsList();
    } else {
      const error = await response.json();
      showMessage(error.error || 'Failed to delete transport', 'error');
    }
  } catch (error) {
    console.error('Error deleting transport:', error);
    showMessage('Network error. Please try again.', 'error');
  }
}

// Test function for debugging
async function testTransportAPI() {
  try {
    console.log('=== TESTING TRANSPORT API ===');
    
    // Test 1: Check authentication status
    console.log('Session ID:', localStorage.getItem('sessionId'));
    console.log('User:', localStorage.getItem('user'));
    console.log('Auth headers:', getAuthHeaders());
    
    // Test 2: Try authenticated GET
    console.log('Testing GET /api/transports...');
    const authResponse = await fetch('/api/transports', {
      headers: getAuthHeaders()
    });
    console.log('GET response status:', authResponse.status);
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log('Current transport data:', data);
      console.log('Transport count:', data.length);
    } else {
      const errorText = await authResponse.text();
      console.log('GET error:', errorText);
    }
    
    // Test 3: Try creating a test transport
    console.log('Testing POST /api/transports...');
    const testTransport = {
      name: 'Test Transport ' + Date.now(),
      location: 'Test Location',
      dieselRate: 95,
      transportRate: 1000,
      labourCost: 150
    };
    
    const postResponse = await fetch('/api/transports', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(testTransport)
    });
    
    console.log('POST response status:', postResponse.status);
    
    if (postResponse.ok) {
      const result = await postResponse.json();
      console.log('Test transport created:', result);
    } else {
      const errorText = await postResponse.text();
      console.log('POST error:', errorText);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Show user info
  if (currentUser) {
    const userInfoElements = ['userInfo', 'userInfoDesktop'];
    const welcomeElements = ['welcomeText', 'welcomeTextDesktop'];
    
    userInfoElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.display = 'block';
    });
    
    welcomeElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = `Welcome, ${currentUser.username}!`;
    });
  }
  
  // Auto-fill today's date
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
    dateInput.value = todayString;
  }
  
  // Initialize transport search
  const transportSearchInput = document.getElementById('transportSearch');
  if (transportSearchInput) {
    transportSearchInput.addEventListener('input', (e) => {
      searchTransports(e.target.value);
    });
  }
  
  // Initialize forms and load data
  initializeTransportForm();
  loadEntries();
  loadTransportsList();
  
  // Debug: Test transport API on load
  setTimeout(() => {
    testTransportAPI();
  }, 2000);
});