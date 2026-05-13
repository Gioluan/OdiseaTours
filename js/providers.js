/* === PROVIDERS MODULE === */
const Providers = {
  EMAIL_API_URL: 'https://odisea-tours.com/api/email/send',

  async _sendViaGmail(to, subject, text, replyTo) {
    const res = await fetch(this.EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, replyTo }),
    });
    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = j.error || j.detail || JSON.stringify(j); }
      catch { detail = 'HTTP ' + res.status; }
      throw new Error(detail);
    }
    return res.json();
  },

  _outlookFallback(to, subject, body) {
    window.location.href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  },

  RATE_UNITS: [
    { key: 'per_room_per_night',    label: 'per room / night' },
    { key: 'per_person_per_night',  label: 'per person / night' },
    { key: 'per_person',            label: 'per person (flat)' },
    { key: 'per_group',             label: 'per group (flat)' },
    { key: 'per_group_per_day',     label: 'per group / day' },
    { key: 'per_hour',              label: 'per hour' },
    { key: 'per_vehicle',           label: 'per vehicle (flat)' },
    { key: 'per_vehicle_per_day',   label: 'per vehicle / day' },
  ],
  RATE_SEASONS: [
    { key: 'all_year',  label: 'All year' },
    { key: 'low',       label: 'Low' },
    { key: 'shoulder',  label: 'Shoulder' },
    { key: 'high',      label: 'High' },
    { key: 'peak',      label: 'Peak' },
  ],
  _editingProviderId: null,
  _editingRateId: null,

  init() { this.render(); },

  render() {
    const catFilter = document.getElementById('prov-filter-cat').value;
    const cityFilter = document.getElementById('prov-filter-city').value;
    const search = (document.getElementById('prov-search').value || '').toLowerCase();

    let providers = DB.getProviders();
    if (catFilter) providers = providers.filter(p => p.category === catFilter);
    if (cityFilter) providers = providers.filter(p => p.city === cityFilter);
    if (search) providers = providers.filter(p =>
      (p.companyName || '').toLowerCase().includes(search) ||
      (p.contactPerson || '').toLowerCase().includes(search) ||
      (p.city || '').toLowerCase().includes(search)
    );

    if (!providers.length) {
      document.getElementById('providers-table-container').innerHTML = '<div class="empty-state">No providers found. Click "+ Add Provider" to start building your database.</div>';
      return;
    }

    document.getElementById('providers-table-container').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Category</th><th>City</th><th>Contact</th><th>Email</th><th>Phone</th><th>Website</th><th>Stars</th><th>Our Rating</th><th>Rates</th><th>Actions</th></tr></thead>
        <tbody>${providers.map(p => {
          const ourRatingStars = p.ourRating ? '<span style="color:var(--amber)">' + '★'.repeat(p.ourRating) + '</span>' + '<span style="color:var(--gray-200)">' + '★'.repeat(5 - p.ourRating) + '</span>' : '—';
          const rateCount = DB.getRatesForProvider(p.id).length;
          const rateBadge = rateCount > 0
            ? `<span class="badge badge-confirmed" style="cursor:pointer" onclick="Providers.editProvider(${p.id})">${rateCount} rate${rateCount===1?'':'s'}</span>`
            : `<span style="color:var(--gray-400);font-size:0.8rem">—</span>`;
          return `<tr>
            <td><strong>${p.companyName}</strong></td>
            <td><span class="badge badge-sent">${p.category}</span></td>
            <td>${p.city || '—'}</td>
            <td>${p.contactPerson || '—'}</td>
            <td>${p.email || '—'}</td>
            <td>${p.phone || '—'}</td>
            <td>${p.website ? `<a href="${p.website}" target="_blank" style="color:var(--amber);text-decoration:none;font-size:0.82rem" title="${p.website}">Visit</a>` : '—'}</td>
            <td>${p.category === 'Hotel' ? '★'.repeat(p.starRating || 0) : '—'}</td>
            <td style="font-size:0.82rem">${ourRatingStars}</td>
            <td>${rateBadge}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="Providers.editProvider(${p.id})">Edit</button>
              <button class="btn btn-sm btn-outline" onclick="Providers.sendRFQ(${p.id})">RFQ</button>
              <button class="btn btn-sm btn-danger" onclick="if(confirm('Delete?')){Providers.deleteProvider(${p.id})}">Del</button>
            </td>
          </tr>`}).join('')}</tbody>
      </table>`;
  },

  showAddModal() {
    this._showForm();
  },

  editProvider(id) {
    const p = DB.getProviders().find(x => x.id === id);
    if (p) this._showForm(p);
  },

  _showForm(provider) {
    const p = provider || {};
    this._editingProviderId = p.id || null;
    document.getElementById('prov-modal').style.display = 'flex';
    document.getElementById('prov-modal-content').innerHTML = `
      <h2>${p.id ? 'Edit' : 'Add'} Provider</h2>
      <input type="hidden" id="prov-id" value="${p.id || ''}">
      <div class="form-row form-row-2">
        <div class="form-group"><label>Company Name</label><input id="prov-name" value="${p.companyName || ''}"></div>
        <div class="form-group"><label>Category</label>
          <select id="prov-cat">
            <option ${p.category==='Hotel'?'selected':''}>Hotel</option>
            <option ${p.category==='Transport'?'selected':''}>Transport</option>
            <option ${p.category==='Activity'?'selected':''}>Activity</option>
            <option ${p.category==='Restaurant'?'selected':''}>Restaurant</option>
            <option ${p.category==='Other'?'selected':''}>Other</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Contact Person</label><input id="prov-contact" value="${p.contactPerson || ''}"></div>
        <div class="form-group"><label>Email</label><input id="prov-email" type="email" value="${p.email || ''}"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Phone</label><input id="prov-phone" value="${p.phone || ''}"></div>
        <div class="form-group"><label>Website</label><input id="prov-website" type="url" value="${p.website || ''}" placeholder="https://..."></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>City</label>
          <select id="prov-city-sel" onchange="document.getElementById('prov-city-custom').style.display=this.value==='Other'?'block':'none'">
            <option ${p.city==='Madrid'?'selected':''}>Madrid</option>
            <option ${p.city==='Valencia'?'selected':''}>Valencia</option>
            <option ${p.city==='Barcelona'?'selected':''}>Barcelona</option>
            <option ${p.city==='Tenerife'?'selected':''}>Tenerife</option>
            <option value="Other" ${!['Madrid','Valencia','Barcelona','Tenerife'].includes(p.city) && p.city ? 'selected' : ''}>Other</option>
          </select>
          <input id="prov-city-custom" style="margin-top:0.3rem;display:${!['Madrid','Valencia','Barcelona','Tenerife'].includes(p.city) && p.city ? 'block' : 'none'}" value="${!['Madrid','Valencia','Barcelona','Tenerife'].includes(p.city) ? (p.city || '') : ''}" placeholder="Enter city">
        </div>
        <div class="form-group"><label>Star Rating (Hotels)</label>
          <select id="prov-stars">${[0,1,2,3,4,5].map(s => `<option value="${s}" ${(p.starRating||0)==s?'selected':''}>${s === 0 ? 'N/A' : '★'.repeat(s)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Our Rating (1-5)</label>
          <select id="prov-our-rating">
            <option value="0">Not rated</option>
            ${[1,2,3,4,5].map(s => `<option value="${s}" ${(p.ourRating||0)==s?'selected':''}>${'★'.repeat(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Our Review</label><input id="prov-our-review" value="${p.ourReview || ''}" placeholder="Internal notes on quality, reliability..."></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="prov-notes" rows="3">${p.notes || ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Providers.saveProvider()">Save</button>
        <button class="btn btn-outline" onclick="closeModal('prov-modal')">Cancel</button>
      </div>
      ${p.id ? this._renderRatesSection(p.id) : '<p style="margin-top:1rem;color:var(--gray-400);font-size:0.85rem;font-style:italic">Save the provider first to add rate sheets.</p>'}`;
  },

  _renderRatesSection(providerId) {
    const rates = DB.getRatesForProvider(providerId);
    const rows = rates.length ? rates.map(r => {
      const unitLabel = (this.RATE_UNITS.find(u => u.key === r.unit) || { label: r.unit }).label;
      const seasonLabel = (this.RATE_SEASONS.find(s => s.key === r.season) || { label: r.season || 'all year' }).label;
      const sym = r.currency === 'USD' ? '$' : r.currency === 'GBP' ? '£' : '€';
      const paxRange = (r.minPax || r.maxPax)
        ? `${r.minPax || '?'}-${r.maxPax || '∞'} pax`
        : '—';
      return `<tr>
        <td><strong>${this._escape(r.productName || '(unnamed)')}</strong>${r.source ? `<div style="font-size:0.75rem;color:var(--gray-400);margin-top:0.2rem">${this._escape(r.source)}</div>` : ''}</td>
        <td><span class="badge badge-sent" style="font-size:0.7rem">${seasonLabel}</span></td>
        <td><strong style="color:var(--amber)">${sym}${Number(r.price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong> <span style="color:var(--gray-400);font-size:0.78rem">${unitLabel}</span></td>
        <td style="font-size:0.82rem">${paxRange}</td>
        <td style="font-size:0.78rem;color:var(--gray-400)">${r.validUntil ? 'Until ' + r.validUntil : '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="Providers.editRate(${providerId}, ${r.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="if(confirm('Delete this rate?')){Providers.deleteRate(${providerId}, ${r.id})}">Del</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:1rem">No rate sheets yet. Click "+ Add Rate" to record one.</td></tr>`;

    return `
      <div style="margin-top:1.5rem;padding-top:1rem;border-top:2px solid var(--gray-100)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
          <div>
            <h3 style="margin:0;font-size:1rem">Rate Sheets</h3>
            <p style="margin:0.2rem 0 0;font-size:0.8rem;color:var(--gray-400)">One row per product / season. Used by quote builder and PDF generator.</p>
          </div>
          <button class="btn btn-sm btn-primary" onclick="Providers.addRate(${providerId})">+ Add Rate</button>
        </div>
        <table class="data-table" style="font-size:0.85rem">
          <thead><tr><th>Product</th><th>Season</th><th>Price</th><th>Pax</th><th>Valid</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  addRate(providerId) {
    this._showRateForm(providerId, null);
  },

  editRate(providerId, rateId) {
    const r = DB.getRates().find(x => x.id === rateId);
    if (r) this._showRateForm(providerId, r);
  },

  _showRateForm(providerId, rate) {
    const r = rate || {};
    this._editingProviderId = providerId;
    this._editingRateId = r.id || null;
    const provider = DB.getProviders().find(p => p.id === providerId);
    const providerName = provider ? provider.companyName : 'Provider';

    document.getElementById('prov-modal-content').innerHTML = `
      <h2>${r.id ? 'Edit' : 'Add'} Rate — <span style="color:var(--gray-400);font-weight:400">${this._escape(providerName)}</span></h2>
      <p style="margin-bottom:1rem;color:var(--gray-400);font-size:0.85rem">One product or room type, one season. Add multiple rows for seasonal variation.</p>
      <input type="hidden" id="rate-id" value="${r.id || ''}">
      <input type="hidden" id="rate-provider-id" value="${providerId}">

      <div class="form-group"><label>Product / Room Name *</label>
        <input id="rate-product" value="${this._escape(r.productName || '')}" placeholder="Double room / Camp Nou tour / BCN-Salou transfer">
      </div>

      <div class="form-row form-row-3">
        <div class="form-group"><label>Unit *</label>
          <select id="rate-unit">
            ${this.RATE_UNITS.map(u => `<option value="${u.key}" ${(r.unit || 'per_person')===u.key?'selected':''}>${u.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Season</label>
          <select id="rate-season">
            ${this.RATE_SEASONS.map(s => `<option value="${s.key}" ${(r.season || 'all_year')===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Currency</label>
          <select id="rate-currency">
            <option value="EUR" ${(r.currency || 'EUR')==='EUR'?'selected':''}>EUR €</option>
            <option value="USD" ${r.currency==='USD'?'selected':''}>USD $</option>
            <option value="GBP" ${r.currency==='GBP'?'selected':''}>GBP £</option>
          </select>
        </div>
      </div>

      <div class="form-row form-row-3">
        <div class="form-group"><label>Price *</label>
          <input id="rate-price" type="number" min="0" step="0.01" value="${r.price != null ? r.price : ''}">
        </div>
        <div class="form-group"><label>Min Pax</label>
          <input id="rate-minpax" type="number" min="0" step="1" value="${r.minPax != null ? r.minPax : ''}">
        </div>
        <div class="form-group"><label>Max Pax</label>
          <input id="rate-maxpax" type="number" min="0" step="1" value="${r.maxPax != null ? r.maxPax : ''}">
        </div>
      </div>

      <div class="form-row form-row-2">
        <div class="form-group"><label>VAT %</label>
          <input id="rate-vat" type="number" min="0" max="30" step="0.1" value="${r.vatPct != null ? r.vatPct : ''}">
        </div>
        <div class="form-group"><label>Valid Until</label>
          <input id="rate-valid-until" type="date" value="${r.validUntil || ''}">
        </div>
      </div>

      <div class="form-group"><label>Includes</label>
        <input id="rate-includes" value="${this._escape(r.includes || '')}" placeholder="breakfast, wifi, towels">
      </div>
      <div class="form-group"><label>Excludes</label>
        <input id="rate-excludes" value="${this._escape(r.excludes || '')}" placeholder="city tax, parking">
      </div>
      <div class="form-group"><label>Source (where the rate came from)</label>
        <input id="rate-source" value="${this._escape(r.source || '')}" placeholder="Email 2026-03-15 from Maria">
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea id="rate-notes" rows="2">${this._escape(r.notes || '')}</textarea>
      </div>

      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Providers.saveRate()">Save Rate</button>
        <button class="btn btn-outline" onclick="Providers._returnToProvider()">Back to Provider</button>
      </div>`;
  },

  _returnToProvider() {
    const provider = DB.getProviders().find(p => p.id === this._editingProviderId);
    if (provider) this._showForm(provider);
    else closeModal('prov-modal');
  },

  saveRate() {
    const productName = document.getElementById('rate-product').value.trim();
    const price = document.getElementById('rate-price').value;
    if (!productName) { alert('Product name is required.'); return; }
    if (price === '' || isNaN(Number(price))) { alert('Price is required.'); return; }

    const id = document.getElementById('rate-id').value;
    const providerId = Number(document.getElementById('rate-provider-id').value);
    const minPax = document.getElementById('rate-minpax').value;
    const maxPax = document.getElementById('rate-maxpax').value;
    const vatPct = document.getElementById('rate-vat').value;

    const rate = {
      providerId,
      productName,
      unit: document.getElementById('rate-unit').value,
      season: document.getElementById('rate-season').value,
      price: Number(price),
      currency: document.getElementById('rate-currency').value,
      minPax: minPax === '' ? null : Number(minPax),
      maxPax: maxPax === '' ? null : Number(maxPax),
      vatPct: vatPct === '' ? null : Number(vatPct),
      includes: document.getElementById('rate-includes').value,
      excludes: document.getElementById('rate-excludes').value,
      source: document.getElementById('rate-source').value,
      validUntil: document.getElementById('rate-valid-until').value || null,
      notes: document.getElementById('rate-notes').value,
    };
    if (id) rate.id = Number(id);
    DB.saveRate(rate);
    this._returnToProvider();
    this.render();
  },

  deleteRate(providerId, rateId) {
    DB.deleteRate(rateId);
    const provider = DB.getProviders().find(p => p.id === providerId);
    if (provider) this._showForm(provider);
    this.render();
  },

  saveProvider() {
    const id = document.getElementById('prov-id').value;
    const citySel = document.getElementById('prov-city-sel').value;
    const wasNew = !id;
    const p = {
      companyName: document.getElementById('prov-name').value,
      category: document.getElementById('prov-cat').value,
      contactPerson: document.getElementById('prov-contact').value,
      email: document.getElementById('prov-email').value,
      phone: document.getElementById('prov-phone').value,
      website: document.getElementById('prov-website').value,
      city: citySel === 'Other' ? document.getElementById('prov-city-custom').value : citySel,
      starRating: Number(document.getElementById('prov-stars').value) || 0,
      ourRating: Number(document.getElementById('prov-our-rating').value) || 0,
      ourReview: document.getElementById('prov-our-review').value,
      notes: document.getElementById('prov-notes').value
    };
    if (id) p.id = Number(id);
    const saved = DB.saveProvider(p);
    this.render();
    if (wasNew) {
      // Stay in the modal so the user can add rate sheets immediately
      this._showForm(saved);
    } else {
      closeModal('prov-modal');
    }
  },

  deleteProvider(id) {
    DB.deleteProvider(id);
    this.render();
  },

  sendRFQ(providerId) {
    const prov = DB.getProviders().find(x => x.id === providerId);
    if (!prov) return;
    const tours = DB.getTours();

    document.getElementById('prov-modal').style.display = 'flex';
    document.getElementById('prov-modal-content').innerHTML = `
      <h2>Send RFQ to ${prov.companyName}</h2>
      <p style="margin-bottom:1rem;color:var(--gray-400)">Fill in the tour details for the quote request, or select an existing tour.</p>
      <div class="form-group"><label>Select Tour (optional)</label>
        <select id="rfq-tour" onchange="Providers.fillRFQFromTour()">
          <option value="">— Enter manually —</option>
          ${tours.map(t => `<option value="${t.id}">${t.tourName} — ${t.destination}</option>`).join('')}
        </select>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Destination</label><input id="rfq-dest" value="${prov.city || ''}"></div>
        <div class="form-group"><label>Group Size</label><input id="rfq-group" type="number" placeholder="e.g. 25"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Start Date</label><input id="rfq-start" type="date"></div>
        <div class="form-group"><label>End Date</label><input id="rfq-end" type="date"></div>
        <div class="form-group"><label>Nights</label><input id="rfq-nights" type="number"></div>
      </div>
      <div class="form-group"><label>Specific Requirements</label><textarea id="rfq-reqs" rows="3" placeholder="e.g. Half board, twin rooms, central location..."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Providers.executeRFQ(${providerId})">Send via Outlook</button>
        <button class="btn btn-outline" onclick="closeModal('prov-modal')">Cancel</button>
      </div>`;
  },

  fillRFQFromTour() {
    const tourId = Number(document.getElementById('rfq-tour').value);
    if (!tourId) return;
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    document.getElementById('rfq-dest').value = t.destination || '';
    document.getElementById('rfq-group').value = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0);
    document.getElementById('rfq-start').value = t.startDate || '';
    document.getElementById('rfq-end').value = t.endDate || '';
    document.getElementById('rfq-nights').value = t.nights || '';
  },

  async executeRFQ(providerId) {
    const prov = DB.getProviders().find(x => x.id === providerId);
    if (!prov || !prov.email) { alert('Provider has no email address.'); return; }

    const dest = document.getElementById('rfq-dest').value;
    const group = document.getElementById('rfq-group').value;
    const start = document.getElementById('rfq-start').value;
    const end = document.getElementById('rfq-end').value;
    const nights = document.getElementById('rfq-nights').value;
    const reqs = document.getElementById('rfq-reqs').value;

    const subject = `Quote Request — Group Tour to ${dest}`;
    let body = `Dear ${prov.contactPerson || 'Sir/Madam'},\n\nWe are organising a group tour and would like to request a quote for your services.\n\nDestination: ${dest}\nDates: ${start} to ${end}\nNights: ${nights}\nGroup size: ${group} participants\n`;

    // Category-specific details
    if (prov.category === 'Hotel') {
      // Get tour for room details
      const tourId = Number(document.getElementById('rfq-tour').value);
      const tour = tourId ? DB.getTours().find(x => x.id === tourId) : null;
      if (tour && tour.hotels) {
        const hotel = tour.hotels.find(h => h.city === prov.city) || tour.hotels[0];
        if (hotel && hotel.rooms) {
          body += '\nRoom Requirements:\n';
          hotel.rooms.forEach(r => { body += `- ${r.qty}x ${r.type} rooms\n`; });
          body += `Meal Plan: ${hotel.mealPlan || 'Half Board'}\nCheck-in: ${start}\nCheck-out: ${end}\n`;
        }
      }
    } else if (prov.category === 'Transport') {
      body += `\nTransport Details:\nPickup: Airport/Hotel\nDropoff: Hotel/Airport\nTimes: TBC\n`;
    }

    body += `\n${reqs ? 'Additional Requirements:\n' + reqs + '\n' : ''}Please send us your best rates and availability at your earliest convenience.\n\nKind regards,\nOdisea Tours`;

    closeModal('prov-modal');
    try {
      await this._sendViaGmail(prov.email, subject, body);
      DB.logEmail({ to: prov.email, subject, type: 'RFQ' });
      alert('Sent RFQ to ' + prov.companyName + ' (' + prov.email + ')');
    } catch (e) {
      if (confirm(`Gmail send failed: ${e.message}\n\nOpen in Outlook instead?`)) {
        this._outlookFallback(prov.email, subject, body);
        DB.logEmail({ to: prov.email, subject, type: 'RFQ (Outlook fallback)' });
      }
    }
  },

  bulkRFQ() {
    const providers = DB.getProviders();
    const tours = DB.getTours();
    if (!providers.length) { alert('Add providers first.'); return; }

    document.getElementById('prov-modal').style.display = 'flex';
    document.getElementById('prov-modal-content').innerHTML = `
      <h2>Bulk RFQ</h2>
      <p style="margin-bottom:1rem;color:var(--gray-400)">Select providers and fill in tour details. An Outlook email will open for each selected provider.</p>
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--radius);padding:0.8rem;margin-bottom:1rem">
        ${providers.map(p => `<label class="checkbox-label" style="margin-bottom:0.4rem"><input type="checkbox" class="bulk-prov-cb" value="${p.id}"> ${p.companyName} (${p.category} — ${p.city || '?'})</label>`).join('')}
      </div>
      <div class="form-group"><label>Select Tour (optional)</label>
        <select id="bulk-rfq-tour" onchange="Providers.fillBulkRFQ()">
          <option value="">— Enter manually —</option>
          ${tours.map(t => `<option value="${t.id}">${t.tourName}</option>`).join('')}
        </select>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Destination</label><input id="bulk-dest"></div>
        <div class="form-group"><label>Group Size</label><input id="bulk-group" type="number"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Start Date</label><input id="bulk-start" type="date"></div>
        <div class="form-group"><label>End Date</label><input id="bulk-end" type="date"></div>
        <div class="form-group"><label>Nights</label><input id="bulk-nights" type="number"></div>
      </div>
      <div class="form-group"><label>Requirements</label><textarea id="bulk-reqs" rows="3"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Providers.executeBulkRFQ()">Send to All Selected</button>
        <button class="btn btn-outline" onclick="closeModal('prov-modal')">Cancel</button>
      </div>`;
  },

  fillBulkRFQ() {
    const tourId = Number(document.getElementById('bulk-rfq-tour').value);
    if (!tourId) return;
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    document.getElementById('bulk-dest').value = t.destination || '';
    document.getElementById('bulk-group').value = (t.numStudents||0)+(t.numSiblings||0)+(t.numAdults||0);
    document.getElementById('bulk-start').value = t.startDate || '';
    document.getElementById('bulk-end').value = t.endDate || '';
    document.getElementById('bulk-nights').value = t.nights || '';
  },

  async executeBulkRFQ() {
    const checkboxes = document.querySelectorAll('.bulk-prov-cb:checked');
    if (!checkboxes.length) { alert('Select at least one provider.'); return; }

    const dest = document.getElementById('bulk-dest').value;
    const group = document.getElementById('bulk-group').value;
    const start = document.getElementById('bulk-start').value;
    const end = document.getElementById('bulk-end').value;
    const nights = document.getElementById('bulk-nights').value;
    const reqs = document.getElementById('bulk-reqs').value;

    const ids = Array.from(checkboxes).map(cb => Number(cb.value));
    const targets = ids
      .map(id => DB.getProviders().find(x => x.id === id))
      .filter(p => p && p.email);

    if (!targets.length) {
      alert('Selected providers have no email addresses.');
      return;
    }
    if (!confirm(`Send RFQ via Gmail to ${targets.length} provider(s)?`)) return;

    closeModal('prov-modal');
    let sent = 0;
    const failed = [];

    for (const prov of targets) {
      const subject = `Quote Request — Group Tour to ${dest}`;
      const body = `Dear ${prov.contactPerson || 'Sir/Madam'},

We are organising a group tour and would like to request a quote for your services.

Destination: ${dest}
Dates: ${start} to ${end}
Nights: ${nights}
Group size: ${group} participants

${reqs ? 'Requirements:\n' + reqs + '\n' : ''}
Please send us your best rates and availability.

Kind regards,
Odisea Tours`;
      try {
        await this._sendViaGmail(prov.email, subject, body);
        DB.logEmail({ to: prov.email, subject, type: 'Bulk RFQ' });
        sent++;
      } catch (e) {
        failed.push({ name: prov.companyName, email: prov.email, error: e.message });
      }
      // 400 ms politeness delay between Gmail API calls
      await new Promise(r => setTimeout(r, 400));
    }

    if (failed.length === 0) {
      alert(`Sent RFQ to ${sent} provider(s) via Gmail.`);
    } else {
      const lines = failed.map(f => `- ${f.name} (${f.email}): ${f.error}`).join('\n');
      alert(`Sent ${sent} of ${targets.length}. Failed:\n${lines}`);
    }
  }
};
