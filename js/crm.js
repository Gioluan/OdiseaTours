/* === QUOTES & CRM MODULE === */
const CRM = {
  init() { this.render(); },

  render() {
    const statusFilter = document.getElementById('crm-filter-status').value;
    const destFilter = document.getElementById('crm-filter-dest').value;
    const search = document.getElementById('crm-search').value.toLowerCase();

    let quotes = DB.getQuotes();
    if (statusFilter) quotes = quotes.filter(q => q.status === statusFilter);
    if (destFilter) quotes = quotes.filter(q => q.destination === destFilter);
    if (search) quotes = quotes.filter(q =>
      (q.clientName || '').toLowerCase().includes(search) ||
      (q.tourName || '').toLowerCase().includes(search)
    );

    quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!quotes.length) {
      document.getElementById('crm-table-container').innerHTML = '<div class="empty-state">No quotes found. Create one from the New Quote tab.</div>';
      return;
    }

    document.getElementById('crm-table-container').innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>Quote #</th><th>Client</th><th>Tour</th><th>Destination</th><th>Dates</th><th>Total</th><th>Exp. Profit</th><th>Status</th><th>Follow-up</th><th>Actions</th>
        </tr></thead>
        <tbody>${quotes.map(q => {
          const overdue = q.followUpDate && isOverdue(q.followUpDate) && q.status !== 'Confirmed' && q.status !== 'Lost';
          const awaitingRFQs = (q.rfqs || []).filter(r => r.status === 'Awaiting').length;
          return `<tr class="row-clickable" ondblclick="CRM.viewQuote(${q.id})">
            <td>Q-${String(q.id).padStart(4,'0')}${awaitingRFQs > 0 ? ` <span style="display:inline-flex;align-items:center;justify-content:center;background:var(--amber);color:white;font-size:0.65rem;font-weight:700;width:16px;height:16px;border-radius:50%" title="${awaitingRFQs} RFQ(s) awaiting reply">${awaitingRFQs}</span>` : ''}</td>
            <td>${q.clientName || '—'}</td>
            <td>${q.tourName || '—'}</td>
            <td>${q.destination || '—'}</td>
            <td>${fmtDate(q.startDate)}</td>
            <td>${fmt(q.costs ? q.costs.grand : 0, q.currency)}</td>
            <td style="color:${(() => { const rev = ((q.priceStudent||0)*(q.numStudents||0))+((q.priceSibling||0)*(q.numSiblings||0))+((q.priceAdult||0)*(q.numAdults||0)); const p = rev - (q.costs?q.costs.grand:0); return p >= 0 ? 'var(--green)' : 'var(--red)'; })()};font-weight:600">${(() => { const rev = ((q.priceStudent||0)*(q.numStudents||0))+((q.priceSibling||0)*(q.numSiblings||0))+((q.priceAdult||0)*(q.numAdults||0)); return fmt(rev - (q.costs?q.costs.grand:0), q.currency); })()}</td>
            <td><span class="badge ${badgeClass(q.status)}">${q.status}</span></td>
            <td class="${overdue ? 'overdue' : ''}">${fmtDate(q.followUpDate)}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="CRM.viewQuote(${q.id})">View</button>
              <select class="btn btn-sm" style="padding:0.25rem;font-size:0.78rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="CRM.editStatus(${q.id},this.value);this.value=''">
                <option value="">Status...</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Lost">Lost</option>
              </select>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  },

  viewQuote(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    const c = q.costs || {};
    const dest = q.destination;

    // Build hotel info with room breakdown
    const roomsLabel = (rooms) => (rooms || []).map(r => `${r.qty}x ${r.type} @ ${fmt(r.costPerNight, q.currency)}/night`).join(', ');
    let hotelHTML = '';
    if (q.hotels && q.hotels.length > 1) {
      hotelHTML = '<p><strong>Hotels:</strong></p>' + q.hotels.map(h =>
        `<p style="margin-left:0.5rem"><strong>${h.city}:</strong> ${h.hotelName || '—'} ${'★'.repeat(h.starRating||0)} (${h.nights} nights, ${h.mealPlan})</p>
         <p style="margin-left:1rem;font-size:0.85rem;color:var(--gray-500)">Rooms: ${roomsLabel(h.rooms) || '—'}</p>`
      ).join('');
    } else if (q.hotels && q.hotels.length === 1) {
      const h0 = q.hotels[0];
      hotelHTML = `<p><strong>Hotel:</strong> ${h0.hotelName || q.hotelName || '—'} ${'★'.repeat(h0.starRating||q.starRating||0)}</p>
        <p><strong>Rooms:</strong> ${roomsLabel(h0.rooms) || '—'}</p>
        <p><strong>Meal Plan:</strong> ${h0.mealPlan || q.mealPlan || '—'}</p>`;
    } else {
      hotelHTML = `<p><strong>Hotel:</strong> ${q.hotelName || '—'} ${'★'.repeat(q.starRating||0)}</p>
        <p><strong>Meal Plan:</strong> ${q.mealPlan || '—'}</p>`;
    }

    document.getElementById('crm-modal').style.display = 'flex';
    document.getElementById('crm-modal-content').innerHTML = `
      <h2>Quote Q-${String(q.id).padStart(4,'0')}: ${q.tourName || 'Untitled'}</h2>
      <div class="grid-2" style="margin-bottom:1rem">
        <div>
          <p><strong>Destination:</strong> ${dest}</p>
          <p><strong>Dates:</strong> ${fmtDate(q.startDate)} — ${fmtDate(q.endDate)} (${q.nights} nights)</p>
          ${hotelHTML}
          <p><strong>Created:</strong> ${fmtDate(q.createdAt)}</p>
        </div>
        <div>
          <p><strong>Client:</strong> ${q.clientName || '—'}${q.clientId ? ` <a href="#" onclick="closeModal('crm-modal');App.switchTab('clients');setTimeout(()=>Clients.viewClient(${q.clientId}),100);return false" style="color:var(--amber);font-size:0.82rem">(view)</a>` : ''}</p>
          <p><strong>Email:</strong> ${q.clientEmail || '—'}</p>
          <p><strong>Phone:</strong> ${q.clientPhone || '—'}</p>
          <p><strong>Follow-up:</strong> ${fmtDate(q.followUpDate)}</p>
          <p><strong>Status:</strong> <span class="badge ${badgeClass(q.status)}">${q.status}</span></p>
        </div>
      </div>
      <h3>Group</h3>
      <p>Students: ${q.numStudents} | Siblings: ${q.numSiblings} | Adults: ${q.numAdults} | Total: ${c.totalParticipants || 0}</p>
      <div class="cost-summary" style="margin:1rem 0">
        <h3>Cost Breakdown</h3>
        <div class="cost-line"><span>Accommodation</span><span>${fmt(c.accommodation, q.currency)}</span></div>
        <div class="cost-line"><span>Meals</span><span>${fmt(c.meals, q.currency)}</span></div>
        <div class="cost-line"><span>Transport</span><span>${fmt(c.transport, q.currency)}</span></div>
        <div class="cost-line"><span>Activities</span><span>${fmt(c.activities, q.currency)}</span></div>
        <div class="cost-line"><span>Guide</span><span>${fmt(c.guide, q.currency)}</span></div>
        <div class="cost-line total"><span>TOTAL</span><span class="cost-val">${fmt(c.grand, q.currency)}</span></div>
      </div>
      <h3>Pricing</h3>
      <div class="pricing-cards" style="margin-bottom:1rem">
        <div class="price-card"><div class="pc-label">Student</div><div class="pc-price">${fmt(q.priceStudent, q.currency)}</div></div>
        <div class="price-card"><div class="pc-label">Sibling</div><div class="pc-price">${fmt(q.priceSibling, q.currency)}</div></div>
        <div class="price-card"><div class="pc-label">Adult</div><div class="pc-price">${fmt(q.priceAdult, q.currency)}</div></div>
      </div>
      ${CRM._renderRFQTracker(q)}
      <div class="modal-actions" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="CRM.editQuote(${q.id})">Edit Quote</button>
        <button class="btn btn-outline" onclick="PDFQuote.generate(${q.id})" style="border-color:#111;color:#111">PDF Quote</button>
        <button class="btn btn-outline" onclick="CRM.emailClient(${q.id})" style="border-color:var(--amber);color:var(--amber)">Email Client</button>
        <button class="btn btn-outline" onclick="CRM.requestProviderQuotes(${q.id})" style="border-color:var(--navy);color:var(--navy)">Request Provider Quotes</button>
        ${q.status === 'Confirmed' ? `<button class="btn btn-success" onclick="CRM.convertToTour(${q.id})">Convert to Tour</button>` : ''}
        <button class="btn btn-danger" onclick="if(confirm('Delete this quote?')){DB.deleteQuote(${q.id});closeModal('crm-modal');CRM.render();Dashboard.render();}">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('crm-modal')">Close</button>
      </div>`;
  },

  editQuote(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    closeModal('crm-modal');
    Quote.loadQuote(q);
    App.switchTab('new-quote');
  },

  editStatus(id, newStatus) {
    if (!newStatus) return;
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    q.status = newStatus;
    DB.saveQuote(q);
    // Auto-convert to confirmed tour when status set to Confirmed
    if (newStatus === 'Confirmed') {
      this.convertToTour(id);
      return;
    }
    this.render();
    Dashboard.render();
  },

  emailClient(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    if (!q.clientEmail) { alert('No client email on this quote.'); return; }

    // Show email action picker
    const modal = document.getElementById('crm-modal-content');
    const actionsArea = modal.querySelector('.modal-actions');
    if (!actionsArea) return;
    actionsArea.outerHTML = `
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-top:1rem" id="crm-email-panel">
        <h4 style="margin-bottom:0.7rem">Email Client — ${q.clientName || 'Client'}</h4>
        <div class="form-group"><label>Template</label>
          <select id="crm-email-tmpl" onchange="CRM._fillEmailTemplate(${q.id})">
            <option value="send-quote">Send Quote</option>
            <option value="follow-up">Follow Up</option>
            <option value="confirm-booking">Confirm Booking</option>
            <option value="custom">Custom Email</option>
          </select>
        </div>
        <div class="form-group"><label>Subject</label><input id="crm-email-subject" value="Tour Quote — ${q.tourName || ''}"></div>
        <div class="form-group"><label>Body</label><textarea id="crm-email-body" rows="8">${CRM._emailBody('send-quote', q)}</textarea></div>
        <div style="display:flex;gap:0.5rem;margin-top:0.7rem">
          <button class="btn btn-primary" onclick="CRM._sendClientEmail(${q.id})">Open in Outlook</button>
          <button class="btn btn-outline" onclick="CRM.viewQuote(${q.id})">Back</button>
        </div>
      </div>`;
  },

  _emailBody(tmpl, q) {
    const sig = '\\nKind regards,\\nJuan\\nOdisea Tours\\njuan@odisea-tours.com';
    const name = q.clientName || 'Client';
    const dest = q.destination || '';
    const dates = fmtDate(q.startDate) + ' — ' + fmtDate(q.endDate);
    const total = fmt(q.costs ? q.costs.grand : 0, q.currency);
    const group = `${q.numStudents||0} students, ${q.numSiblings||0} siblings, ${q.numAdults||0} adults`;

    if (tmpl === 'send-quote') {
      return `Dear ${name},\\n\\nPlease find below our quote for the tour "${q.tourName || ''}" to ${dest}.\\n\\nDates: ${dates} (${q.nights} nights)\\nGroup: ${group}\\nTotal: ${total}\\nPrice per student: ${fmt(q.priceStudent, q.currency)}\\nPrice per sibling: ${fmt(q.priceSibling, q.currency)}\\nPrice per adult: ${fmt(q.priceAdult, q.currency)}\\n\\nPlease let us know if you have any questions or would like to proceed.\\n${sig}`;
    }
    if (tmpl === 'follow-up') {
      return `Dear ${name},\\n\\nWe wanted to follow up on the quote we sent for "${q.tourName || ''}" to ${dest}.\\n\\nDates: ${dates}\\nTotal: ${total}\\n\\nWould you like to go ahead with the booking or do you have any questions?\\n${sig}`;
    }
    if (tmpl === 'confirm-booking') {
      return `Dear ${name},\\n\\nGreat news! Your tour "${q.tourName || ''}" to ${dest} is now confirmed.\\n\\nDates: ${dates} (${q.nights} nights)\\nGroup: ${group}\\n\\nWe will be in touch with further details and payment information shortly.\\n${sig}`;
    }
    return `Dear ${name},\\n\\n\\n${sig}`;
  },

  _fillEmailTemplate(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    const tmpl = document.getElementById('crm-email-tmpl').value;
    const subjects = { 'send-quote': 'Tour Quote — ', 'follow-up': 'Follow Up — ', 'confirm-booking': 'Booking Confirmed — ', 'custom': '' };
    document.getElementById('crm-email-subject').value = (subjects[tmpl] || '') + (q.tourName || '');
    document.getElementById('crm-email-body').value = CRM._emailBody(tmpl, q);
  },

  _sendClientEmail(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q || !q.clientEmail) return;
    const subject = document.getElementById('crm-email-subject').value;
    const body = document.getElementById('crm-email-body').value;
    Email.sendEmail(q.clientEmail, subject, body);
    closeModal('crm-modal');
  },

  requestProviderQuotes(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    const providers = DB.getProviders();
    const dest = q.destination || '';
    // Filter providers by relevant cities from destinations
    const cities = (q.destinations && q.destinations.length > 0) ? q.destinations.map(d => d.city || d.custom || '') : [dest];
    const relevant = providers.filter(p => {
      if (!p.city) return true;
      return cities.some(c => c.toLowerCase().includes(p.city.toLowerCase()) || p.city.toLowerCase().includes(c.toLowerCase()));
    });

    // Group by city+category for quick-select buttons
    const groups = {};
    relevant.forEach(p => {
      const key = (p.city || 'Other') + ' / ' + (p.category || 'Other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p.id);
    });

    const hotelProviders = relevant.filter(p => p.category === 'Hotel');
    const transportProviders = relevant.filter(p => p.category === 'Transport');
    const otherProviders = relevant.filter(p => p.category !== 'Hotel' && p.category !== 'Transport');

    const providerCheckbox = (p) => `<label style="display:flex;gap:0.5rem;align-items:center;padding:0.3rem 0;font-size:0.88rem">
      <input type="checkbox" class="crm-rfq-provider" value="${p.id}" data-city="${p.city||''}" data-cat="${p.category||''}">
      <span><strong>${p.companyName}</strong> — ${p.contactPerson || ''} (${p.city || ''})</span>
    </label>`;

    // Quick-select buttons
    const quickBtns = Object.keys(groups).map(key =>
      `<button class="btn btn-sm btn-outline" style="font-size:0.78rem;padding:0.25rem 0.6rem" onclick="CRM._quickSelectProviders('${key}')">${key} (${groups[key].length})</button>`
    ).join(' ');

    const modal = document.getElementById('crm-modal-content');
    const actionsArea = modal.querySelector('.modal-actions') || modal.querySelector('#crm-email-panel') || modal.querySelector('#crm-rfq-panel');
    if (!actionsArea) return;
    actionsArea.outerHTML = `
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-top:1rem" id="crm-rfq-panel">
        <h4 style="margin-bottom:0.7rem">Request Provider Quotes</h4>
        <p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.7rem">Select providers to send RFQ for: <strong>${q.tourName}</strong> — ${dest} (${fmtDate(q.startDate)} — ${fmtDate(q.endDate)})</p>
        <div style="margin-bottom:0.8rem">
          <span style="font-size:0.82rem;font-weight:600;margin-right:0.5rem">Quick select:</span>
          ${quickBtns}
          <button class="btn btn-sm btn-outline" style="font-size:0.78rem;padding:0.25rem 0.6rem;margin-left:0.3rem" onclick="CRM._quickSelectProviders('ALL')">All</button>
          <button class="btn btn-sm btn-outline" style="font-size:0.78rem;padding:0.25rem 0.6rem;color:var(--red);border-color:var(--red)" onclick="CRM._quickSelectProviders('NONE')">Clear</button>
        </div>
        ${hotelProviders.length ? `<h5 style="font-size:0.85rem;margin-bottom:0.3rem;color:var(--amber)">Hotels</h5>${hotelProviders.map(providerCheckbox).join('')}` : ''}
        ${transportProviders.length ? `<h5 style="font-size:0.85rem;margin:0.5rem 0 0.3rem;color:var(--navy)">Transport</h5>${transportProviders.map(providerCheckbox).join('')}` : ''}
        ${otherProviders.length ? `<h5 style="font-size:0.85rem;margin:0.5rem 0 0.3rem">Other</h5>${otherProviders.map(providerCheckbox).join('')}` : ''}
        ${!relevant.length ? '<p style="color:var(--red)">No providers found for these destinations. Add providers in the Provider Database tab.</p>' : ''}
        <div style="display:flex;gap:0.5rem;margin-top:0.8rem">
          <button class="btn btn-primary" onclick="CRM._sendBulkRFQ(${q.id})">Send RFQ to Selected</button>
          <button class="btn btn-outline" onclick="CRM.viewQuote(${q.id})">Back</button>
        </div>
      </div>`;
  },

  _quickSelectProviders(key) {
    const boxes = document.querySelectorAll('.crm-rfq-provider');
    if (key === 'ALL') { boxes.forEach(cb => cb.checked = true); return; }
    if (key === 'NONE') { boxes.forEach(cb => cb.checked = false); return; }
    // key format: "City / Category"
    const [city, cat] = key.split(' / ').map(s => s.trim());
    boxes.forEach(cb => {
      if ((cb.dataset.city || 'Other') === city && (cb.dataset.cat || 'Other') === cat) {
        cb.checked = !cb.checked;
      }
    });
  },

  _sendBulkRFQ(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    const checked = document.querySelectorAll('.crm-rfq-provider:checked');
    if (!checked.length) { alert('Please select at least one provider.'); return; }
    const providers = DB.getProviders();
    const sig = '\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com';
    const dates = fmtDate(q.startDate) + ' — ' + fmtDate(q.endDate);
    const totalPax = (q.numStudents||0) + (q.numSiblings||0) + (q.numAdults||0) + (q.numFOC||0);

    // Build room requirements string
    let roomReq = '';
    if (q.hotels && q.hotels.length > 0) {
      roomReq = q.hotels.map(h => {
        const roomStr = (h.rooms||[]).map(r => `${r.qty}x ${r.type}`).join(', ');
        return h.city + ': ' + (roomStr || 'TBD');
      }).join('; ');
    }

    // Track RFQs on the quote
    if (!q.rfqs) q.rfqs = [];

    checked.forEach(cb => {
      const p = providers.find(x => x.id === Number(cb.value));
      if (!p || !p.email) return;
      const subject = 'Quote Request — Group Tour to ' + (q.destination || '');
      let body = `Dear ${p.contactPerson || 'Sir/Madam'},\n\nWe are organising a group tour and would like to request a quote for your services.\n\nTour: ${q.tourName || ''}\nDestination: ${q.destination || ''}\nDates: ${dates} (${q.nights} nights)\nGroup size: ${totalPax} participants (${q.numStudents||0} students, ${q.numSiblings||0} siblings, ${q.numAdults||0} adults)`;
      if (p.category === 'Hotel' && roomReq) {
        body += `\nRoom requirements: ${roomReq}`;
      }
      body += `\n\nPlease send us your best rates and availability.${sig}`;
      Email.sendEmail(p.email, subject, body);

      // Add RFQ tracking record (avoid duplicates)
      const existing = q.rfqs.find(r => r.providerId === p.id);
      if (!existing) {
        q.rfqs.push({
          providerId: p.id,
          providerName: p.companyName,
          category: p.category,
          city: p.city || '',
          email: p.email,
          sentAt: new Date().toISOString(),
          status: 'Awaiting',
          responseNotes: '',
          responseAmount: 0
        });
      } else {
        existing.sentAt = new Date().toISOString();
        existing.status = 'Awaiting';
      }
    });
    DB.saveQuote(q);
    closeModal('crm-modal');
    alert(checked.length + ' RFQ email(s) opened in Outlook. Responses are tracked in the quote view.');
  },

  _renderRFQTracker(q) {
    if (!q.rfqs || !q.rfqs.length) return '';
    const awaiting = q.rfqs.filter(r => r.status === 'Awaiting').length;
    const received = q.rfqs.filter(r => r.status === 'Received').length;
    const declined = q.rfqs.filter(r => r.status === 'Declined').length;

    const statusColor = (s) => s === 'Awaiting' ? 'var(--amber)' : s === 'Received' ? 'var(--green)' : 'var(--red)';
    const statusBadge = (s) => `<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.75rem;font-weight:600;color:white;background:${statusColor(s)}">${s}</span>`;

    return `
      <div style="margin:1rem 0">
        <h3 style="margin-bottom:0.5rem">Provider RFQ Tracker
          ${awaiting > 0 ? `<span style="display:inline-flex;align-items:center;justify-content:center;background:var(--amber);color:white;font-size:0.72rem;font-weight:700;width:20px;height:20px;border-radius:50%;margin-left:0.4rem">${awaiting}</span>` : ''}
        </h3>
        <p style="font-size:0.82rem;color:var(--gray-400);margin-bottom:0.5rem">${received} received, ${awaiting} awaiting, ${declined} declined</p>
        <table class="data-table" style="font-size:0.85rem">
          <thead><tr><th>Provider</th><th>Category</th><th>City</th><th>Sent</th><th>Status</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>${q.rfqs.map((r, i) => `<tr>
            <td><strong>${r.providerName}</strong></td>
            <td>${r.category || '—'}</td>
            <td>${r.city || '—'}</td>
            <td>${fmtDate(r.sentAt)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${r.responseAmount ? fmt(r.responseAmount, q.currency) : '—'}</td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.responseNotes||'').replace(/"/g,'&quot;')}">${r.responseNotes || '—'}</td>
            <td>
              <select class="btn btn-sm" style="padding:0.2rem;font-size:0.75rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="CRM._updateRFQ(${q.id},${i},'status',this.value)">
                <option value="Awaiting" ${r.status==='Awaiting'?'selected':''}>Awaiting</option>
                <option value="Received" ${r.status==='Received'?'selected':''}>Received</option>
                <option value="Declined" ${r.status==='Declined'?'selected':''}>Declined</option>
              </select>
              <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.4rem" onclick="CRM._editRFQResponse(${q.id},${i})">Log</button>
              <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.4rem;color:var(--red);border-color:var(--red)" onclick="CRM._removeRFQ(${q.id},${i})">X</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`;
  },

  _updateRFQ(quoteId, rfqIdx, field, value) {
    const q = DB.getQuotes().find(x => x.id === quoteId);
    if (!q || !q.rfqs || !q.rfqs[rfqIdx]) return;
    q.rfqs[rfqIdx][field] = value;
    if (field === 'status' && value === 'Received') {
      q.rfqs[rfqIdx].responseDate = new Date().toISOString();
    }
    DB.saveQuote(q);
    this.viewQuote(quoteId);
  },

  _editRFQResponse(quoteId, rfqIdx) {
    const q = DB.getQuotes().find(x => x.id === quoteId);
    if (!q || !q.rfqs || !q.rfqs[rfqIdx]) return;
    const r = q.rfqs[rfqIdx];
    const amount = prompt('Enter quoted amount from ' + r.providerName + ':', r.responseAmount || '');
    if (amount === null) return;
    const notes = prompt('Notes (availability, conditions, etc.):', r.responseNotes || '');
    if (notes === null) return;
    r.responseAmount = Number(amount) || 0;
    r.responseNotes = notes;
    if (r.status === 'Awaiting') r.status = 'Received';
    r.responseDate = new Date().toISOString();
    DB.saveQuote(q);
    this.viewQuote(quoteId);
  },

  _removeRFQ(quoteId, rfqIdx) {
    const q = DB.getQuotes().find(x => x.id === quoteId);
    if (!q || !q.rfqs) return;
    q.rfqs.splice(rfqIdx, 1);
    DB.saveQuote(q);
    this.viewQuote(quoteId);
  },

  convertToTour(id) {
    const q = DB.getQuotes().find(x => x.id === id);
    if (!q) return;
    const tour = {
      quoteId: q.id,
      tourName: q.tourName,
      groupName: q.groupName || '',
      destination: q.destination,
      destinations: q.destinations ? JSON.parse(JSON.stringify(q.destinations)) : [],
      hotels: q.hotels ? JSON.parse(JSON.stringify(q.hotels)) : [],
      startDate: q.startDate,
      endDate: q.endDate,
      nights: q.nights,
      clientId: q.clientId || null,
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      clientPhone: q.clientPhone,
      numStudents: q.numStudents,
      numSiblings: q.numSiblings,
      numAdults: q.numAdults,
      numFOC: q.numFOC || 0,
      status: 'Preparing',
      costs: q.costs,
      priceStudent: q.priceStudent,
      priceSibling: q.priceSibling,
      priceAdult: q.priceAdult,
      currency: q.currency,
      hotelName: q.hotelName,
      hotelConfirmed: q.hotelConfirmed || false,
      roomType: q.roomType || '',
      mealPlan: q.mealPlan,
      activities: q.activities ? JSON.parse(JSON.stringify(q.activities)) : [],
      // Organization data for modifiable tour items
      flightCostPerPerson: q.flightCostPerPerson || 0,
      airportTransfers: q.airportTransfers || 0,
      coachHire: q.coachHire || 0,
      internalTransport: q.internalTransport || 0,
      costPerNightPerRoom: q.costPerNightPerRoom || 0,
      numRooms: q.numRooms || 0,
      mealCostPerPersonPerDay: q.mealCostPerPersonPerDay || 0,
      numGuides: q.numGuides || 0,
      guideDailyRate: q.guideDailyRate || 0,
      guideFlights: q.guideFlights || 0,
      guideAccommodation: q.guideAccommodation || 0,
      guideMeals: q.guideMeals || 0
    };
    DB.saveTour(tour);
    q.status = 'Confirmed';
    DB.saveQuote(q);
    closeModal('crm-modal');
    this.render();
    Dashboard.render();
    alert('Tour created successfully! View it in the Confirmed Tours tab.');
  }
};
