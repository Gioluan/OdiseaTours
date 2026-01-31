/* === EMAIL CENTER MODULE === */
const Email = {
  templates: [
    {
      name: 'Payment Reminder',
      subject: 'Payment Reminder — {tourName}',
      body: 'Dear {clientName},\n\nThis is a friendly reminder that your payment of {amount} for the tour "{tourName}" ({destination}, {dates}) is due on {dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nBank details:\n[Please add your bank details]\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com',
      source: 'invoice'
    },
    {
      name: 'Quote Follow-up',
      subject: 'Your Tour Quote — {tourName}',
      body: 'Dear {clientName},\n\nThank you for your interest in our {destination} tour.\n\nWe sent you a quote for "{tourName}" and wanted to follow up to see if you had any questions.\n\nWe\'d love to help you plan an unforgettable experience for your group.\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com',
      source: 'quote'
    },
    {
      name: 'Booking Confirmation',
      subject: 'Booking Confirmed — {tourName}',
      body: 'Dear {clientName},\n\nGreat news! Your tour "{tourName}" to {destination} has been confirmed.\n\nDates: {startDate} to {endDate}\nGroup: {numStudents} students, {numSiblings} siblings, {numAdults} adults\n\nWe will be in touch with further details soon.\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com',
      source: 'tour'
    },
    {
      name: 'Provider RFQ',
      subject: 'Quote Request — Group Tour to {destination}',
      body: 'Dear {contactPerson},\n\nWe are organising a group tour to {destination} and would like to request a quote for your services.\n\nDates: {startDate} to {endDate}\nGroup size: {totalParticipants} participants\nNights: {nights}\n\nPlease send us your best rates and availability.\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com',
      source: 'provider'
    }
  ],

  init() { this.render(); },

  render() {
    this.renderCompose();
    this.renderTemplates();
    this.renderLog();
  },

  renderCompose() {
    document.getElementById('email-compose-form').innerHTML = `
      <div class="form-group">
        <label>Quick Select Recipient</label>
        <select id="em-source" onchange="Email.loadRecipients()">
          <option value="">— Type email manually —</option>
          <option value="quote">Client from Quote</option>
          <option value="tour">Client from Tour</option>
          <option value="provider">Provider</option>
        </select>
      </div>
      <div class="form-group" id="em-recipient-wrap" style="display:none">
        <label>Select</label>
        <select id="em-recipient-sel" onchange="Email.fillRecipient()"></select>
      </div>
      <div class="form-group"><label>To (Email)</label><input id="em-to" type="email" placeholder="recipient@email.com"></div>
      <div class="form-group"><label>Subject</label><input id="em-subject" placeholder="Email subject"></div>
      <div class="form-group"><label>Body</label><textarea id="em-body" rows="10" placeholder="Email body..."></textarea></div>
      <div class="form-group">
        <label>Attach Invoice PDF</label>
        <select id="em-attach-inv" onchange="document.getElementById('em-preview-inv-btn').style.display=this.value?'':'none'">
          <option value="">— No attachment —</option>
          ${DB.getInvoices().map(inv => {
            const paid = (inv.payments||[]).reduce((s,p)=>s+Number(p.amount),0);
            const status = paid >= Number(inv.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
            return `<option value="${inv.id}">${inv.number} — ${inv.clientName||'—'} — ${fmt(inv.amount,inv.currency)} [${status}]</option>`;
          }).join('')}
        </select>
        <span style="font-size:0.78rem;color:var(--gray-400);margin-top:0.3rem;display:block">The invoice PDF will open in a new tab — save it, then drag it into your email.</span>
      </div>
      <div style="display:flex;gap:0.5rem">
        <button class="btn btn-primary" onclick="Email.sendFromForm()">Open in Outlook</button>
        <button class="btn btn-outline" id="em-preview-inv-btn" style="display:none;border-color:var(--amber);color:var(--amber)" onclick="Email.previewAttachedInvoice()">Preview Invoice PDF</button>
      </div>
    `;
  },

  loadRecipients() {
    const source = document.getElementById('em-source').value;
    const wrap = document.getElementById('em-recipient-wrap');
    const sel = document.getElementById('em-recipient-sel');
    if (!source) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    let options = '<option value="">— Select —</option>';
    if (source === 'quote') {
      DB.getQuotes().forEach(q => {
        options += `<option value="${q.clientEmail || ''}" data-name="${q.clientName || ''}">${q.tourName} — ${q.clientName || 'No client'}</option>`;
      });
    } else if (source === 'tour') {
      DB.getTours().forEach(t => {
        options += `<option value="${t.clientEmail || ''}" data-name="${t.clientName || ''}">${t.tourName} — ${t.clientName || ''}</option>`;
      });
    } else if (source === 'provider') {
      DB.getProviders().forEach(p => {
        options += `<option value="${p.email || ''}" data-name="${p.contactPerson || ''}">${p.companyName} — ${p.contactPerson || ''}</option>`;
      });
    }
    sel.innerHTML = options;
  },

  fillRecipient() {
    const sel = document.getElementById('em-recipient-sel');
    const email = sel.value;
    if (email) document.getElementById('em-to').value = email;
  },

  sendFromForm() {
    const to = document.getElementById('em-to').value;
    const subject = document.getElementById('em-subject').value;
    const body = document.getElementById('em-body').value;
    if (!to) { alert('Please enter a recipient email.'); return; }
    // Generate invoice PDF if one is attached
    const invId = Number(document.getElementById('em-attach-inv').value);
    if (invId) {
      PDFQuote.generateInvoice(invId);
    }
    this.sendEmail(to, subject, body);
  },

  previewAttachedInvoice() {
    const invId = Number(document.getElementById('em-attach-inv').value);
    if (invId) PDFQuote.generateInvoice(invId);
  },

  sendEmail(to, subject, body) {
    const mailto = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = mailto;
    DB.logEmail({ to, subject, type: 'sent' });
    setTimeout(() => this.renderLog(), 500);
  },

  renderTemplates() {
    document.getElementById('email-templates-list').innerHTML = this.templates.map((tmpl, i) => `
      <div class="list-item" style="flex-direction:column;align-items:flex-start;gap:0.5rem">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <div>
            <div class="li-title">${tmpl.name}</div>
            <div class="li-sub">Source: ${tmpl.source}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="Email.useTemplate(${i})">Use Template</button>
        </div>
      </div>
    `).join('');
  },

  useTemplate(idx) {
    const tmpl = this.templates[idx];
    const source = tmpl.source;

    let items = [];
    let label = '';
    if (source === 'quote') { items = DB.getQuotes(); label = 'Quote'; }
    else if (source === 'tour') { items = DB.getTours(); label = 'Tour'; }
    else if (source === 'invoice') { items = DB.getInvoices(); label = 'Invoice'; }
    else if (source === 'provider') { items = DB.getProviders(); label = 'Provider'; }

    if (!items.length) {
      alert('No ' + label.toLowerCase() + 's found. Create one first.');
      return;
    }

    let optionsHtml = items.map(item => {
      const display = item.tourName || item.companyName || item.number || ('ID ' + item.id);
      const sub = item.clientName || item.contactPerson || '';
      return `<option value="${item.id}">${display}${sub ? ' — ' + sub : ''}</option>`;
    }).join('');

    // Show selection in a simple prompt approach using the modal area
    const composeArea = document.getElementById('email-compose-form');
    const origHTML = composeArea.innerHTML;
    composeArea.innerHTML = `
      <div class="card" style="background:var(--yellow-bg);margin-bottom:1rem">
        <strong>Select ${label} for template: "${tmpl.name}"</strong>
        <div class="form-group" style="margin-top:0.5rem">
          <select id="tmpl-select">${optionsHtml}</select>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Email.applyTemplate(${idx})">Apply</button>
        <button class="btn btn-outline btn-sm" onclick="Email.render()">Cancel</button>
      </div>`;
  },

  applyTemplate(idx) {
    const tmpl = this.templates[idx];
    const selId = Number(document.getElementById('tmpl-select').value);
    let data = {};
    let to = '';

    if (tmpl.source === 'quote') {
      const q = DB.getQuotes().find(x => x.id === selId);
      if (!q) return;
      data = { clientName: q.clientName, tourName: q.tourName, destination: q.destination, dates: fmtDate(q.startDate) + ' - ' + fmtDate(q.endDate), startDate: fmtDate(q.startDate), endDate: fmtDate(q.endDate), numStudents: q.numStudents, numSiblings: q.numSiblings, numAdults: q.numAdults, totalParticipants: (q.numStudents||0)+(q.numSiblings||0)+(q.numAdults||0), nights: q.nights };
      to = q.clientEmail || '';
    } else if (tmpl.source === 'tour') {
      const t = DB.getTours().find(x => x.id === selId);
      if (!t) return;
      data = { clientName: t.clientName, tourName: t.tourName, destination: t.destination, startDate: fmtDate(t.startDate), endDate: fmtDate(t.endDate), numStudents: t.numStudents, numSiblings: t.numSiblings, numAdults: t.numAdults, totalParticipants: (t.numStudents||0)+(t.numSiblings||0)+(t.numAdults||0), nights: t.nights };
      to = t.clientEmail || '';
    } else if (tmpl.source === 'invoice') {
      const inv = DB.getInvoices().find(x => x.id === selId);
      if (!inv) return;
      const t = inv.tourId ? DB.getTours().find(x => x.id === inv.tourId) : {};
      data = { clientName: inv.clientName, tourName: inv.tourName || '', amount: fmt(inv.amount, inv.currency), dueDate: fmtDate(inv.dueDate), destination: t?.destination || '', dates: t ? fmtDate(t.startDate) + ' - ' + fmtDate(t.endDate) : '' };
      // Try to get email from tour
      to = t?.clientEmail || '';
    } else if (tmpl.source === 'provider') {
      const p = DB.getProviders().find(x => x.id === selId);
      if (!p) return;
      data = { contactPerson: p.contactPerson, destination: p.city || '' };
      to = p.email || '';
      // Use latest tour for group details if available
      const tours = DB.getTours();
      if (tours.length) {
        const lt = tours[tours.length - 1];
        data.startDate = fmtDate(lt.startDate);
        data.endDate = fmtDate(lt.endDate);
        data.totalParticipants = (lt.numStudents||0)+(lt.numSiblings||0)+(lt.numAdults||0);
        data.nights = lt.nights;
        data.destination = data.destination || lt.destination;
      }
    }

    let subject = tmpl.subject;
    let body = tmpl.body;
    Object.keys(data).forEach(key => {
      const re = new RegExp('\\{' + key + '\\}', 'g');
      subject = subject.replace(re, data[key] || '');
      body = body.replace(re, data[key] || '');
    });

    this.renderCompose();
    setTimeout(() => {
      document.getElementById('em-to').value = to;
      document.getElementById('em-subject').value = subject;
      document.getElementById('em-body').value = body;
    }, 50);
  },

  renderLog() {
    const log = DB.getEmailLog().slice(0, 50);
    document.getElementById('email-log-container').innerHTML = log.length ? `
      <div style="display:flex;justify-content:flex-end;margin-bottom:0.5rem">
        <button class="btn btn-sm btn-danger" onclick="if(confirm('Clear entire email log?')){Email.clearLog()}">Clear All</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Date</th><th>To</th><th>Subject</th><th style="width:50px">Actions</th></tr></thead>
        <tbody>${log.map(e => `<tr>
          <td>${fmtDate(e.sentAt)}</td><td>${e.to}</td><td>${e.subject}</td>
          <td><button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.75rem" onclick="Email.deleteLogEntry(${e.id})">X</button></td>
        </tr>`).join('')}</tbody>
      </table>` : '<div class="empty-state">No emails sent yet.</div>';
  },

  deleteLogEntry(id) {
    const log = DB.getEmailLog().filter(e => e.id !== id);
    DB._set('emaillog', log);
    this.renderLog();
  },

  clearLog() {
    DB._set('emaillog', []);
    this.renderLog();
  }
};

const WhatsApp = {
  templates: [
    { name: 'Booking Confirmation', text: 'Hi {clientName}! Your tour "{tourName}" to {destination} is confirmed.\n\nDates: {startDate} - {endDate}\nGroup: {groupSize} travelers\n\nAccess your portal here: {portalUrl}\n\nOdisea Tours' },
    { name: 'Payment Reminder', text: 'Hi {clientName}, friendly reminder: your payment of {amount} for "{tourName}" is due on {dueDate}.\n\nPay here: {paymentUrl}\n\nOdisea Tours' },
    { name: 'Itinerary Share', text: 'Hi {clientName}! Your itinerary for "{tourName}" ({destination}) is ready.\n\nDates: {startDate} - {endDate}\nView details: {portalUrl}\n\nOdisea Tours' },
    { name: 'Departure Info', text: 'Hi {clientName}! Your tour "{tourName}" departs on {startDate}.\n\nPlease ensure all passengers are registered.\nPortal: {portalUrl}\n\nSee you soon!\nOdisea Tours' }
  ],

  send(phone, templateIdx, data) {
    let text = this.templates[templateIdx].text;
    Object.keys(data).forEach(key => {
      text = text.replace(new RegExp('\\{' + key + '\\}', 'g'), data[key] || '');
    });
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    const url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  },

  sendCustom(phone, text) {
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    const url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  }
};

const SMS = {
  send(phone, text) {
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    window.location.href = 'sms:' + cleanPhone + '?body=' + encodeURIComponent(text);
  }
};
