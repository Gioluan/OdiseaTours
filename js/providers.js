/* === PROVIDERS MODULE === */
const Providers = {
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
        <thead><tr><th>Name</th><th>Category</th><th>City</th><th>Contact</th><th>Email</th><th>Phone</th><th>Website</th><th>Stars</th><th>Our Rating</th><th>Actions</th></tr></thead>
        <tbody>${providers.map(p => {
          const ourRatingStars = p.ourRating ? '<span style="color:var(--amber)">' + '★'.repeat(p.ourRating) + '</span>' + '<span style="color:var(--gray-200)">' + '★'.repeat(5 - p.ourRating) + '</span>' : '—';
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
      </div>`;
  },

  saveProvider() {
    const id = document.getElementById('prov-id').value;
    const citySel = document.getElementById('prov-city-sel').value;
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
    DB.saveProvider(p);
    closeModal('prov-modal');
    this.render();
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

  executeRFQ(providerId) {
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

    const mailto = 'mailto:' + encodeURIComponent(prov.email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = mailto;

    DB.logEmail({ to: prov.email, subject, type: 'RFQ' });
    closeModal('prov-modal');
    alert('Opening Outlook with RFQ email for ' + prov.companyName);
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

  executeBulkRFQ() {
    const checkboxes = document.querySelectorAll('.bulk-prov-cb:checked');
    if (!checkboxes.length) { alert('Select at least one provider.'); return; }

    const dest = document.getElementById('bulk-dest').value;
    const group = document.getElementById('bulk-group').value;
    const start = document.getElementById('bulk-start').value;
    const end = document.getElementById('bulk-end').value;
    const nights = document.getElementById('bulk-nights').value;
    const reqs = document.getElementById('bulk-reqs').value;

    const ids = Array.from(checkboxes).map(cb => Number(cb.value));
    let delay = 0;

    ids.forEach(id => {
      const prov = DB.getProviders().find(x => x.id === id);
      if (!prov || !prov.email) return;

      setTimeout(() => {
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

        window.location.href = 'mailto:' + encodeURIComponent(prov.email) +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);

        DB.logEmail({ to: prov.email, subject, type: 'Bulk RFQ' });
      }, delay);
      delay += 1500;
    });

    closeModal('prov-modal');
    alert(`Opening Outlook for ${ids.length} provider(s). Each email will open with a short delay.`);
  }
};
