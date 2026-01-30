/* === CLIENTS MODULE === */
const Clients = {
  init() {
    this.importFromQuotes();
    this.render();
  },

  // Auto-import clients from existing quotes/tours that aren't in the DB yet
  importFromQuotes() {
    const existing = DB.getClients();
    const existingNames = new Set(existing.map(c => (c.name || '').toLowerCase().trim()));
    const quotes = DB.getQuotes();
    const tours = DB.getTours();
    const seen = new Set();
    let added = 0;

    const tryAdd = (name, email, phone, clientId) => {
      if (!name) return;
      const key = name.toLowerCase().trim();
      if (existingNames.has(key) || seen.has(key)) return;
      seen.add(key);
      const c = DB.saveClient({
        name: name,
        contactPerson: '',
        email: email || '',
        phone: phone || '',
        type: 'School',
        city: '',
        country: '',
        notes: 'Auto-imported from existing quotes'
      });
      existingNames.add(key);
      added++;
      // Link back: update quotes/tours that match this name to have clientId
      quotes.forEach(q => {
        if ((q.clientName || '').toLowerCase().trim() === key && !q.clientId) {
          q.clientId = c.id;
          DB.saveQuote(q);
        }
      });
      tours.forEach(t => {
        if ((t.clientName || '').toLowerCase().trim() === key && !t.clientId) {
          t.clientId = c.id;
          DB.saveTour(t);
        }
      });
    };

    quotes.forEach(q => tryAdd(q.clientName, q.clientEmail, q.clientPhone));
    tours.forEach(t => tryAdd(t.clientName, t.clientEmail, t.clientPhone));
  },

  render() {
    const typeFilter = document.getElementById('cli-filter-type').value;
    const search = (document.getElementById('cli-search').value || '').toLowerCase();

    let clients = DB.getClients();
    if (typeFilter) clients = clients.filter(c => c.type === typeFilter);
    if (search) clients = clients.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.contactPerson || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.city || '').toLowerCase().includes(search)
    );

    clients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (!clients.length) {
      document.getElementById('clients-table-container').innerHTML = '<div class="empty-state">No clients found. Click "+ Add Client" to start building your database.</div>';
      return;
    }

    const quotes = DB.getQuotes();

    document.getElementById('clients-table-container').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>Type</th><th>City</th><th>Quotes</th><th>Actions</th></tr></thead>
        <tbody>${clients.map(c => {
          const clientQuotes = quotes.filter(q => q.clientId === c.id || (q.clientName && q.clientName === c.name && !q.clientId));
          return `<tr class="row-clickable" ondblclick="Clients.viewClient(${c.id})">
            <td><strong>${c.name || '—'}</strong></td>
            <td>${c.contactPerson || '—'}</td>
            <td>${c.email || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td><span class="badge badge-sent">${c.type || '—'}</span></td>
            <td>${c.city || '—'}${c.country ? ', ' + c.country : ''}</td>
            <td>${clientQuotes.length || '—'}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="Clients.viewClient(${c.id})">View</button>
              <button class="btn btn-sm btn-outline" onclick="Clients.editClient(${c.id})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="if(confirm('Delete this client?')){Clients.deleteClient(${c.id})}">Del</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  },

  showAddModal() {
    this._showForm();
  },

  editClient(id) {
    const c = DB.getClients().find(x => x.id === id);
    if (c) this._showForm(c);
  },

  _showForm(client) {
    const c = client || {};
    document.getElementById('cli-modal').style.display = 'flex';
    document.getElementById('cli-modal-content').innerHTML = `
      <h2>${c.id ? 'Edit' : 'Add'} Client</h2>
      <input type="hidden" id="cli-id" value="${c.id || ''}">
      <div class="form-row form-row-2">
        <div class="form-group"><label>Client / Organization Name</label><input id="cli-name" value="${c.name || ''}" placeholder="e.g. St Patrick's School"></div>
        <div class="form-group"><label>Type</label>
          <select id="cli-type">
            <option value="School" ${c.type==='School'?'selected':''}>School</option>
            <option value="Sports Club" ${c.type==='Sports Club'?'selected':''}>Sports Club</option>
            <option value="Corporate" ${c.type==='Corporate'?'selected':''}>Corporate</option>
            <option value="Private" ${c.type==='Private'?'selected':''}>Private</option>
            <option value="Other" ${c.type==='Other'?'selected':''}>Other</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Contact Person</label><input id="cli-contact" value="${c.contactPerson || ''}" placeholder="Main point of contact"></div>
        <div class="form-group"><label>Email</label><input id="cli-email" type="email" value="${c.email || ''}" placeholder="client@email.com"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Phone</label><input id="cli-phone" value="${c.phone || ''}" placeholder="+34..."></div>
        <div class="form-group"><label>City</label><input id="cli-city" value="${c.city || ''}"></div>
        <div class="form-group"><label>Country</label><input id="cli-country" value="${c.country || ''}" placeholder="e.g. UK, Spain"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="cli-notes" rows="3" placeholder="Internal notes about this client...">${c.notes || ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Clients.saveClient()">Save</button>
        <button class="btn btn-outline" onclick="closeModal('cli-modal')">Cancel</button>
      </div>`;
  },

  saveClient() {
    const id = document.getElementById('cli-id').value;
    const c = {
      name: document.getElementById('cli-name').value,
      type: document.getElementById('cli-type').value,
      contactPerson: document.getElementById('cli-contact').value,
      email: document.getElementById('cli-email').value,
      phone: document.getElementById('cli-phone').value,
      city: document.getElementById('cli-city').value,
      country: document.getElementById('cli-country').value,
      notes: document.getElementById('cli-notes').value
    };
    if (!c.name) { alert('Please enter a client name.'); return; }
    if (id) c.id = Number(id);
    DB.saveClient(c);
    closeModal('cli-modal');
    this.render();
  },

  deleteClient(id) {
    DB.deleteClient(id);
    this.render();
  },

  viewClient(id) {
    const c = DB.getClients().find(x => x.id === id);
    if (!c) return;
    const quotes = DB.getQuotes().filter(q => q.clientId === c.id || (q.clientName && q.clientName === c.name && !q.clientId));
    const tours = DB.getTours().filter(t => t.clientId === c.id || (t.clientName && t.clientName === c.name && !t.clientId));

    document.getElementById('cli-modal').style.display = 'flex';
    document.getElementById('cli-modal-content').innerHTML = `
      <h2>${c.name}</h2>
      <div class="grid-2" style="margin-bottom:1rem">
        <div>
          <p><strong>Type:</strong> <span class="badge badge-sent">${c.type || '—'}</span></p>
          <p><strong>Contact Person:</strong> ${c.contactPerson || '—'}</p>
          <p><strong>Email:</strong> ${c.email || '—'}</p>
          <p><strong>Phone:</strong> ${c.phone || '—'}</p>
        </div>
        <div>
          <p><strong>City:</strong> ${c.city || '—'}</p>
          <p><strong>Country:</strong> ${c.country || '—'}</p>
          <p><strong>Added:</strong> ${fmtDate(c.createdAt)}</p>
          <p><strong>Notes:</strong> ${c.notes || '—'}</p>
        </div>
      </div>

      <h3>Linked Quotes (${quotes.length})</h3>
      ${quotes.length ? `<table class="data-table" style="margin-bottom:1rem;font-size:0.85rem">
        <thead><tr><th>Quote #</th><th>Tour</th><th>Destination</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${quotes.map(q => `<tr class="row-clickable" ondblclick="closeModal('cli-modal');App.switchTab('crm');setTimeout(()=>CRM.viewQuote(${q.id}),100)">
          <td>Q-${String(q.id).padStart(4,'0')}</td>
          <td>${q.tourName || '—'}</td>
          <td>${q.destination || '—'}</td>
          <td>${fmt(q.costs ? q.costs.grand : 0, q.currency)}</td>
          <td><span class="badge ${badgeClass(q.status)}">${q.status}</span></td>
        </tr>`).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:1rem">No quotes linked to this client.</p>'}

      <h3>Linked Tours (${tours.length})</h3>
      ${tours.length ? `<table class="data-table" style="margin-bottom:1rem;font-size:0.85rem">
        <thead><tr><th>Tour</th><th>Destination</th><th>Dates</th><th>Status</th></tr></thead>
        <tbody>${tours.map(t => `<tr class="row-clickable" ondblclick="closeModal('cli-modal');App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)">
          <td>${t.tourName || '—'}</td>
          <td>${t.destination || '—'}</td>
          <td>${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</td>
          <td><span class="badge ${badgeClass(t.status)}">${t.status}</span></td>
        </tr>`).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:1rem">No tours linked to this client.</p>'}

      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Clients.editClient(${c.id})">Edit</button>
        <button class="btn btn-outline" onclick="Clients.emailClient(${c.id})" style="border-color:var(--amber);color:var(--amber)">Email Client</button>
        <button class="btn btn-danger" onclick="if(confirm('Delete this client?')){DB.deleteClient(${c.id});closeModal('cli-modal');Clients.render();}">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('cli-modal')">Close</button>
      </div>`;
  },

  emailClient(id) {
    const c = DB.getClients().find(x => x.id === id);
    if (!c || !c.email) { alert('No email address for this client.'); return; }
    closeModal('cli-modal');
    App.switchTab('email');
    setTimeout(() => {
      document.getElementById('em-to').value = c.email;
      document.getElementById('em-subject').value = '';
      document.getElementById('em-body').value = `Dear ${c.contactPerson || c.name},\n\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com`;
    }, 100);
  }
};
