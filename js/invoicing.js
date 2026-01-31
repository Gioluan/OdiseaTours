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
  }
};
