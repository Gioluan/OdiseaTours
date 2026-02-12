/* === INVOICING & PAYMENTS MODULE === */
const Invoicing = {
  init() { this.render(); },

  render() {
    const filter = document.getElementById('inv-filter-status').value;
    let invoices = DB.getInvoices();

    // Compute status for each
    invoices.forEach(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      i._paid = paid;
      i._balance = Number(i.amount) - paid;
      i._status = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    });

    if (filter) invoices = invoices.filter(i => i._status === filter);
    const search = (document.getElementById('inv-filter-search')?.value || '').toLowerCase().trim();
    if (search) invoices = invoices.filter(i =>
      (i.clientName || '').toLowerCase().includes(search) ||
      (i.tourName || '').toLowerCase().includes(search) ||
      (i.number || '').toLowerCase().includes(search)
    );
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Stats
    const all = DB.getInvoices();
    all.forEach(i => { i._paid = (i.payments||[]).reduce((s,p)=>s+Number(p.amount),0); });
    const totalInvoiced = all.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalCollected = all.reduce((s, i) => s + i._paid, 0);
    const outstanding = totalInvoiced - totalCollected;

    document.getElementById('invoicing-stats').innerHTML = `
      <div class="stat-card blue"><div class="stat-label">Total Invoiced</div><div class="stat-value">${fmt(totalInvoiced)}</div></div>
      <div class="stat-card green"><div class="stat-label">Collected</div><div class="stat-value">${fmt(totalCollected)}</div></div>
      <div class="stat-card red"><div class="stat-label">Outstanding</div><div class="stat-value">${fmt(outstanding)}</div></div>
    `;

    if (!invoices.length) {
      document.getElementById('invoicing-table-container').innerHTML = '<div class="empty-state">No invoices yet.</div>';
      this.renderFinancialReports();
      return;
    }

    document.getElementById('invoicing-table-container').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Invoice #</th><th>Client</th><th>Tour</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${invoices.map(i => `
          <tr class="row-clickable" ondblclick="Invoicing.viewInvoice(${i.id})">
            <td>${i.number}</td>
            <td>${i.clientName || '—'}</td>
            <td>${i.tourName || '—'}</td>
            <td>${fmt(i.amount, i.currency)}</td>
            <td>${fmt(i._paid, i.currency)}</td>
            <td>${fmt(i._balance, i.currency)}</td>
            <td class="${isOverdue(i.dueDate) && i._status !== 'Paid' ? 'overdue' : ''}">${fmtDate(i.dueDate)}</td>
            <td><span class="badge ${badgeClass(i._status)}">${i._status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="Invoicing.viewInvoice(${i.id})">View</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;

    this.renderFinancialReports();
  },

  showCreateModal() {
    const tours = DB.getTours();
    const quotes = DB.getQuotes();
    document.getElementById('inv-modal').style.display = 'flex';
    document.getElementById('inv-modal-content').innerHTML = `
      <h2>Create Invoice</h2>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Client Name</label><input id="inv-client" placeholder="Client name"></div>
        <div class="form-group"><label>Custom Invoice Number (optional)</label><input id="inv-custom-number" placeholder="e.g. OT-2025-001"></div>
      </div>
      <div class="form-group"><label>Linked Tour / Quote</label>
        <select id="inv-tour" onchange="Invoicing.autoFillFromTour()">
          <option value="">— Select (optional) —</option>
          <optgroup label="Confirmed Tours">
            ${tours.map(t => `<option value="tour-${t.id}" data-name="${t.tourName}" data-client="${t.clientName}" data-type="tour">${t.tourName} — ${t.clientName || ''}</option>`).join('')}
          </optgroup>
          <optgroup label="Quotes">
            ${quotes.map(q => `<option value="quote-${q.id}" data-name="${q.tourName}" data-client="${q.clientName}" data-type="quote">Q-${String(q.id).padStart(4,'0')}: ${q.tourName} — ${q.clientName || ''} [${q.status}]</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Amount</label><input id="inv-amount" type="number" step="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>Currency</label><select id="inv-currency"><option value="EUR">EUR</option><option value="USD">USD</option></select></div>
        <div class="form-group"><label>Due Date</label><input id="inv-due" type="date"></div>
      </div>
      <div class="form-group"><label>Description / Items</label><textarea id="inv-desc" rows="4" placeholder="Invoice details, items breakdown..."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Invoicing.saveInvoice()">Create Invoice</button>
        <button class="btn btn-outline" onclick="closeModal('inv-modal')">Cancel</button>
      </div>`;
  },

  autoFillFromTour() {
    const sel = document.getElementById('inv-tour');
    const val = sel.value;
    if (!val) return;
    const [type, idStr] = val.split('-');
    const id = Number(idStr);
    let item = null;
    if (type === 'tour') {
      item = DB.getTours().find(x => x.id === id);
    } else if (type === 'quote') {
      item = DB.getQuotes().find(x => x.id === id);
    }
    if (item) {
      document.getElementById('inv-client').value = item.clientName || '';
      const revenue = ((item.priceStudent||0) * (item.numStudents||0)) + ((item.priceSibling||0) * (item.numSiblings||0)) + ((item.priceAdult||0) * (item.numAdults||0));
      document.getElementById('inv-amount').value = revenue || '';
      if (item.currency) document.getElementById('inv-currency').value = item.currency;
    }
  },

  saveInvoice() {
    const tourSel = document.getElementById('inv-tour');
    const val = tourSel.value;
    let tourId = null, tourName = '';
    if (val) {
      const [type, idStr] = val.split('-');
      const id = Number(idStr);
      if (type === 'tour') {
        tourId = id;
        const t = DB.getTours().find(x => x.id === id);
        tourName = t ? t.tourName : '';
      } else if (type === 'quote') {
        const q = DB.getQuotes().find(x => x.id === id);
        tourName = q ? q.tourName + ' (Quote)' : '';
      }
    }
    const customNumber = document.getElementById('inv-custom-number').value.trim();
    const inv = {
      clientName: document.getElementById('inv-client').value,
      tourId,
      tourName,
      amount: Number(document.getElementById('inv-amount').value) || 0,
      currency: document.getElementById('inv-currency').value,
      dueDate: document.getElementById('inv-due').value,
      description: document.getElementById('inv-desc').value,
      customNumber: customNumber || ''
    };
    const saved = DB.saveInvoice(inv);
    // If custom number provided, override the auto-generated number
    if (customNumber && saved) {
      saved.number = customNumber;
      DB.saveInvoice(saved);
    }
    closeModal('inv-modal');
    this.render();
    Dashboard.render();
    alert('Invoice created!');
  },

  viewInvoice(id) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i) return;
    const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Number(i.amount) - paid;
    const status = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

    document.getElementById('inv-modal').style.display = 'flex';
    document.getElementById('inv-modal-content').innerHTML = `
      <h2>Invoice ${i.number}</h2>
      <div class="grid-2" style="margin-bottom:1rem">
        <div>
          <p><strong>Client:</strong> ${i.clientName}</p>
          <p><strong>Tour:</strong> ${i.tourName || '—'}</p>
          <p><strong>Created:</strong> ${fmtDate(i.createdAt)}</p>
        </div>
        <div>
          <p><strong>Amount:</strong> ${fmt(i.amount, i.currency)}</p>
          <p><strong>Due Date:</strong> <span class="${isOverdue(i.dueDate) && status !== 'Paid' ? 'overdue' : ''}">${fmtDate(i.dueDate)}</span></p>
          <p><strong>Status:</strong> <span class="badge ${badgeClass(status)}">${status}</span></p>
        </div>
      </div>
      ${i.description ? `<p style="margin-bottom:1rem;white-space:pre-wrap;background:var(--gray-50);padding:0.8rem;border-radius:var(--radius)">${i.description}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div class="price-card"><div class="pc-label">Total</div><div class="pc-price">${fmt(i.amount, i.currency)}</div></div>
        <div class="price-card" style="border:2px solid var(--green)"><div class="pc-label">Paid</div><div class="pc-price" style="color:var(--green)">${fmt(paid, i.currency)}</div></div>
        <div class="price-card" style="border:2px solid ${balance > 0 ? 'var(--red)' : 'var(--green)'}"><div class="pc-label">Balance</div><div class="pc-price" style="color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">${fmt(balance, i.currency)}</div></div>
      </div>
      <h3>Payment History</h3>
      ${(i.payments && i.payments.length) ? `
        <table class="data-table" style="margin-bottom:1rem;font-size:0.82rem">
          <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>${i.payments.map((p, pi) => `<tr id="pay-row-${pi}">
            <td><input type="date" value="${p.date||''}" id="pay-edit-date-${pi}" style="padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)"></td>
            <td><input type="number" step="0.01" value="${p.amount||0}" id="pay-edit-amount-${pi}" style="width:80px;padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)"></td>
            <td><select id="pay-edit-method-${pi}" style="padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)">
              <option ${p.method==='Bank Transfer'?'selected':''}>Bank Transfer</option>
              <option ${p.method==='Cash'?'selected':''}>Cash</option>
              <option ${p.method==='Card'?'selected':''}>Card</option>
              <option ${p.method==='Wise'?'selected':''}>Wise</option>
              <option ${p.method==='Other'?'selected':''}>Other</option>
            </select></td>
            <td><input value="${(p.notes||'').replace(/"/g,'&quot;')}" id="pay-edit-notes-${pi}" style="width:100%;padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)"></td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" style="font-size:0.72rem;padding:0.15rem 0.4rem" onclick="Invoicing.savePaymentEdit(${i.id},${pi})">Save</button>
              <button class="btn btn-sm btn-danger" style="font-size:0.72rem;padding:0.15rem 0.4rem" onclick="Invoicing.deletePayment(${i.id},${pi})">X</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>` : '<p style="color:var(--gray-400);margin-bottom:1rem">No payments recorded yet.</p>'}
      ${status !== 'Paid' ? `
        <h3>Record Payment</h3>
        <div class="form-row form-row-4">
          <div class="form-group"><label>Amount</label><input id="pay-amount" type="number" step="0.01" value="${balance}"></div>
          <div class="form-group"><label>Date</label><input id="pay-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label>Method</label><select id="pay-method"><option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Other</option></select></div>
          <div class="form-group"><label>Notes</label><input id="pay-notes" placeholder="Optional"></div>
        </div>
        <button class="btn btn-success" onclick="Invoicing.addPayment(${i.id})">Record Payment</button>` : ''}
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin:1rem 0">
        <h3 style="margin-bottom:0.6rem;font-size:0.95rem">Payment Links (for PDF Invoice)</h3>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Credit Card Payment Link</label><input id="inv-link-card" value="${i.paymentLinkCard || ''}" placeholder="e.g. https://pay.stripe.com/your-link"></div>
          <div class="form-group"><label>Wise Payment Link</label><input id="inv-link-wise" value="${i.paymentLinkWise || ''}" placeholder="e.g. https://wise.com/pay/your-link"></div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="Invoicing.savePaymentLinks(${i.id})" style="margin-top:0.3rem">Save Links</button>
      </div>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin:1rem 0">
        <h3 style="margin-bottom:0.6rem;font-size:0.95rem">Payment Schedule</h3>
        ${(i.paymentSchedule && i.paymentSchedule.length) ? `
          <table class="data-table" style="margin-bottom:0.8rem;font-size:0.82rem">
            <thead><tr><th>Milestone</th><th>%</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${i.paymentSchedule.map((ms, mi) => {
              const msStatus = ms.status || 'Pending';
              return `<tr>
                <td><input value="${(ms.label||'').replace(/"/g,'&quot;')}" style="width:120px;padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Invoicing.saveMilestone(${i.id},${mi},'label',this.value)"></td>
                <td><input type="number" step="1" value="${ms.percentage||''}" style="width:50px;padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Invoicing.saveMilestone(${i.id},${mi},'percentage',this.value)"></td>
                <td><input type="number" step="0.01" value="${ms.amount||''}" style="width:80px;padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Invoicing.saveMilestone(${i.id},${mi},'amount',this.value)"></td>
                <td><input type="date" value="${ms.dueDate||''}" style="padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Invoicing.saveMilestone(${i.id},${mi},'dueDate',this.value)"></td>
                <td><select style="padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);background:${msStatus === 'Paid' ? 'var(--green)' : 'var(--amber)'};color:#fff;font-weight:600;cursor:pointer" onchange="Invoicing.saveMilestone(${i.id},${mi},'status',this.value)">
                  <option value="Pending" ${msStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="Paid" ${msStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                </select></td>
                <td><button class="btn btn-sm btn-danger" style="font-size:0.72rem;padding:0.15rem 0.4rem" onclick="Invoicing.removeMilestone(${i.id},${mi})">X</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No payment milestones set.</p>'}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="Invoicing.addMilestone(${i.id})">+ Add Milestone</button>
          ${!(i.paymentSchedule && i.paymentSchedule.length) ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Invoicing.addDefaultSchedule(${i.id})">Add Default (30/70)</button>` : ''}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="Invoicing.savePaymentLinks(${i.id});PDFQuote.generateInvoice(${i.id})" style="border-color:#111;color:#111">PDF Invoice</button>
        <button class="btn btn-danger" onclick="if(confirm('Delete this invoice?')){Invoicing.deleteInvoice(${i.id})}">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('inv-modal')">Close</button>
      </div>`;
  },

  addPayment(id) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i) return;
    if (!i.payments) i.payments = [];
    i.payments.push({
      amount: Number(document.getElementById('pay-amount').value) || 0,
      date: document.getElementById('pay-date').value,
      method: document.getElementById('pay-method').value,
      notes: document.getElementById('pay-notes').value
    });
    DB.saveInvoice(i);
    this.viewInvoice(id);
    this.render();
    Dashboard.render();
  },

  savePaymentLinks(id) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i) return;
    const cardEl = document.getElementById('inv-link-card');
    const wiseEl = document.getElementById('inv-link-wise');
    if (cardEl) i.paymentLinkCard = cardEl.value.trim();
    if (wiseEl) i.paymentLinkWise = wiseEl.value.trim();
    DB.saveInvoice(i);
  },

  savePaymentEdit(invoiceId, payIdx) {
    const i = DB.getInvoices().find(x => x.id === invoiceId);
    if (!i || !i.payments || !i.payments[payIdx]) return;
    i.payments[payIdx].date = document.getElementById('pay-edit-date-' + payIdx).value;
    i.payments[payIdx].amount = Number(document.getElementById('pay-edit-amount-' + payIdx).value) || 0;
    i.payments[payIdx].method = document.getElementById('pay-edit-method-' + payIdx).value;
    i.payments[payIdx].notes = document.getElementById('pay-edit-notes-' + payIdx).value;
    DB.saveInvoice(i);
    this.viewInvoice(invoiceId);
    this.render();
    Dashboard.render();
  },

  deletePayment(invoiceId, payIdx) {
    if (!confirm('Delete this payment record?')) return;
    const i = DB.getInvoices().find(x => x.id === invoiceId);
    if (!i || !i.payments) return;
    i.payments.splice(payIdx, 1);
    DB.saveInvoice(i);
    this.viewInvoice(invoiceId);
    this.render();
    Dashboard.render();
  },

  deleteInvoice(id) {
    DB.deleteInvoice(id);
    closeModal('inv-modal');
    this.render();
    Dashboard.render();
  },

  addMilestone(id) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i) return;
    if (!i.paymentSchedule) i.paymentSchedule = [];
    i.paymentSchedule.push({ label: '', percentage: 0, amount: 0, dueDate: '', status: 'Pending' });
    DB.saveInvoice(i);
    this.viewInvoice(id);
  },

  saveMilestone(id, idx, field, value) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i || !i.paymentSchedule || !i.paymentSchedule[idx]) return;
    if (field === 'percentage') {
      i.paymentSchedule[idx].percentage = Number(value) || 0;
      i.paymentSchedule[idx].amount = Number(i.amount) * (Number(value) || 0) / 100;
    } else if (field === 'amount') {
      i.paymentSchedule[idx].amount = Number(value) || 0;
      if (Number(i.amount) > 0) i.paymentSchedule[idx].percentage = ((Number(value) || 0) / Number(i.amount) * 100);
    } else if (field === 'status') {
      i.paymentSchedule[idx].status = value;
    } else if (field === 'label' || field === 'dueDate') {
      i.paymentSchedule[idx][field] = value;
    }
    DB.saveInvoice(i);
    this.viewInvoice(id);
  },

  removeMilestone(id, idx) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i || !i.paymentSchedule) return;
    i.paymentSchedule.splice(idx, 1);
    DB.saveInvoice(i);
    this.viewInvoice(id);
  },

  addDefaultSchedule(id) {
    const i = DB.getInvoices().find(x => x.id === id);
    if (!i) return;
    const amt = Number(i.amount) || 0;
    i.paymentSchedule = [
      { label: 'Deposit 30%', percentage: 30, amount: Math.round(amt * 0.3 * 100) / 100, dueDate: '', status: 'Pending' },
      { label: 'Balance 70%', percentage: 70, amount: Math.round(amt * 0.7 * 100) / 100, dueDate: '', status: 'Pending' }
    ];
    DB.saveInvoice(i);
    this.viewInvoice(id);
  },

  exportAccounting() {
    const invoices = DB.getInvoices();
    invoices.forEach(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      i._paid = paid;
      i._balance = Number(i.amount) - paid;
      i._status = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    });
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [['Date', 'Invoice #', 'Client', 'Description', 'Amount', 'VAT (21%)', 'Total+VAT', 'Currency', 'Status', 'Payments Received']];
    invoices.forEach(i => {
      const vat = (Number(i.amount) || 0) * 0.21;
      const totalVAT = (Number(i.amount) || 0) + vat;
      const paymentsStr = (i.payments || []).map(p => p.date + ': ' + p.amount + ' (' + (p.method || '') + ')').join('; ');
      rows.push([
        i.createdAt ? i.createdAt.slice(0, 10) : '',
        esc(i.number), esc(i.clientName), esc(i.description || i.tourName || ''),
        (Number(i.amount) || 0).toFixed(2), vat.toFixed(2), totalVAT.toFixed(2),
        i.currency || 'EUR', i._status, esc(paymentsStr)
      ]);
    });
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'accounting_export_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportProviderCosts() {
    const tours = DB.getTours();
    const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [['Tour', 'Provider', 'Category', 'Description', 'Amount', 'Paid Amount', 'Status', 'Invoice Received', 'Invoice Ref', 'Currency']];
    tours.forEach(t => {
      (t.providerExpenses || []).forEach(e => {
        rows.push([
          esc(t.tourName), esc(e.providerName), esc(e.category), esc(e.description),
          (e.amount || 0).toFixed(2), (e.paidAmount || 0).toFixed(2),
          e.paid ? 'Paid' : 'Unpaid', e.invoiceReceived ? 'Yes' : 'No',
          esc(e.invoiceRef), t.currency || 'EUR'
        ]);
      });
    });
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'provider_costs_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  renderFinancialReports() {
    let container = document.getElementById('financial-reports-container');
    if (!container) {
      // Dynamically create the reports section if HTML doesn't have it yet (cache)
      const tableContainer = document.getElementById('invoicing-table-container');
      if (!tableContainer) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginTop = '1.5rem';
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h3>Financial Reports</h3><button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Invoicing.exportFinancialReports()">Export All Reports CSV</button></div><div id="financial-reports-container"></div>`;
      tableContainer.parentNode.insertBefore(card, tableContainer.nextSibling);
      container = document.getElementById('financial-reports-container');
    }

    const invoices = DB.getInvoices();
    const tours = DB.getTours();

    // Auto-calculate costs for tours that don't have them yet
    tours.forEach(t => {
      if (!t.costs) {
        const tp = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
        const paying = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0);
        const days = (t.nights||0) + 1;
        let accommodation = 0, meals = 0;
        if (t.hotels && t.hotels.length > 0) {
          t.hotels.forEach(h => {
            const hN = h.nights || t.nights || 0;
            if (h.rooms && h.rooms.length > 0) accommodation += h.rooms.reduce((s, r) => s + (r.qty||0) * (r.costPerNight||0) * hN, 0);
            else accommodation += (h.costPerNightPerRoom||0) * (h.numRooms||0) * hN;
            meals += (h.mealCostPerPersonPerDay||0) * tp * (hN + 1);
          });
        } else {
          accommodation = (t.costPerNightPerRoom||0) * (t.numRooms||0) * (t.nights||0);
          meals = (t.mealCostPerPersonPerDay||0) * tp * days;
        }
        const flights = (t.flightCostPerPerson||0) * tp;
        const transport = flights + (t.airportTransfers||0) + (t.coachHire||0) + (t.internalTransport||0);
        const activities = (t.activities||[]).reduce((s,a) => { if (a.isFree) return s; return s + (a.costPerPerson||0) * (a.playersOnly ? (t.numStudents||0) : tp); }, 0);
        const guide = ((t.numGuides||0) * (t.guideDailyRate||0) * days) + (t.guideFlights||0) + (t.guideAccommodation||0) + (t.guideMeals||0);
        const grand = accommodation + meals + transport + activities + guide;
        const totalRevenue = ((t.priceStudent||0) * (t.numStudents||0)) + ((t.priceSibling||0) * (t.numSiblings||0)) + ((t.priceAdult||0) * (t.numAdults||0));
        t.costs = { accommodation, meals, flights, transport, activities, guide, grand, totalParticipants: tp, payingParticipants: paying, costPerPerson: paying > 0 ? grand / paying : 0, days, totalRevenue, profit: totalRevenue - grand, margin: totalRevenue > 0 ? ((totalRevenue - grand) / totalRevenue * 100) : 0 };
      }
    });

    invoices.forEach(i => {
      i._paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      i._balance = Number(i.amount) - i._paid;
    });

    // P&L Summary
    let totalRevenue = 0, totalCosts = 0, totalCommissions = 0;
    tours.forEach(t => {
      const c = t.costs || {};
      totalRevenue += c.totalRevenue || 0;
      totalCosts += c.grand || 0;
      if (t.commissionRate && c.totalRevenue) {
        totalCommissions += c.totalRevenue * (t.commissionRate || 0) / 100;
      }
    });
    const grossProfit = totalRevenue - totalCosts;
    const netProfit = grossProfit - totalCommissions;

    // Revenue by Destination
    const destMap = {};
    tours.forEach(t => {
      const dest = t.destination || 'Unknown';
      if (!destMap[dest]) destMap[dest] = { revenue: 0, cost: 0, tours: 0 };
      destMap[dest].revenue += (t.costs && t.costs.totalRevenue) || 0;
      destMap[dest].cost += (t.costs && t.costs.grand) || 0;
      destMap[dest].tours++;
    });
    const destArr = Object.entries(destMap).map(([dest, d]) => ({ dest, ...d, profit: d.revenue - d.cost })).sort((a, b) => b.revenue - a.revenue);

    // Client Revenue Ranking
    const clientMap = {};
    tours.forEach(t => {
      const client = t.clientName || 'Unknown';
      if (!clientMap[client]) clientMap[client] = { revenue: 0, tours: 0 };
      clientMap[client].revenue += (t.costs && t.costs.totalRevenue) || 0;
      clientMap[client].tours++;
    });
    const clientArr = Object.entries(clientMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue);

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr;gap:1.5rem">
        <div>
          <h4 style="margin-bottom:0.8rem;font-size:0.95rem;color:var(--navy)">P&L Summary</h4>
          <table class="data-table" style="font-size:0.85rem">
            <tbody>
              <tr><td><strong>Total Revenue</strong></td><td style="text-align:right;color:var(--green);font-weight:600">${fmt(totalRevenue)}</td></tr>
              <tr><td><strong>Total Costs</strong></td><td style="text-align:right;color:var(--red);font-weight:600">${fmt(totalCosts)}</td></tr>
              <tr style="border-top:2px solid var(--gray-200)"><td><strong>Gross Profit</strong></td><td style="text-align:right;color:${grossProfit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${fmt(grossProfit)}</td></tr>
              <tr><td><strong>Commissions</strong></td><td style="text-align:right;color:var(--navy);font-weight:600">${fmt(totalCommissions)}</td></tr>
              <tr style="border-top:2px solid var(--gray-200)"><td><strong>Net Profit</strong></td><td style="text-align:right;font-size:1.05rem;color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${fmt(netProfit)}</td></tr>
              <tr><td>Margin</td><td style="text-align:right">${totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) + '%' : '—'}</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 style="margin-bottom:0.8rem;font-size:0.95rem;color:var(--navy)">Revenue by Destination</h4>
          ${destArr.length ? `<table class="data-table" style="font-size:0.85rem">
            <thead><tr><th>Destination</th><th>Tours</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
            <tbody>${destArr.map(d => `<tr>
              <td><strong>${d.dest}</strong></td>
              <td>${d.tours}</td>
              <td>${fmt(d.revenue)}</td>
              <td>${fmt(d.cost)}</td>
              <td style="color:${d.profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fmt(d.profit)}</td>
            </tr>`).join('')}</tbody>
          </table>` : '<div class="empty-state">No tour data yet.</div>'}
        </div>

        <div>
          <h4 style="margin-bottom:0.8rem;font-size:0.95rem;color:var(--navy)">Client Revenue Ranking</h4>
          ${clientArr.length ? `<table class="data-table" style="font-size:0.85rem">
            <thead><tr><th>#</th><th>Client</th><th>Tours</th><th>Revenue</th></tr></thead>
            <tbody>${clientArr.slice(0, 15).map((c, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${c.name}</strong></td>
              <td>${c.tours}</td>
              <td style="font-weight:600">${fmt(c.revenue)}</td>
            </tr>`).join('')}</tbody>
          </table>` : '<div class="empty-state">No client data yet.</div>'}
        </div>
      </div>`;
  },

  exportFinancialReports() {
    const tours = DB.getTours();
    const invoices = DB.getInvoices();
    const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };

    const rows = [];
    rows.push(['=== P&L SUMMARY ===']);
    rows.push(['Category', 'Amount']);
    let totalRevenue = 0, totalCosts = 0, totalCommissions = 0;
    tours.forEach(t => {
      const c = t.costs || {};
      totalRevenue += c.totalRevenue || 0;
      totalCosts += c.grand || 0;
      if (t.commissionRate && c.totalRevenue) totalCommissions += c.totalRevenue * (t.commissionRate||0) / 100;
    });
    rows.push(['Total Revenue', totalRevenue.toFixed(2)]);
    rows.push(['Total Costs', totalCosts.toFixed(2)]);
    rows.push(['Gross Profit', (totalRevenue - totalCosts).toFixed(2)]);
    rows.push(['Commissions', totalCommissions.toFixed(2)]);
    rows.push(['Net Profit', (totalRevenue - totalCosts - totalCommissions).toFixed(2)]);
    rows.push([]);
    rows.push(['=== REVENUE BY DESTINATION ===']);
    rows.push(['Destination', 'Tours', 'Revenue', 'Cost', 'Profit']);
    const destMap = {};
    tours.forEach(t => {
      const dest = t.destination || 'Unknown';
      if (!destMap[dest]) destMap[dest] = { revenue: 0, cost: 0, tours: 0 };
      destMap[dest].revenue += (t.costs && t.costs.totalRevenue) || 0;
      destMap[dest].cost += (t.costs && t.costs.grand) || 0;
      destMap[dest].tours++;
    });
    Object.entries(destMap).sort((a,b) => b[1].revenue - a[1].revenue).forEach(([dest, d]) => {
      rows.push([esc(dest), d.tours, d.revenue.toFixed(2), d.cost.toFixed(2), (d.revenue - d.cost).toFixed(2)]);
    });
    rows.push([]);
    rows.push(['=== CLIENT REVENUE RANKING ===']);
    rows.push(['Client', 'Tours', 'Revenue']);
    const clientMap = {};
    tours.forEach(t => {
      const client = t.clientName || 'Unknown';
      if (!clientMap[client]) clientMap[client] = { revenue: 0, tours: 0 };
      clientMap[client].revenue += (t.costs && t.costs.totalRevenue) || 0;
      clientMap[client].tours++;
    });
    Object.entries(clientMap).sort((a,b) => b[1].revenue - a[1].revenue).forEach(([name, d]) => {
      rows.push([esc(name), d.tours, d.revenue.toFixed(2)]);
    });

    const csv = '\uFEFF' + rows.map(r => Array.isArray(r) ? r.join(',') : r).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'financial_reports_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportCSV() {
    const filter = document.getElementById('inv-filter-status').value;
    let invoices = DB.getInvoices();
    invoices.forEach(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      i._paid = paid;
      i._balance = Number(i.amount) - paid;
      i._status = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    });
    if (filter) invoices = invoices.filter(i => i._status === filter);
    const search = (document.getElementById('inv-filter-search')?.value || '').toLowerCase().trim();
    if (search) invoices = invoices.filter(i =>
      (i.clientName || '').toLowerCase().includes(search) ||
      (i.tourName || '').toLowerCase().includes(search) ||
      (i.number || '').toLowerCase().includes(search)
    );
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [['Invoice #','Client','Tour','Amount','Currency','Paid','Balance','Due Date','Status','Created','Commission Agent','Commission Rate']];
    invoices.forEach(i => {
      const tour = i.tourId ? DB.getTours().find(x => x.id === i.tourId) : null;
      rows.push([esc(i.number), esc(i.clientName), esc(i.tourName), i.amount || 0, i.currency || 'EUR', i._paid || 0, i._balance || 0, i.dueDate || '', i._status, i.createdAt ? i.createdAt.slice(0, 10) : '', esc(tour && tour.commissionAgent || ''), tour && tour.commissionRate ? tour.commissionRate + '%' : '']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoices_export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
