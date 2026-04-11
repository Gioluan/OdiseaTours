/* === LEADS MODULE — top of funnel cold prospects === */
const Leads = {
  selectedIds: new Set(),
  _lastVisibleIds: [],

  init() {
    this.render();
  },

  // ── render ────────────────────────────────────────────────────────────
  render() {
    const statusFilter = (document.getElementById('lead-filter-status') || {}).value || '';
    const ownerFilter = (document.getElementById('lead-filter-owner') || {}).value || '';
    const countryFilter = (document.getElementById('lead-filter-country') || {}).value || '';
    const search = ((document.getElementById('lead-search') || {}).value || '').toLowerCase();

    let leads = DB.getLeads();

    // Populate country filter dropdown if empty
    this._populateCountryFilter(leads);

    // Filters
    if (ownerFilter) leads = leads.filter(l => l.owner === ownerFilter);
    if (countryFilter) leads = leads.filter(l => l.country === countryFilter);

    if (statusFilter === 'Today') {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      leads = leads.filter(l => l.nextActionAt && new Date(l.nextActionAt) <= today && l.status !== 'Converted' && l.status !== 'Lost' && l.status !== 'Skip');
    } else if (statusFilter) {
      leads = leads.filter(l => l.status === statusFilter);
    }

    if (search) {
      leads = leads.filter(l =>
        (l.name || '').toLowerCase().includes(search) ||
        (l.email || '').toLowerCase().includes(search) ||
        (l.city || '').toLowerCase().includes(search) ||
        (l.contactName || '').toLowerCase().includes(search) ||
        (l.country || '').toLowerCase().includes(search)
      );
    }

    // Sort: today's queue first (overdue first), then by status priority, then alpha
    const statusOrder = { Hot: 1, Replied: 2, Contacted: 3, Cold: 4, Skip: 5, Converted: 6, Lost: 7 };
    leads.sort((a, b) => {
      const aHas = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity;
      const bHas = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity;
      if (aHas !== bHas) return aHas - bHas;
      const sa = statusOrder[a.status] || 99;
      const sb = statusOrder[b.status] || 99;
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Header count
    const countEl = document.getElementById('lead-count');
    if (countEl) {
      const total = DB.getLeads().length;
      countEl.textContent = `Showing ${leads.length} of ${total}`;
    }

    // Track which IDs are currently visible (for "select all" / "delete all visible")
    this._lastVisibleIds = leads.map(l => l.id);

    // Drop selections that are no longer visible
    this.selectedIds.forEach(id => {
      if (!this._lastVisibleIds.includes(id)) this.selectedIds.delete(id);
    });

    if (!leads.length) {
      document.getElementById('leads-table-container').innerHTML =
        '<div class="empty-state">No leads to show. Click <strong>Import xlsx</strong> to load Ramy\'s outreach list, or <strong>+ Add Lead</strong> to add manually.</div>';
      this._refreshBulkBar();
      return;
    }

    const allSelected = leads.length > 0 && leads.every(l => this.selectedIds.has(l.id));

    document.getElementById('leads-table-container').innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:32px"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="Leads.toggleSelectAll(this.checked)" title="Select all visible"></th>
            <th>Club</th>
            <th>Location</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Next action</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => this._row(l)).join('')}
        </tbody>
      </table>`;

    this._refreshBulkBar();
  },

  _row(l) {
    const isCompetitor = l.warning && String(l.warning).toLowerCase().includes('competitor');
    const rowStyle = isCompetitor
      ? 'background:rgba(244,67,54,0.08)'
      : '';
    const nextActionDate = l.nextActionAt ? new Date(l.nextActionAt) : null;
    const isOverdue = nextActionDate && nextActionDate < new Date() && l.status !== 'Converted' && l.status !== 'Lost' && l.status !== 'Skip';
    const nextActionLabel = nextActionDate
      ? `<span style="${isOverdue ? 'color:var(--rose,#f43f5e);font-weight:700' : ''}">${nextActionDate.toLocaleDateString()}</span>`
      : '—';
    const statusClass = this._statusBadge(l.status);
    const competitorTag = isCompetitor
      ? '<span class="badge badge-lost" style="margin-left:0.25rem;font-size:0.65rem">⚠ DO NOT ENGAGE</span>'
      : '';

    const checked = this.selectedIds.has(l.id) ? 'checked' : '';
    return `
      <tr class="row-clickable" ondblclick="Leads.viewLead(${l.id})" style="${rowStyle}">
        <td onclick="event.stopPropagation()"><input type="checkbox" ${checked} onclick="event.stopPropagation()" onchange="Leads.toggleSelect(${l.id}, this.checked)"></td>
        <td>
          <strong>${this._esc(l.name) || '—'}</strong>
          ${competitorTag}
          ${l.contactName ? `<br><small style="color:var(--gray-500)">${this._esc(l.contactName)}</small>` : ''}
        </td>
        <td>${[l.city, l.state, l.country].filter(Boolean).map(this._esc).join(', ') || '—'}</td>
        <td>${l.email ? `<a href="mailto:${this._esc(l.email)}">${this._esc(l.email)}</a>` : '—'}</td>
        <td>${this._esc(l.phone) || '—'}</td>
        <td>${this._esc(l.owner || '—')}</td>
        <td><span class="badge ${statusClass}">${l.status || 'Cold'}</span></td>
        <td>${nextActionLabel}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-outline" onclick="Leads.viewLead(${l.id})">View</button>
          ${!isCompetitor && l.status !== 'Converted' ? `
            <button class="btn btn-sm btn-outline" onclick="Leads.markContacted(${l.id})" title="Mark contacted today">📨</button>
            <button class="btn btn-sm btn-outline" onclick="Leads.markReplied(${l.id})" title="Got a reply">✉️</button>
            <button class="btn btn-sm btn-outline" onclick="Leads.markHot(${l.id})" title="Mark hot">🔥</button>
          ` : ''}
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();Leads.deleteOne(${l.id})" title="Delete this lead">×</button>
        </td>
      </tr>`;
  },

  // ── selection + bulk delete ───────────────────────────────────────────
  toggleSelect(id, checked) {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this._refreshBulkBar();
  },

  toggleSelectAll(checked) {
    if (checked) this._lastVisibleIds.forEach(id => this.selectedIds.add(id));
    else this._lastVisibleIds.forEach(id => this.selectedIds.delete(id));
    this.render();
  },

  _refreshBulkBar() {
    const btn = document.getElementById('lead-bulk-delete');
    const count = document.getElementById('lead-bulk-count');
    if (!btn || !count) return;
    const n = this.selectedIds.size;
    if (n > 0) {
      btn.style.display = '';
      count.textContent = n;
    } else {
      btn.style.display = 'none';
    }
  },

  deleteOne(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    if (!confirm(`Delete "${l.name}"? This cannot be undone.`)) return;
    DB.deleteLead(id);
    this.selectedIds.delete(id);
    this.render();
  },

  deleteSelected() {
    const n = this.selectedIds.size;
    if (n === 0) { alert('No leads selected.'); return; }
    if (!confirm(`Delete ${n} selected lead${n === 1 ? '' : 's'}? This cannot be undone.`)) return;
    [...this.selectedIds].forEach(id => DB.deleteLead(id));
    this.selectedIds.clear();
    this.render();
  },

  deleteAllFiltered() {
    const n = this._lastVisibleIds.length;
    if (n === 0) { alert('No leads visible to delete.'); return; }
    if (!confirm(`Delete ALL ${n} visible lead${n === 1 ? '' : 's'}? This cannot be undone.\n\nTip: Use filters first to narrow down what gets deleted.`)) return;
    if (n > 50 && !confirm(`Final confirmation: really delete ${n} leads?`)) return;
    this._lastVisibleIds.forEach(id => DB.deleteLead(id));
    this.selectedIds.clear();
    this.render();
  },

  _statusBadge(status) {
    switch (status) {
      case 'Hot': return 'badge-confirmed';
      case 'Replied': return 'badge-confirmed';
      case 'Contacted': return 'badge-sent';
      case 'Converted': return 'badge-confirmed';
      case 'Lost': return 'badge-lost';
      case 'Skip': return 'badge-lost';
      default: return 'badge-sent';
    }
  },

  _esc(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  _populateCountryFilter(leads) {
    const sel = document.getElementById('lead-filter-country');
    if (!sel || sel.dataset.populated) return;
    const countries = [...new Set(leads.map(l => l.country).filter(Boolean))].sort();
    if (!countries.length) return;
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.dataset.populated = '1';
  },

  // ── quick actions ─────────────────────────────────────────────────────
  markContacted(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    l.status = 'Contacted';
    l.lastContactAt = new Date().toISOString();
    l.contactCount = (l.contactCount || 0) + 1;
    const next = new Date(); next.setDate(next.getDate() + 5);
    l.nextActionAt = next.toISOString();
    l.history = l.history || [];
    l.history.unshift({ at: new Date().toISOString(), action: 'Contacted', by: l.owner || 'Ramy' });
    DB.saveLead(l);
    this.render();
  },

  markReplied(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    l.status = 'Replied';
    l.lastContactAt = new Date().toISOString();
    const next = new Date(); next.setDate(next.getDate() + 1);
    l.nextActionAt = next.toISOString();
    l.history = l.history || [];
    l.history.unshift({ at: new Date().toISOString(), action: 'Replied', by: l.owner || 'Ramy' });
    DB.saveLead(l);
    this.render();
  },

  markHot(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    l.status = 'Hot';
    const next = new Date(); next.setDate(next.getDate() + 1);
    l.nextActionAt = next.toISOString();
    l.history = l.history || [];
    l.history.unshift({ at: new Date().toISOString(), action: 'Marked Hot', by: l.owner || 'Ramy' });
    DB.saveLead(l);
    this.render();
  },

  setStatus(id, status) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l || !status) return;
    l.status = status;
    l.history = l.history || [];
    l.history.unshift({ at: new Date().toISOString(), action: 'Status → ' + status, by: l.owner || 'Ramy' });
    DB.saveLead(l);
    this.render();
    this.viewLead(id);
  },

  setOwner(id, owner) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    l.owner = owner;
    DB.saveLead(l);
    this.render();
    this.viewLead(id);
  },

  // ── promote to client ─────────────────────────────────────────────────
  promoteToClient(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    if (!confirm(`Promote "${l.name}" to a Client? They will appear in the Clients tab and you can build quotes for them.`)) return;
    const client = DB.saveClient({
      name: l.name,
      contactPerson: l.contactName || '',
      email: l.email || '',
      phone: l.phone || '',
      type: 'Sports Club',
      city: l.city || '',
      country: l.country || '',
      notes: `Converted from lead.${l.notes ? '\n\n' + l.notes : ''}`,
    });
    l.status = 'Converted';
    l.convertedToClientId = client.id;
    l.history = l.history || [];
    l.history.unshift({ at: new Date().toISOString(), action: `Promoted to Client #${client.id}`, by: l.owner || 'Ramy' });
    DB.saveLead(l);
    closeModal('lead-modal');
    this.render();
    alert(`✅ Promoted to Clients tab. You can now build a quote for ${l.name}.`);
  },

  // ── add / edit modal ──────────────────────────────────────────────────
  showAddModal() {
    this._showForm();
  },

  editLead(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (l) this._showForm(l);
  },

  _showForm(lead) {
    const l = lead || {};
    document.getElementById('lead-modal').style.display = 'flex';
    document.getElementById('lead-modal-content').innerHTML = `
      <h2>${l.id ? 'Edit' : 'Add'} Lead</h2>
      <input type="hidden" id="lead-id" value="${l.id || ''}">
      <div class="form-row form-row-2">
        <div class="form-group"><label>Club / Organization Name *</label><input id="lead-name" value="${this._esc(l.name) || ''}" placeholder="e.g. FC Dallas Academy"></div>
        <div class="form-group"><label>League</label><input id="lead-league" value="${this._esc(l.league) || ''}" placeholder="ECNL, MLS NEXT..."></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Contact Name</label><input id="lead-contact" value="${this._esc(l.contactName) || ''}"></div>
        <div class="form-group"><label>Contact Title</label><input id="lead-title" value="${this._esc(l.contactTitle) || ''}" placeholder="Director, Coach..."></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Email</label><input id="lead-email" type="email" value="${this._esc(l.email) || ''}"></div>
        <div class="form-group"><label>Phone</label><input id="lead-phone" value="${this._esc(l.phone) || ''}"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>City</label><input id="lead-city" value="${this._esc(l.city) || ''}"></div>
        <div class="form-group"><label>State</label><input id="lead-state" value="${this._esc(l.state) || ''}"></div>
        <div class="form-group"><label>Country</label><input id="lead-country" value="${this._esc(l.country) || 'USA'}"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Website</label><input id="lead-website" value="${this._esc(l.website) || ''}"></div>
        <div class="form-group"><label>Owner</label>
          <select id="lead-owner">
            <option value="Ramy" ${l.owner==='Ramy'?'selected':''}>Ramy</option>
            <option value="Juan" ${l.owner==='Juan'?'selected':''}>Juan</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="lead-notes" rows="3">${this._esc(l.notes) || ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Leads.saveLead()">Save</button>
        <button class="btn btn-outline" onclick="closeModal('lead-modal')">Cancel</button>
      </div>`;
  },

  saveLead() {
    const id = document.getElementById('lead-id').value;
    const l = id ? (DB.getLeads().find(x => x.id == id) || {}) : {};
    Object.assign(l, {
      name: document.getElementById('lead-name').value,
      league: document.getElementById('lead-league').value,
      contactName: document.getElementById('lead-contact').value,
      contactTitle: document.getElementById('lead-title').value,
      email: document.getElementById('lead-email').value,
      phone: document.getElementById('lead-phone').value,
      city: document.getElementById('lead-city').value,
      state: document.getElementById('lead-state').value,
      country: document.getElementById('lead-country').value,
      website: document.getElementById('lead-website').value,
      owner: document.getElementById('lead-owner').value,
      notes: document.getElementById('lead-notes').value,
    });
    if (!l.name) { alert('Please enter a club name.'); return; }
    DB.saveLead(l);
    closeModal('lead-modal');
    this.render();
  },

  deleteLead(id) {
    if (!confirm('Delete this lead permanently?')) return;
    DB.deleteLead(id);
    closeModal('lead-modal');
    this.render();
  },

  // ── view (detail panel + history) ─────────────────────────────────────
  viewLead(id) {
    const l = DB.getLeads().find(x => x.id === id);
    if (!l) return;
    const isCompetitor = l.warning && String(l.warning).toLowerCase().includes('competitor');
    document.getElementById('lead-modal').style.display = 'flex';
    document.getElementById('lead-modal-content').innerHTML = `
      <h2 style="display:flex;align-items:center;gap:0.5rem">
        ${this._esc(l.name)}
        ${isCompetitor ? '<span class="badge badge-lost">⚠ COMPETITOR — DO NOT ENGAGE</span>' : ''}
      </h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1.5rem;margin:1rem 0;font-size:0.88rem">
        <div><strong>Contact:</strong> ${this._esc(l.contactName) || '—'}${l.contactTitle ? ' (' + this._esc(l.contactTitle) + ')' : ''}</div>
        <div><strong>League:</strong> ${this._esc(l.league) || '—'}</div>
        <div><strong>Email:</strong> ${l.email ? `<a href="mailto:${this._esc(l.email)}">${this._esc(l.email)}</a>` : '—'}</div>
        <div><strong>Phone:</strong> ${l.phone ? `<a href="tel:${this._esc(l.phone)}">${this._esc(l.phone)}</a>` : '—'}</div>
        <div><strong>Location:</strong> ${[l.city, l.state, l.country].filter(Boolean).map(this._esc).join(', ') || '—'}</div>
        <div><strong>Website:</strong> ${l.website ? `<a href="${this._esc(l.website)}" target="_blank" rel="noopener">${this._esc(l.website)}</a>` : '—'}</div>
        <div><strong>Owner:</strong>
          <select onchange="Leads.setOwner(${l.id}, this.value)" style="padding:0.2rem 0.4rem;font-size:0.82rem">
            <option value="Ramy" ${l.owner==='Ramy'?'selected':''}>Ramy</option>
            <option value="Juan" ${l.owner==='Juan'?'selected':''}>Juan</option>
          </select>
        </div>
        <div><strong>Status:</strong>
          <select onchange="Leads.setStatus(${l.id}, this.value)" style="padding:0.2rem 0.4rem;font-size:0.82rem" ${isCompetitor ? 'disabled' : ''}>
            <option value="Cold" ${l.status==='Cold'?'selected':''}>Cold</option>
            <option value="Contacted" ${l.status==='Contacted'?'selected':''}>Contacted</option>
            <option value="Replied" ${l.status==='Replied'?'selected':''}>Replied</option>
            <option value="Hot" ${l.status==='Hot'?'selected':''}>Hot</option>
            <option value="Skip" ${l.status==='Skip'?'selected':''}>Skip</option>
            <option value="Converted" ${l.status==='Converted'?'selected':''}>Converted</option>
            <option value="Lost" ${l.status==='Lost'?'selected':''}>Lost</option>
          </select>
        </div>
        <div><strong>Last contact:</strong> ${l.lastContactAt ? new Date(l.lastContactAt).toLocaleDateString() : '—'}</div>
        <div><strong>Next action:</strong> ${l.nextActionAt ? new Date(l.nextActionAt).toLocaleDateString() : '—'}</div>
      </div>

      ${l.notes ? `<div style="background:var(--gray-50,#fafafa);padding:0.75rem;border-radius:var(--radius);margin-bottom:1rem;font-size:0.88rem;white-space:pre-wrap">${this._esc(l.notes)}</div>` : ''}

      <h3 style="font-size:0.95rem;margin:1rem 0 0.5rem">Activity history</h3>
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--radius);padding:0.5rem">
        ${l.history && l.history.length ? l.history.map(h => `
          <div style="padding:0.4rem 0.5rem;border-bottom:1px solid var(--gray-100);font-size:0.82rem">
            <span style="color:var(--gray-500)">${new Date(h.at).toLocaleString()}</span>
            <strong style="margin-left:0.5rem">${this._esc(h.action)}</strong>
            ${h.by ? `<span style="color:var(--gray-500);margin-left:0.4rem">by ${this._esc(h.by)}</span>` : ''}
          </div>
        `).join('') : '<div style="padding:0.5rem;color:var(--gray-500);font-size:0.82rem">No activity yet.</div>'}
      </div>

      <div class="modal-actions" style="margin-top:1rem;flex-wrap:wrap">
        ${!isCompetitor && l.status !== 'Converted' ? `
          <button class="btn btn-primary" onclick="Leads.markContacted(${l.id})">📨 Mark Contacted</button>
          <button class="btn btn-outline" onclick="Leads.markReplied(${l.id})">✉️ Got Reply</button>
          <button class="btn btn-outline" onclick="Leads.markHot(${l.id})">🔥 Hot</button>
          <button class="btn btn-success" onclick="Leads.promoteToClient(${l.id})">→ Promote to Client</button>
        ` : ''}
        <button class="btn btn-outline" onclick="Leads.editLead(${l.id})">Edit</button>
        <button class="btn btn-danger" onclick="Leads.deleteLead(${l.id})">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('lead-modal')">Close</button>
      </div>`;
  },

  // ── xlsx import ───────────────────────────────────────────────────────
  importFromXlsx(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      alert('Spreadsheet library still loading. Please try again in a moment.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) {
          alert('No rows found in the file.');
          return;
        }
        const result = DB.bulkSaveLeads(rows);
        alert(`✅ Imported ${result.added} new leads. Skipped ${result.skipped} duplicates.`);
        // Reset country filter so the new countries appear
        const sel = document.getElementById('lead-filter-country');
        if (sel) {
          sel.innerHTML = '<option value="">All countries</option>';
          delete sel.dataset.populated;
        }
        this.render();
      } catch (err) {
        console.error(err);
        alert('Failed to read file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset the input so the same file can be re-selected
    event.target.value = '';
  },
};
