/* === CONFIRMED TOURS MODULE === */
const Tours = {
  _viewMode: 'table',

  init() { this.render(); },

  _calendarMonth: new Date().getMonth(),
  _calendarYear: new Date().getFullYear(),

  toggleView() {
    const modes = ['table', 'board', 'timeline', 'calendar'];
    const labels = { table: 'Board View', board: 'Timeline View', timeline: 'Calendar View', calendar: 'Table View' };
    const idx = modes.indexOf(this._viewMode);
    this._viewMode = modes[(idx + 1) % modes.length];
    document.getElementById('tours-view-toggle').textContent = labels[this._viewMode] || 'Table View';
    this.render();
  },

  render() {
    const statusFilter = document.getElementById('tours-filter-status').value;
    let tours = DB.getTours();
    if (statusFilter) tours = tours.filter(t => t.status === statusFilter);
    tours.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    if (!tours.length) {
      document.getElementById('tours-list-container').innerHTML = '<div class="empty-state">No confirmed tours yet. Confirm a quote from the CRM tab.</div>';
      return;
    }

    const invoices = DB.getInvoices();

    if (this._viewMode === 'board') {
      this._renderKanban(tours, invoices);
      return;
    }

    if (this._viewMode === 'timeline') { this._renderTimeline(tours); return; }

    if (this._viewMode === 'calendar') { this._renderCalendar(tours); return; }

    document.getElementById('tours-list-container').innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>Tour</th><th>Destination</th><th>Client</th><th>Dates</th><th>Group</th><th>Status</th><th>Profit</th><th>Invoiced</th><th>Actions</th>
        </tr></thead>
        <tbody>${tours.map(t => {
          const tourInvoices = invoices.filter(i => i.tourId === t.id);
          const invoiceTotal = tourInvoices.reduce((s, i) => s + Number(i.amount), 0);
          const paidTotal = tourInvoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
          const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0);
          return `<tr class="row-clickable" ondblclick="Tours.viewTour(${t.id})">
            <td><strong>${t.tourName}</strong></td>
            <td>${t.destination}</td>
            <td>${t.clientName || '—'}</td>
            <td>${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</td>
            <td>${groupSize} pax</td>
            <td><span class="badge ${badgeClass(t.status)}">${t.status}</span></td>
            <td style="color:${(t.costs&&t.costs.profit||0)>=0?'var(--green)':'var(--red)'};font-weight:600">${t.costs && t.costs.profit != null ? fmt(t.costs.profit, t.currency) : '—'}</td>
            <td>${tourInvoices.length ? fmt(paidTotal, t.currency) + ' / ' + fmt(invoiceTotal, t.currency) : '—'}</td>
            <td style="display:flex;gap:0.3rem">
              <button class="btn btn-sm btn-outline" onclick="Tours.viewTour(${t.id})">View</button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();if(confirm('Delete tour \\'${t.tourName.replace(/'/g,"\\\\'")}\\' and all its data?')){Tours.deleteTour(${t.id})}" title="Delete tour">✕</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  },

  _renderKanban(tours, invoices) {
    const columns = ['Preparing', 'In Progress', 'Completed'];
    document.getElementById('tours-list-container').innerHTML = `
      <div style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:1rem">
        ${columns.map(status => {
          const colTours = tours.filter(t => t.status === status);
          const color = status === 'Preparing' ? 'var(--amber)' : status === 'In Progress' ? 'var(--blue)' : 'var(--green)';
          return `<div style="flex:1;min-width:280px;background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
              <h4 style="font-size:0.88rem;color:${color}">${status}</h4>
              <span style="background:${color};color:white;font-size:0.72rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:10px">${colTours.length}</span>
            </div>
            ${colTours.length ? colTours.map(t => {
              const groupSize = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0);
              const profit = t.costs ? (t.costs.profit || 0) : 0;
              const tourInvs = invoices.filter(i => i.tourId === t.id);
              const invoiceTotal = tourInvs.reduce((s, i) => s + Number(i.amount), 0);
              const paidTotal = tourInvs.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
              return `<div style="background:white;border-radius:var(--radius);padding:0.8rem;margin-bottom:0.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.08);cursor:pointer;border-left:3px solid ${color}" onclick="Tours.viewTour(${t.id})">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.3rem">${t.tourName}</div>
                <div style="font-size:0.78rem;color:var(--gray-400);margin-bottom:0.3rem">${t.destination} — ${fmtDate(t.startDate)}</div>
                <div style="font-size:0.78rem;color:var(--gray-400);margin-bottom:0.4rem">${t.clientName || '—'} | ${groupSize} pax</div>
                <div style="display:flex;justify-content:space-between;font-size:0.78rem">
                  <span style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fmt(profit, t.currency)}</span>
                  ${tourInvs.length ? `<span style="color:var(--gray-400)">${fmt(paidTotal, t.currency)} / ${fmt(invoiceTotal, t.currency)}</span>` : ''}
                </div>
              </div>`;
            }).join('') : '<div style="color:var(--gray-300);font-size:0.85rem;text-align:center;padding:1rem">No tours</div>'}
          </div>`;
        }).join('')}
      </div>`;
  },

  viewTour(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    const c = t.costs || {};
    const invoices = DB.getInvoices().filter(i => i.tourId === t.id);
    const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0);
    const hasMultiHotels = t.hotels && t.hotels.length > 1;

    // Hotel info display
    const roomsLabel = (rooms) => (rooms || []).map(r => `${r.qty}x ${r.type}`).join(', ');
    let hotelInfoHTML = '';
    if (hasMultiHotels) {
      hotelInfoHTML = '<p><strong>Hotels:</strong></p>' + t.hotels.map(h =>
        `<p style="margin-left:0.5rem"><strong>${h.city}:</strong> ${h.hotelName || '—'} ${'★'.repeat(h.starRating||0)} (${h.nights} nights, ${h.mealPlan})
         <span class="badge ${h.hotelConfirmed?'badge-confirmed':'badge-unpaid'}">${h.hotelConfirmed?'Confirmed':'Not Confirmed'}</span></p>
         <p style="margin-left:1rem;font-size:0.85rem;color:var(--gray-500)">Rooms: ${roomsLabel(h.rooms) || '—'}</p>`
      ).join('');
    } else {
      const h0 = (t.hotels && t.hotels[0]) || {};
      hotelInfoHTML = `<p><strong>Hotel:</strong> ${t.hotelName || h0.hotelName || '—'}</p>
        <p><strong>Rooms:</strong> ${roomsLabel(h0.rooms) || '—'}</p>
        <p><strong>Meal Plan:</strong> ${t.mealPlan || h0.mealPlan || '—'}</p>`;
    }

    // Organization section: hotels — room type rows
    const orgRoomRows = (rooms, tourId, hi) => (rooms || []).map((r, ri) =>
      `<div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.2rem">
        <span style="font-size:0.8rem;width:55px">${r.type}</span>
        <input type="number" min="0" value="${r.qty}" style="width:50px;padding:0.3rem;font-size:0.85rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveOrgRoom(${tourId},${hi},${ri},'qty',this.value)">
        <span style="font-size:0.78rem;color:var(--gray-400)">rooms @</span>
        <input type="number" step="0.01" value="${r.costPerNight}" style="width:75px;padding:0.3rem;font-size:0.85rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveOrgRoom(${tourId},${hi},${ri},'costPerNight',this.value)">
        <span style="font-size:0.78rem;color:var(--gray-400)">/night</span>
      </div>`
    ).join('');

    let orgHotelsHTML = '';
    if (hasMultiHotels) {
      orgHotelsHTML = '<h4 style="margin-top:1rem;margin-bottom:0.5rem;font-size:0.9rem">Hotels by Destination</h4>';
      t.hotels.forEach((h, hi) => {
        orgHotelsHTML += `<div style="border-left:3px solid var(--amber);padding-left:0.8rem;margin-bottom:0.8rem">
          <strong style="color:var(--amber);font-size:0.88rem">${h.city}</strong>
          <div class="form-row form-row-3" style="margin-top:0.4rem;margin-bottom:0.4rem">
            <div class="form-group"><label>Hotel</label><input value="${h.hotelName||''}" onchange="Tours.saveOrgHotel(${t.id},${hi},'hotelName',this.value)"></div>
            <div class="form-group"><label>Nights</label><input type="number" value="${h.nights||0}" onchange="Tours.saveOrgHotel(${t.id},${hi},'nights',this.value)"></div>
            <div class="form-group"><label>Meal Cost/Person/Day</label><input type="number" step="0.01" value="${h.mealCostPerPersonPerDay||0}" onchange="Tours.saveOrgHotel(${t.id},${hi},'mealCostPerPersonPerDay',this.value)"></div>
          </div>
          <div style="margin-bottom:0.4rem">
            <label style="font-size:0.82rem;font-weight:600">Room Types</label>
            ${orgRoomRows(h.rooms, t.id, hi)}
          </div>
        </div>`;
      });
    } else {
      const h0 = (t.hotels && t.hotels[0]) || {};
      const h0rooms = h0.rooms || [];
      orgHotelsHTML = `
        <div style="margin-bottom:0.8rem">
          <label style="font-size:0.82rem;font-weight:600">Room Types & Costs (${t.currency})</label>
          ${h0rooms.length ? orgRoomRows(h0rooms, t.id, 0) : `<div class="form-row form-row-2">
            <div class="form-group"><label>Room Cost/Night</label><input type="number" step="0.01" value="${t.costPerNightPerRoom||0}" onchange="Tours.saveOrgField(${t.id},'costPerNightPerRoom',this.value)"></div>
            <div class="form-group"><label>Rooms</label><input type="number" value="${t.numRooms||0}" onchange="Tours.saveOrgField(${t.id},'numRooms',this.value)"></div>
          </div>`}
        </div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Meal Cost/Person/Day (${t.currency})</label><input type="number" step="0.01" value="${t.mealCostPerPersonPerDay || (h0.mealCostPerPersonPerDay||0)}" onchange="Tours.saveOrgField(${t.id},'mealCostPerPersonPerDay',this.value)"></div>`;
    }

    document.getElementById('tours-modal').style.display = 'flex';
    document.getElementById('tours-modal-content').innerHTML = `
      <h2>${t.tourName}</h2>
      <div class="grid-2" style="margin-bottom:1rem">
        <div>
          <p><strong>Destination:</strong> ${t.destination}</p>
          <p><strong>Dates:</strong> ${fmtDate(t.startDate)} — ${fmtDate(t.endDate)} (${t.nights} nights)</p>
          ${hotelInfoHTML}
        </div>
        <div>
          <p><strong>Client:</strong> ${t.clientName || '—'}</p>
          <p><strong>Group Name:</strong> ${t.groupName || '—'}</p>
          <p><strong>Email:</strong> ${t.clientEmail || '—'}</p>
          <p><strong>Phone:</strong> ${t.clientPhone || '—'}</p>
          ${t.clientPhone ? `
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem">
            <div style="display:flex;gap:0.3rem;align-items:center">
              <select id="wa-tmpl-${t.id}" style="padding:0.3rem;font-size:0.78rem;border:1.5px solid #25D366;border-radius:var(--radius);color:#25D366">
                ${WhatsApp.templates.map((tmpl, i) => '<option value="' + i + '">' + tmpl.name + '</option>').join('')}
              </select>
              <button class="btn btn-sm" style="background:#25D366;color:white;border:none;font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Tours.sendWhatsApp(${t.id})">WhatsApp</button>
            </div>
            <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Tours.sendSMS(${t.id})">SMS</button>
          </div>` : ''}
          <p><strong>Group:</strong> ${groupSize} pax (${t.numStudents} students, ${t.numSiblings} siblings, ${t.numAdults} adults${t.numFOC ? ', ' + t.numFOC + ' FOC' : ''})</p>
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label>Tour Status</label>
          <select onchange="Tours.updateStatus(${t.id}, this.value)">
            <option ${t.status==='Preparing'?'selected':''}>Preparing</option>
            <option ${t.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${t.status==='Completed'?'selected':''}>Completed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Payment Flow</label>
          <select onchange="Tours.updatePaymentFlow(${t.id}, this.value)">
            <option value="" ${!t.paymentFlow?'selected':''}>— Not Set (Legacy)</option>
            <option value="single" ${t.paymentFlow==='single'?'selected':''}>Single Payer (School/Org)</option>
            <option value="family" ${t.paymentFlow==='family'?'selected':''}>Family Pays (Per Family)</option>
          </select>
        </div>
      </div>
      <div class="cost-summary" style="margin:1rem 0">
        <h3>Cost Summary</h3>
        <div class="cost-line"><span>Total Cost</span><span>${fmt(c.grand, t.currency)}</span></div>
        <div class="cost-line"><span>Cost Per Person</span><span>${fmt(c.costPerPerson, t.currency)}</span></div>
      </div>
      <div class="pricing-cards" style="margin-bottom:1rem">
        <div class="price-card"><div class="pc-label">Student Price</div><div class="pc-price">${fmt(t.priceStudent, t.currency)}</div></div>
        <div class="price-card"><div class="pc-label">Sibling Price</div><div class="pc-price">${fmt(t.priceSibling, t.currency)}</div></div>
        <div class="price-card"><div class="pc-label">Adult Price</div><div class="pc-price">${fmt(t.priceAdult, t.currency)}</div></div>
      </div>

      ${Tours._renderPortalSection(t)}

      ${Tours._renderGuideSection(t)}

      <h3 style="margin-top:1rem">Organization</h3>
      <p style="font-size:0.82rem;color:var(--gray-400);margin-bottom:0.8rem">Modify tour items below if the client adds/changes features. Changes are saved to this tour.</p>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem">
        <div class="form-row form-row-3" style="margin-bottom:0.8rem">
          <div class="form-group"><label>Students</label><input id="org-students" type="number" value="${t.numStudents}" onchange="Tours.saveOrgField(${t.id},'numStudents',this.value)"></div>
          <div class="form-group"><label>Siblings</label><input id="org-siblings" type="number" value="${t.numSiblings}" onchange="Tours.saveOrgField(${t.id},'numSiblings',this.value)"></div>
          <div class="form-group"><label>Adults</label><input id="org-adults" type="number" value="${t.numAdults}" onchange="Tours.saveOrgField(${t.id},'numAdults',this.value)"></div>
        </div>
        <div class="form-row form-row-3" style="margin-bottom:0.8rem">
          <div class="form-group"><label>FOC</label><input type="number" value="${t.numFOC||0}" onchange="Tours.saveOrgField(${t.id},'numFOC',this.value)"></div>
          <div class="form-group"><label>Flight/Person (${t.currency})</label><input type="number" step="0.01" value="${t.flightCostPerPerson||0}" onchange="Tours.saveOrgField(${t.id},'flightCostPerPerson',this.value)"></div>
          <div class="form-group"><label>Coach Hire (${t.currency})</label><input type="number" step="0.01" value="${t.coachHire||0}" onchange="Tours.saveOrgField(${t.id},'coachHire',this.value)"></div>
        </div>
        ${orgHotelsHTML}
        <div class="form-row form-row-2" style="margin-bottom:0.8rem">
          <div class="form-group"><label>Price/Student (${t.currency})</label><input type="number" step="0.01" value="${t.priceStudent||0}" onchange="Tours.saveOrgField(${t.id},'priceStudent',this.value)"></div>
          <div class="form-group"><label>Price/Sibling (${t.currency})</label><input type="number" step="0.01" value="${t.priceSibling||0}" onchange="Tours.saveOrgField(${t.id},'priceSibling',this.value)"></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Price/Adult (${t.currency})</label><input type="number" step="0.01" value="${t.priceAdult||0}" onchange="Tours.saveOrgField(${t.id},'priceAdult',this.value)"></div>
          <div class="form-group"><label>Guide Daily Rate (${t.currency})</label><input type="number" step="0.01" value="${t.guideDailyRate||0}" onchange="Tours.saveOrgField(${t.id},'guideDailyRate',this.value)"></div>
        </div>
        <h4 style="margin-top:1rem;margin-bottom:0.5rem;font-size:0.9rem">Activities</h4>
        <div id="org-activities">
          ${(t.activities||[]).map((a,i) => `<div class="activity-row" style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
            <input value="${a.name}" style="flex:2;padding:0.4rem" onchange="Tours.saveOrgActivity(${t.id},${i},'name',this.value)">
            <input type="number" step="0.01" value="${a.costPerPerson}" style="flex:1;padding:0.4rem" onchange="Tours.saveOrgActivity(${t.id},${i},'costPerPerson',this.value)" ${a.isFree?'disabled':''}>
            ${a.destination ? `<span style="font-size:0.75rem;color:var(--amber);white-space:nowrap">${a.destination}</span>` : ''}
            <label style="font-size:0.8rem;white-space:nowrap"><input type="checkbox" ${a.isFree?'checked':''} onchange="Tours.saveOrgActivity(${t.id},${i},'isFree',this.checked)"> Free</label>
            <label style="font-size:0.8rem;white-space:nowrap"><input type="checkbox" ${a.playersOnly?'checked':''} onchange="Tours.saveOrgActivity(${t.id},${i},'playersOnly',this.checked)"> Players Only</label>
            <button class="btn btn-sm btn-danger" onclick="Tours.removeOrgActivity(${t.id},${i})">X</button>
          </div>`).join('')}
        </div>
        <button class="btn btn-sm btn-outline" onclick="Tours.addOrgActivity(${t.id})" style="margin-top:0.5rem">+ Add Activity</button>
        <div style="margin-top:1rem;display:flex;gap:0.7rem">
          <button class="btn btn-primary" onclick="Tours.recalcCosts(${t.id})">Recalculate Costs</button>
          <button class="btn btn-success" onclick="Tours.calculateProfit(${t.id})">Calculate Profit</button>
        </div>
        <div id="tour-profit-result"></div>
      </div>

      ${Tours._renderItineraryEditor(t)}

      ${Tours._renderItineraryMap(t)}

      ${Tours._renderChecklist(t)}

      ${Tours._renderActivityLog(t)}

      ${Tours._renderProviderExpenses(t)}

      ${Tours._renderReconciliation(t)}

      ${Tours._renderCommission(t)}

      ${Tours._renderPaymentFlowSection(t)}

      <h3 style="margin-top:1.5rem">Linked Invoices</h3>
      ${invoices.length ? `<table class="data-table" style="margin-bottom:1rem">
        <thead><tr><th>Invoice</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>${invoices.map(i => {
          const paid = (i.payments||[]).reduce((s,p)=>s+Number(p.amount),0);
          const st = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
          return `<tr><td>${i.number}</td><td>${fmt(i.amount,i.currency)}</td><td>${fmt(paid,i.currency)}</td><td><span class="badge ${badgeClass(st)}">${st}</span></td></tr>`;
        }).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:1rem">No invoices yet. Create one from the Invoicing tab.</p>'}

      <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Tours.exportPassengerList(${t.id})">Export Passengers</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Tours.exportRoomingList(${t.id})">Export Rooming</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Tours.exportFinancialSummary(${t.id})">Export Financial</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" style="border-color:var(--blue);color:var(--blue)" onclick="Tours.exportCalendar(${t.id})">Add to Calendar</button>
        <button class="btn btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="PDFItinerary.generate(${t.id})">Generate Itinerary PDF</button>
        <button class="btn btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="Tours.cloneTour(${t.id})">Duplicate</button>
        <button class="btn btn-danger" onclick="if(confirm('Delete this tour?')){Tours.deleteTour(${t.id})}">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('tours-modal')">Close</button>
      </div>`;
    // Initialize map and load async portal data after innerHTML is set
    setTimeout(() => {
      this._initMap();
      if (t.accessCode && DB._firebaseReady) {
        this._loadPortalChecklist(t.id);
        this._loadPortalBadges(t.id);
      }
    }, 100);
  },

  updateStatus(id, status) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    t.status = status;
    DB.saveTour(t);
    this.render();
    Dashboard.render();
  },

  deleteTour(id) {
    const tour = DB.getTours().find(t => t.id === id);
    DB.deleteTour(id);
    // Revert linked quote status so it can be re-confirmed later
    if (tour && tour.quoteId) {
      const q = DB.getQuotes().find(x => x.id === tour.quoteId);
      if (q && q.status === 'Confirmed') {
        q.status = 'Negotiating';
        DB.saveQuote(q);
      }
    }
    closeModal('tours-modal');
    this.render();
    if (typeof CRM !== 'undefined') CRM.render();
    Dashboard.render();
  },

  // Organization helpers
  saveOrgField(id, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    t[field] = isNaN(Number(value)) ? value : Number(value);
    DB.saveTour(t);
    const costFields = ['numStudents','numSiblings','numAdults','numFOC','flightCostPerPerson','coachHire','priceStudent','priceSibling','priceAdult','guideDailyRate','mealCostPerPersonPerDay','costPerNightPerRoom','numRooms'];
    if (costFields.includes(field)) this.recalcCosts(id, true);
  },

  saveOrgHotel(id, hotelIdx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.hotels || !t.hotels[hotelIdx]) return;
    t.hotels[hotelIdx][field] = isNaN(Number(value)) ? value : Number(value);
    DB.saveTour(t);
    this.recalcCosts(id, true);
  },

  saveOrgRoom(id, hotelIdx, roomIdx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.hotels || !t.hotels[hotelIdx]) return;
    const rooms = t.hotels[hotelIdx].rooms;
    if (!rooms || !rooms[roomIdx]) return;
    rooms[roomIdx][field] = Number(value) || 0;
    DB.saveTour(t);
    this.recalcCosts(id, true);
  },

  saveOrgActivity(id, idx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.activities || !t.activities[idx]) return;
    if (field === 'isFree') {
      t.activities[idx].isFree = value;
      if (value) t.activities[idx].costPerPerson = 0;
    } else if (field === 'playersOnly') {
      t.activities[idx].playersOnly = value;
    } else if (field === 'costPerPerson') {
      t.activities[idx].costPerPerson = Number(value) || 0;
    } else {
      t.activities[idx][field] = value;
    }
    DB.saveTour(t);
  },

  addOrgActivity(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    if (!t.activities) t.activities = [];
    t.activities.push({ name: 'New Activity', costPerPerson: 0, day: 1, isFree: false, playersOnly: false, destination: '' });
    DB.saveTour(t);
    this.viewTour(id);
  },

  removeOrgActivity(id, idx) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.activities) return;
    t.activities.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(id);
  },

  calculateProfit(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    const c = t.costs || {};
    const revenueStudents = (t.priceStudent||0) * (t.numStudents||0);
    const revenueSiblings = (t.priceSibling||0) * (t.numSiblings||0);
    const revenueAdults = (t.priceAdult||0) * (t.numAdults||0);
    const totalRevenue = revenueStudents + revenueSiblings + revenueAdults;
    const totalCost = c.grand || 0;
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;
    const paying = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0);
    const profitPerPerson = paying > 0 ? profit / paying : 0;
    const cur = t.currency || 'EUR';

    const el = document.getElementById('tour-profit-result');
    if (!el) return;
    el.innerHTML = `
      <div style="margin-top:1rem;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)">
        <div style="background:${profit >= 0 ? 'var(--green)' : 'var(--red)'};color:white;padding:1rem 1.3rem;text-align:center">
          <div style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;font-weight:600">Profit</div>
          <div style="font-size:2rem;font-weight:700;margin:0.2rem 0">${fmt(profit, cur)}</div>
          <div style="font-size:0.88rem;opacity:0.9">Margin: ${margin}% | Per person: ${fmt(profitPerPerson, cur)}</div>
        </div>
        <div style="background:white;padding:1rem 1.3rem;font-size:0.88rem">
          <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
            <span>${t.numStudents||0} Students x ${fmt(t.priceStudent, cur)}</span><strong>${fmt(revenueStudents, cur)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
            <span>${t.numSiblings||0} Siblings x ${fmt(t.priceSibling, cur)}</span><strong>${fmt(revenueSiblings, cur)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
            <span>${t.numAdults||0} Adults x ${fmt(t.priceAdult, cur)}</span><strong>${fmt(revenueAdults, cur)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;color:var(--green)">
            <span>Total Revenue</span><span>${fmt(totalRevenue, cur)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-weight:700;color:var(--red)">
            <span>Total Costs</span><span>${fmt(totalCost, cur)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;font-size:1.05rem;color:${profit>=0?'var(--green)':'var(--red)'}">
            <span>Net Profit</span><span>${fmt(profit, cur)}</span>
          </div>
        </div>
      </div>`;
  },

  recalcCosts(id, silent) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    const paying = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0);
    const tp = paying + (t.numFOC||0);
    const days = (t.nights||0) + 1;

    // Accommodation & meals: sum across hotels if multi-destination
    let accommodation = 0;
    let meals = 0;
    if (t.hotels && t.hotels.length > 0) {
      t.hotels.forEach(h => {
        const hNights = h.nights || t.nights || 0;
        if (h.rooms && h.rooms.length > 0) {
          accommodation += h.rooms.reduce((s, r) => s + (r.qty||0) * (r.costPerNight||0) * hNights, 0);
        } else {
          accommodation += (h.costPerNightPerRoom||0) * (h.numRooms||0) * hNights;
        }
        const hDays = hNights + 1;
        meals += (h.mealCostPerPersonPerDay||0) * tp * hDays;
      });
    } else {
      accommodation = (t.costPerNightPerRoom||0) * (t.numRooms||0) * (t.nights||0);
      meals = (t.mealCostPerPersonPerDay||0) * tp * days;
    }

    const flights = (t.flightCostPerPerson||0) * tp;
    const transport = flights + (t.airportTransfers||0) + (t.coachHire||0) + (t.internalTransport||0);
    const activities = (t.activities||[]).reduce((s,a) => {
      if (a.isFree) return s;
      const pax = a.playersOnly ? (t.numStudents||0) : tp;
      return s + (a.costPerPerson||0) * pax;
    }, 0);
    const guide = ((t.numGuides||0) * (t.guideDailyRate||0) * days) + (t.guideFlights||0) + (t.guideAccommodation||0) + (t.guideMeals||0);
    const grand = accommodation + meals + transport + activities + guide;
    const costPerPerson = paying > 0 ? grand / paying : 0;
    const totalRevenue = ((t.priceStudent||0) * (t.numStudents||0)) + ((t.priceSibling||0) * (t.numSiblings||0)) + ((t.priceAdult||0) * (t.numAdults||0));
    const profit = totalRevenue - grand;
    const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0;
    const actualProviderCosts = (t.providerExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    t.costs = { accommodation, meals, flights, transport, activities, guide, grand, totalParticipants: tp, payingParticipants: paying, costPerPerson, days, totalRevenue, profit, margin, actualProviderCosts };
    DB.saveTour(t);
    if (!silent) {
      this.viewTour(id);
      alert('Costs recalculated! Total: ' + fmt(grand, t.currency) + ' | Profit: ' + fmt(profit, t.currency));
    }
  },

  // === Provider Expenses ===
  _renderProviderExpenses(t) {
    const exps = t.providerExpenses || [];
    const totalOwed = exps.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaid = exps.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const invoicesPending = exps.filter(e => !e.invoiceReceived).length;
    const unpaid = exps.filter(e => !e.paid).length;
    const providers = DB.getProviders();

    return `
      <h3 style="margin-top:1.5rem">Provider Expenses & Follow-up</h3>
      <div style="display:flex;gap:1rem;margin-bottom:0.8rem;font-size:0.85rem">
        <span><strong>Total owed:</strong> ${fmt(totalOwed, t.currency)}</span>
        <span><strong>Paid:</strong> <span style="color:var(--green)">${fmt(totalPaid, t.currency)}</span></span>
        <span><strong>Unpaid:</strong> <span style="color:${unpaid > 0 ? 'var(--red)' : 'var(--green)'}">${unpaid}</span></span>
        <span><strong>Invoices pending:</strong> <span style="color:${invoicesPending > 0 ? 'var(--amber)' : 'var(--green)'}">${invoicesPending}</span></span>
      </div>
      ${exps.length ? `<table class="data-table" style="font-size:0.82rem;margin-bottom:0.8rem">
        <thead><tr><th>Provider</th><th>Category</th><th>Description</th><th>Amount</th><th>Invoice Recv</th><th>Invoice Ref</th><th>Invoice File</th><th>Paid</th><th>Paid Amt</th><th>Actions</th></tr></thead>
        <tbody>${exps.map((e, i) => `<tr style="${e.paid ? 'opacity:0.6' : ''}">
          <td><strong>${e.providerName || '—'}</strong></td>
          <td>${e.category || '—'}</td>
          <td><input value="${(e.description||'').replace(/"/g,'&quot;')}" style="width:100%;padding:0.2rem;font-size:0.8rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveProviderExpense(${t.id},${i},'description',this.value)"></td>
          <td><input type="number" step="0.01" value="${e.amount||0}" style="width:70px;padding:0.2rem;font-size:0.8rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveProviderExpense(${t.id},${i},'amount',this.value)"></td>
          <td style="text-align:center"><input type="checkbox" ${e.invoiceReceived?'checked':''} onchange="Tours.saveProviderExpense(${t.id},${i},'invoiceReceived',this.checked)"></td>
          <td><input value="${(e.invoiceRef||'').replace(/"/g,'&quot;')}" style="width:70px;padding:0.2rem;font-size:0.8rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveProviderExpense(${t.id},${i},'invoiceRef',this.value)"></td>
          <td>${e.invoiceFile
            ? `<div style="display:flex;align-items:center;gap:0.3rem">
                <a href="#" onclick="Tours.downloadInvoiceFile(${t.id},${i});return false" title="${(e.invoiceFile.name||'').replace(/"/g,'&quot;')}" style="font-size:0.75rem;color:var(--green);text-decoration:underline;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block">${e.invoiceFile.name}</a>
                <button class="btn btn-sm btn-danger" style="padding:0 0.25rem;font-size:0.65rem;line-height:1.2" onclick="Tours.removeInvoiceFile(${t.id},${i})" title="Remove file">✕</button>
              </div>`
            : `<div class="invoice-drop" id="drop-${t.id}-${i}"
                ondragover="event.preventDefault();this.style.borderColor='var(--amber)';this.style.background='rgba(232,145,58,0.08)'"
                ondragleave="this.style.borderColor='var(--gray-200)';this.style.background=''"
                ondrop="event.preventDefault();this.style.borderColor='var(--gray-200)';this.style.background='';Tours.handleInvoiceDrop(${t.id},${i},event)"
                onclick="document.getElementById('file-${t.id}-${i}').click()"
                style="border:1.5px dashed var(--gray-200);border-radius:var(--radius);padding:0.25rem 0.4rem;cursor:pointer;text-align:center;font-size:0.7rem;color:var(--gray-400);min-width:70px;transition:border-color 0.2s,background 0.2s">
                📎 Drop / Click
              </div>
              <input type="file" id="file-${t.id}-${i}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="display:none" onchange="Tours.handleInvoiceSelect(${t.id},${i},event)">`
          }</td>
          <td style="text-align:center"><input type="checkbox" ${e.paid?'checked':''} onchange="Tours.saveProviderExpense(${t.id},${i},'paid',this.checked)"></td>
          <td><input type="number" step="0.01" value="${e.paidAmount||0}" style="width:70px;padding:0.2rem;font-size:0.8rem;border:1px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveProviderExpense(${t.id},${i},'paidAmount',this.value)"></td>
          <td><button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.removeProviderExpense(${t.id},${i})">X</button></td>
        </tr>`).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No provider expenses added yet.</p>'}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="Tours.addProviderExpense(${t.id})">+ Add Expense</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.autoAddHotelExpenses(${t.id})">+ From Hotels</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="Tours.autoAddTransportExpenses(${t.id})">+ From Transport</button>
      </div>`;
  },

  addProviderExpense(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    if (!t.providerExpenses) t.providerExpenses = [];
    t.providerExpenses.push({
      providerId: null, providerName: '', category: '', description: '',
      amount: 0, invoiceReceived: false, invoiceRef: '', paid: false, paidDate: '', paidAmount: 0, notes: ''
    });
    DB.saveTour(t);
    this.viewTour(id);
  },

  saveProviderExpense(id, idx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.providerExpenses || !t.providerExpenses[idx]) return;
    const e = t.providerExpenses[idx];
    if (field === 'invoiceReceived' || field === 'paid') {
      e[field] = value;
      if (field === 'paid' && value) e.paidDate = new Date().toISOString();
    } else if (field === 'amount' || field === 'paidAmount') {
      e[field] = Number(value) || 0;
    } else {
      e[field] = value;
    }
    DB.saveTour(t);
  },

  removeProviderExpense(id, idx) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.providerExpenses) return;
    t.providerExpenses.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(id);
  },

  handleInvoiceDrop(tourId, idx, event) {
    const file = event.dataTransfer.files[0];
    if (file) this._attachInvoiceFile(tourId, idx, file);
  },

  handleInvoiceSelect(tourId, idx, event) {
    const file = event.target.files[0];
    if (file) this._attachInvoiceFile(tourId, idx, file);
  },

  _attachInvoiceFile(tourId, idx, file) {
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large (max 2 MB). Please compress or use a smaller file.\n\nTip: Large files can fill up browser storage quickly.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const t = DB.getTours().find(x => x.id === tourId);
      if (!t || !t.providerExpenses || !t.providerExpenses[idx]) return;
      t.providerExpenses[idx].invoiceFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
        uploadedAt: new Date().toISOString()
      };
      // Auto-tick invoice received
      t.providerExpenses[idx].invoiceReceived = true;
      try {
        DB.saveTour(t);
      } catch (e) {
        alert('Could not save — browser storage may be full. Try a smaller file or clear some data.');
        t.providerExpenses[idx].invoiceFile = null;
        return;
      }
      this.viewTour(tourId);
    };
    reader.readAsDataURL(file);
  },

  downloadInvoiceFile(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.providerExpenses || !t.providerExpenses[idx] || !t.providerExpenses[idx].invoiceFile) return;
    const f = t.providerExpenses[idx].invoiceFile;
    const a = document.createElement('a');
    a.href = f.data;
    a.download = f.name;
    a.click();
  },

  removeInvoiceFile(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.providerExpenses || !t.providerExpenses[idx]) return;
    t.providerExpenses[idx].invoiceFile = null;
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  autoAddHotelExpenses(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    if (!t.providerExpenses) t.providerExpenses = [];
    const hotels = t.hotels || [];
    if (!hotels.length) { alert('No hotels on this tour.'); return; }
    hotels.forEach(h => {
      const exists = t.providerExpenses.some(e => e.category === 'Hotel' && e.providerName === (h.hotelName || ''));
      if (exists) return;
      const nights = h.nights || t.nights || 0;
      const roomCost = (h.rooms || []).reduce((s, r) => s + (r.qty||0) * (r.costPerNight||0) * nights, 0);
      t.providerExpenses.push({
        providerId: null, providerName: h.hotelName || 'Hotel (' + h.city + ')',
        category: 'Hotel', description: h.city + ' — ' + nights + ' nights',
        amount: roomCost, invoiceReceived: false, invoiceRef: '', paid: false, paidDate: '', paidAmount: 0, notes: ''
      });
    });
    DB.saveTour(t);
    this.viewTour(id);
  },

  autoAddTransportExpenses(id) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    if (!t.providerExpenses) t.providerExpenses = [];
    const tp = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
    if (t.flightCostPerPerson && !t.providerExpenses.some(e => e.description === 'Flights')) {
      t.providerExpenses.push({
        providerId: null, providerName: 'Airline', category: 'Transport',
        description: 'Flights', amount: (t.flightCostPerPerson||0) * tp,
        invoiceReceived: false, invoiceRef: '', paid: false, paidDate: '', paidAmount: 0, notes: ''
      });
    }
    if (t.coachHire && !t.providerExpenses.some(e => e.description === 'Coach Hire')) {
      t.providerExpenses.push({
        providerId: null, providerName: 'Coach Company', category: 'Transport',
        description: 'Coach Hire', amount: t.coachHire || 0,
        invoiceReceived: false, invoiceRef: '', paid: false, paidDate: '', paidAmount: 0, notes: ''
      });
    }
    if (t.airportTransfers && !t.providerExpenses.some(e => e.description === 'Airport Transfers')) {
      t.providerExpenses.push({
        providerId: null, providerName: 'Transfer Company', category: 'Transport',
        description: 'Airport Transfers', amount: t.airportTransfers || 0,
        invoiceReceived: false, invoiceRef: '', paid: false, paidDate: '', paidAmount: 0, notes: ''
      });
    }
    DB.saveTour(t);
    this.viewTour(id);
  },

  updatePaymentFlow(id, flow) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    t.paymentFlow = flow;
    DB.saveTour(t);
    this.viewTour(id);
  },

  _renderPaymentFlowSection(t) {
    if (t.paymentFlow === 'single') return this._renderSinglePayerSection(t);
    if (t.paymentFlow === 'family') return this._renderIndividualClients(t, true);
    return this._renderIndividualClients(t, false);
  },

  _renderSinglePayerSection(t) {
    const invoices = DB.getInvoices().filter(i => i.tourId === t.id && !i.individualClientRef);
    const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0);
    const revenueStudents = (t.priceStudent || 0) * (t.numStudents || 0);
    const revenueSiblings = (t.priceSibling || 0) * (t.numSiblings || 0);
    const revenueAdults = (t.priceAdult || 0) * (t.numAdults || 0);
    const totalRevenue = revenueStudents + revenueSiblings + revenueAdults;
    const cur = t.currency || 'EUR';
    const hasGroupInvoice = invoices.length > 0;

    return `
      <h3 style="margin-top:1.5rem">Single Payer <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— one client pays for the entire group</span></h3>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem">
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem">
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Client</div>
            <div style="font-weight:700;font-size:1rem;color:var(--navy)">${t.clientName || '—'}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Email</div>
            <div style="font-size:0.9rem">${t.clientEmail || '—'}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Group Size</div>
            <div style="font-size:0.9rem">${groupSize} pax</div>
          </div>
        </div>
        <div style="background:white;border-radius:var(--radius);padding:0.8rem 1rem;margin-bottom:1rem;border:1.5px solid var(--gray-100)">
          <div style="font-size:0.82rem;font-weight:600;color:var(--gray-500);margin-bottom:0.5rem">Group Revenue Calculation</div>
          <div style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.85rem">
            <div style="display:flex;justify-content:space-between"><span>${t.numStudents||0} Students x ${fmt(t.priceStudent||0, cur)}</span><span>${fmt(revenueStudents, cur)}</span></div>
            <div style="display:flex;justify-content:space-between"><span>${t.numSiblings||0} Siblings x ${fmt(t.priceSibling||0, cur)}</span><span>${fmt(revenueSiblings, cur)}</span></div>
            <div style="display:flex;justify-content:space-between"><span>${t.numAdults||0} Adults x ${fmt(t.priceAdult||0, cur)}</span><span>${fmt(revenueAdults, cur)}</span></div>
            <div style="display:flex;justify-content:space-between;border-top:1.5px solid var(--gray-100);padding-top:0.4rem;margin-top:0.2rem;font-weight:700;font-size:0.95rem;color:var(--green)"><span>Total</span><span>${fmt(totalRevenue, cur)}</span></div>
          </div>
        </div>
        ${hasGroupInvoice
          ? `<div style="font-size:0.85rem;color:var(--green);font-weight:600">Group invoice exists: ${invoices.map(i => i.number).join(', ')}</div>`
          : `<button class="btn btn-primary" onclick="Tours.createSinglePayerInvoice(${t.id})">Create Full Group Invoice (${fmt(totalRevenue, cur)})</button>`}
      </div>`;
  },

  createSinglePayerInvoice(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.clientName) { alert('Please set a client name for this tour first.'); return; }

    const revenueStudents = (t.priceStudent || 0) * (t.numStudents || 0);
    const revenueSiblings = (t.priceSibling || 0) * (t.numSiblings || 0);
    const revenueAdults = (t.priceAdult || 0) * (t.numAdults || 0);
    const totalRevenue = revenueStudents + revenueSiblings + revenueAdults;
    if (!totalRevenue) { alert('Total revenue is zero. Set prices and group sizes first.'); return; }

    // Check if a non-individual-client invoice already exists
    const existing = DB.getInvoices().find(i => i.tourId === t.id && !i.individualClientRef);
    if (existing) { alert('Group invoice already exists: ' + existing.number); return; }

    const inv = DB.saveInvoice({
      clientName: t.clientName,
      tourId: t.id,
      tourName: t.tourName,
      amount: totalRevenue,
      currency: t.currency || 'EUR',
      dueDate: '',
      description: `Full group booking — ${t.tourName} (${t.destination})\n${t.numStudents||0} student(s), ${t.numSiblings||0} sibling(s), ${t.numAdults||0} adult(s)`
    });
    inv.clientEmail = t.clientEmail;
    inv.clientPhone = t.clientPhone;
    DB.saveInvoice(inv);

    alert(`Invoice ${inv.number} created for ${t.clientName} — ${fmt(totalRevenue, t.currency)}`);
    this.viewTour(tourId);
  },

  addFromExistingClient(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const sel = document.getElementById('existing-client-select');
    if (!sel || !sel.value) { alert('Please select a client.'); return; }
    const clientId = Number(sel.value);
    const client = DB.getClients().find(c => c.id === clientId);
    if (!client) return;

    if (!t.individualClients) t.individualClients = [];
    // Check for duplicate by name
    if (t.individualClients.some(ic => ic.name === client.name)) {
      alert(client.name + ' is already added as an individual client.');
      return;
    }

    t.individualClients.push({
      id: Date.now(),
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      numStudents: 1,
      numSiblings: 0,
      numAdults: 0,
      amountDue: 0,
      notes: '',
      systemClientId: client.id
    });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  async importFamiliesFromPortal(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!DB._firebaseReady) { alert('Firebase not configured. Cannot import portal passengers.'); return; }

    const passengers = await DB.getTourPassengers(String(tourId));
    if (!passengers.length) { alert('No portal passengers found for this tour.'); return; }

    if (!t.individualClients) t.individualClients = [];
    const existingNames = new Set(t.individualClients.map(ic => ic.name.toLowerCase()));

    // Group passengers by family field
    const families = {};
    passengers.forEach(p => {
      const familyKey = (p.family || p.lastName || 'Unknown').trim();
      if (!families[familyKey]) families[familyKey] = [];
      families[familyKey].push(p);
    });

    let imported = 0, skipped = 0;
    Object.entries(families).forEach(([familyName, members]) => {
      const displayName = familyName + ' Family';
      if (existingNames.has(displayName.toLowerCase())) { skipped++; return; }

      // Count by role
      let numStudents = 0, numSiblings = 0, numAdults = 0;
      members.forEach(m => {
        const role = (m.role || 'player').toLowerCase();
        if (role === 'player' || role === 'student') numStudents++;
        else if (role === 'sibling') numSiblings++;
        else if (role === 'adult' || role === 'parent' || role === 'guardian') numAdults++;
        else numStudents++; // default to student
      });

      // Calculate amount
      const amount = (numStudents * (t.priceStudent || 0)) +
                     (numSiblings * (t.priceSibling || 0)) +
                     (numAdults * (t.priceAdult || 0));

      // Use first member's contact info as family contact
      const contact = members.find(m => m.email || m.emergencyContact) || members[0];

      t.individualClients.push({
        id: Date.now() + imported,
        name: displayName,
        email: contact.email || '',
        phone: contact.phone || contact.emergencyContact || '',
        numStudents,
        numSiblings,
        numAdults,
        amountDue: amount,
        notes: 'Imported from portal. Members: ' + members.map(m => (m.firstName || '') + ' ' + (m.lastName || '')).join(', '),
        portalImported: true
      });
      imported++;
    });

    DB.saveTour(t);
    alert(`Imported ${imported} families from portal.${skipped ? ' ' + skipped + ' skipped (already added).' : ''}`);
    this.viewTour(tourId);
  },

  /* ============================================================
     INDIVIDUAL CLIENTS (families / individuals paying separately)
     ============================================================ */
  _renderIndividualClients(t, isFamilyMode) {
    const clients = t.individualClients || [];
    const invoices = DB.getInvoices();

    // Summary stats
    const totalDue = clients.reduce((s, ic) => s + (ic.amountDue || 0), 0);
    const totalPaidIC = clients.reduce((s, ic) => {
      const inv = invoices.find(i => i.individualClientRef === ic.id && i.tourId === t.id);
      if (!inv) return s;
      return s + (inv.payments || []).reduce((ps, p) => ps + Number(p.amount), 0);
    }, 0);

    // Count totals from individual clients
    const icStudents = clients.reduce((s, ic) => s + (ic.numStudents || 0), 0);
    const icSiblings = clients.reduce((s, ic) => s + (ic.numSiblings || 0), 0);
    const icAdults = clients.reduce((s, ic) => s + (ic.numAdults || 0), 0);

    return `
      <h3 style="margin-top:1.5rem">${isFamilyMode ? 'Family Pays' : 'Individual Clients'} <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— ${isFamilyMode ? 'each family pays separately' : 'families / individuals paying separately'}</span></h3>
      ${clients.length ? `
      <div style="display:flex;gap:1rem;margin-bottom:0.8rem;font-size:0.85rem;flex-wrap:wrap">
        <span><strong>Clients:</strong> ${clients.length}</span>
        <span><strong>Participants:</strong> ${icStudents} students, ${icSiblings} siblings, ${icAdults} adults</span>
        <span><strong>Total billed:</strong> ${fmt(totalDue, t.currency)}</span>
        <span><strong>Collected:</strong> <span style="color:var(--green)">${fmt(totalPaidIC, t.currency)}</span></span>
        <span><strong>Outstanding:</strong> <span style="color:${totalDue - totalPaidIC > 0 ? 'var(--red)' : 'var(--green)'}">${fmt(totalDue - totalPaidIC, t.currency)}</span></span>
      </div>
      <table class="data-table" style="font-size:0.82rem;margin-bottom:0.8rem">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Flights</th><th>Students</th><th>Siblings</th><th>Adults</th><th>Amount Due</th><th>Status</th><th>Portal</th><th>Actions</th></tr></thead>
        <tbody>${clients.map((ic, i) => {
          const inv = invoices.find(iv => iv.individualClientRef === ic.id && iv.tourId === t.id);
          const paid = inv ? (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0) : 0;
          const status = !inv ? 'No Invoice' : paid >= Number(inv.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
          const famCodes = t.familyAccessCodes || {};
          const famEntry = famCodes[ic.id];
          const famCode = famEntry ? famEntry.code : null;
          return `<tr>
            <td><strong>${ic.name || '—'}</strong></td>
            <td>${ic.email || '—'}</td>
            <td>${ic.phone || '—'}</td>
            <td id="fl-status-${t.id}-${ic.id}" style="text-align:center"><span class="spinner" style="width:14px;height:14px;border-width:2px"></span></td>
            <td>${ic.numStudents || 0}</td>
            <td>${ic.numSiblings || 0}</td>
            <td>${ic.numAdults || 0}</td>
            <td style="font-weight:600">${fmt(ic.amountDue || 0, t.currency)}</td>
            <td><span class="badge ${status === 'Paid' ? 'badge-confirmed' : status === 'Partial' ? 'badge-sent' : status === 'Unpaid' ? 'badge-unpaid' : 'badge-draft'}">${status}</span></td>
            <td style="white-space:nowrap">${famCode
              ? `<code style="font-size:0.72rem;background:var(--gray-50);padding:0.1rem 0.3rem;border-radius:3px">${famCode}</code>
                 <button class="btn btn-sm btn-outline" style="padding:0.1rem 0.3rem;font-size:0.68rem" onclick="event.stopPropagation();Tours.copyFamilyPortalLink(${t.id},'${famCode}')" title="Copy link">Copy</button>
                 ${famEntry && famEntry.lastAccess ? '<span style="color:var(--green);font-size:0.7rem" title="Last: '+famEntry.lastAccess+'">Active</span>' : '<span style="color:var(--gray-300);font-size:0.7rem">Not used</span>'}`
              : `<button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem;font-size:0.72rem;border-color:var(--blue);color:var(--blue)" onclick="event.stopPropagation();Tours.generateFamilyCode(${t.id},'${ic.id}')">Generate</button>`
            }</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="Tours.editIndividualClient(${t.id},${i})" title="Edit">Edit</button>
              ${!inv ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.createIndividualInvoice(${t.id},${i})" title="Create invoice">Invoice</button>` : `<button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="PDFQuote.generateInvoice(${inv.id})" title="View PDF">PDF</button>`}
              <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.removeIndividualClient(${t.id},${i})">X</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <script>(async()=>{if(!DB._firebaseReady)return;try{const flights=await DB.getAllFamilyFlights('${t.id}');flights.forEach(f=>{const el=document.getElementById('fl-status-${t.id}-'+f.familyId);if(el){const has=f.arrival&&f.arrival.flightNumber;el.innerHTML=has?'<span style="color:var(--green);cursor:pointer" onclick="event.stopPropagation();Tours.viewFamilyFlights(\\\'${t.id}\\\',\\\''+f.familyId+'\\\')" title="View flights">&#10003; View</span>':'<span style="color:var(--gray-300)">&times;</span>';}});${JSON.stringify(clients.map(c=>c.id))}.forEach(cid=>{const el=document.getElementById('fl-status-${t.id}-'+cid);if(el&&el.querySelector('.spinner'))el.innerHTML='<span style="color:var(--gray-300)">&times;</span>';});}catch(e){}})()</script>
      ` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No individual clients added yet. Use this for groups where families pay separately.</p>'}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
        <button class="btn btn-sm btn-outline" onclick="Tours.addIndividualClient(${t.id})">+ Add Individual Client</button>
        ${isFamilyMode ? `
        <select id="existing-client-select" style="padding:0.35rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);max-width:180px">
          <option value="">— Add from Clients —</option>
          ${DB.getClients().map(c => `<option value="${c.id}">${(c.name||'').replace(/"/g,'&quot;')}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="Tours.addFromExistingClient(${t.id})">Add</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--blue);color:var(--blue)" onclick="Tours.importFamiliesFromPortal(${t.id})">Import from Portal</button>
        ` : ''}
        ${clients.length > 0 ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.autoCalcIndividualAmounts(${t.id})">Auto-Calculate Amounts</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Tours.createAllIndividualInvoices(${t.id})">Create All Invoices</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--blue);color:var(--blue)" onclick="Tours.generateAllFamilyCodes(${t.id})">Generate All Portal Codes</button>
        <button class="btn btn-sm btn-outline" style="border-color:#25D366;color:#25D366" onclick="Tours.sendAllFamilyInvites(${t.id})">Email All Invites</button>` : ''}
      </div>`;
  },

  addIndividualClient(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.individualClients) t.individualClients = [];
    t.individualClients.push({
      id: Date.now(),
      name: '',
      email: '',
      phone: '',
      numStudents: 1,
      numSiblings: 0,
      numAdults: 0,
      amountDue: 0,
      notes: ''
    });
    DB.saveTour(t);
    // Open the edit form for the new client
    this.editIndividualClient(tourId, t.individualClients.length - 1);
  },

  editIndividualClient(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients || !t.individualClients[idx]) return;
    const ic = t.individualClients[idx];

    document.getElementById('tours-modal-content').innerHTML = `
      <h2>Individual Client — ${ic.name || 'New Client'}</h2>
      <p style="font-size:0.85rem;color:var(--gray-400);margin-bottom:1rem">Tour: ${t.tourName} (${t.destination})</p>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Full Name / Family Name</label><input id="ic-name" value="${(ic.name||'').replace(/"/g,'&quot;')}" placeholder="e.g. Smith Family"></div>
        <div class="form-group"><label>Email</label><input id="ic-email" type="email" value="${ic.email||''}" placeholder="parent@email.com"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Phone</label><input id="ic-phone" value="${ic.phone||''}" placeholder="+44..."></div>
        <div class="form-group"><label>Amount Due (${t.currency})</label><input id="ic-amount" type="number" step="0.01" value="${ic.amountDue||0}"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Students / Players</label><input id="ic-students" type="number" min="0" value="${ic.numStudents||0}" oninput="Tours._updateICCalc(${t.priceStudent||0},${t.priceSibling||0},${t.priceAdult||0},'${t.currency||'EUR'}')"></div>
        <div class="form-group"><label>Siblings</label><input id="ic-siblings" type="number" min="0" value="${ic.numSiblings||0}" oninput="Tours._updateICCalc(${t.priceStudent||0},${t.priceSibling||0},${t.priceAdult||0},'${t.currency||'EUR'}')"></div>
        <div class="form-group"><label>Adults</label><input id="ic-adults" type="number" min="0" value="${ic.numAdults||0}" oninput="Tours._updateICCalc(${t.priceStudent||0},${t.priceSibling||0},${t.priceAdult||0},'${t.currency||'EUR'}')"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="ic-notes" rows="2" placeholder="Room preferences, dietary requirements, etc.">${ic.notes||''}</textarea></div>
      <div id="ic-calc-line" style="font-size:0.82rem;color:var(--gray-400);margin:0.5rem 0"></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Tours.saveIndividualClient(${tourId},${idx})">Save</button>
        <button class="btn btn-outline" onclick="Tours.viewTour(${tourId})">Cancel</button>
      </div>`;
    Tours._updateICCalc(t.priceStudent||0, t.priceSibling||0, t.priceAdult||0, t.currency||'EUR');
  },

  _updateICCalc(priceStudent, priceSibling, priceAdult, currency) {
    const s = Number(document.getElementById('ic-students').value) || 0;
    const si = Number(document.getElementById('ic-siblings').value) || 0;
    const a = Number(document.getElementById('ic-adults').value) || 0;
    const total = (s * priceStudent) + (si * priceSibling) + (a * priceAdult);
    const el = document.getElementById('ic-calc-line');
    if (el) el.innerHTML = 'Quick calc: ' + s + ' students &times; ' + fmt(priceStudent, currency) +
      ' + ' + si + ' siblings &times; ' + fmt(priceSibling, currency) +
      ' + ' + a + ' adults &times; ' + fmt(priceAdult, currency) +
      ' = <strong>' + fmt(total, currency) + '</strong>' +
      ' <button class="btn btn-sm btn-outline" style="margin-left:0.5rem;font-size:0.75rem" onclick="document.getElementById(\'ic-amount\').value=' + total + '">Use this amount</button>';
  },

  saveIndividualClient(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients || !t.individualClients[idx]) return;
    const ic = t.individualClients[idx];
    ic.name = document.getElementById('ic-name').value;
    ic.email = document.getElementById('ic-email').value;
    ic.phone = document.getElementById('ic-phone').value;
    ic.numStudents = Number(document.getElementById('ic-students').value) || 0;
    ic.numSiblings = Number(document.getElementById('ic-siblings').value) || 0;
    ic.numAdults = Number(document.getElementById('ic-adults').value) || 0;
    ic.amountDue = Number(document.getElementById('ic-amount').value) || 0;
    ic.notes = document.getElementById('ic-notes').value;
    if (!ic.name) { alert('Please enter a name.'); return; }
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  removeIndividualClient(tourId, idx) {
    if (!confirm('Remove this individual client?')) return;
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients) return;
    t.individualClients.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  autoCalcIndividualAmounts(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients) return;
    t.individualClients.forEach(ic => {
      ic.amountDue = ((ic.numStudents || 0) * (t.priceStudent || 0)) +
                     ((ic.numSiblings || 0) * (t.priceSibling || 0)) +
                     ((ic.numAdults || 0) * (t.priceAdult || 0));
    });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  createIndividualInvoice(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients || !t.individualClients[idx]) return;
    const ic = t.individualClients[idx];
    if (!ic.name) { alert('Please enter client name first.'); return; }
    if (!ic.amountDue) { alert('Please set an amount due first.'); return; }

    // Check if invoice already exists
    const existing = DB.getInvoices().find(i => i.individualClientRef === ic.id && i.tourId === t.id);
    if (existing) { alert('Invoice already exists for this client: ' + existing.number); return; }

    const inv = DB.saveInvoice({
      clientName: ic.name,
      tourId: t.id,
      tourName: t.tourName,
      amount: ic.amountDue,
      currency: t.currency || 'EUR',
      dueDate: '',
      description: `Individual booking — ${t.tourName} (${t.destination})\n${ic.numStudents ? ic.numStudents + ' student(s)' : ''}${ic.numSiblings ? ', ' + ic.numSiblings + ' sibling(s)' : ''}${ic.numAdults ? ', ' + ic.numAdults + ' adult(s)' : ''}`,
      individualClientRef: ic.id
    });
    // Copy client details to invoice for PDF generation
    inv.clientEmail = ic.email;
    inv.clientPhone = ic.phone;
    DB.saveInvoice(inv);

    alert(`Invoice ${inv.number} created for ${ic.name} — ${fmt(ic.amountDue, t.currency)}`);
    this.viewTour(tourId);
  },

  createAllIndividualInvoices(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients || !t.individualClients.length) return;
    const invoices = DB.getInvoices();
    let created = 0, skipped = 0;

    t.individualClients.forEach(ic => {
      if (!ic.name || !ic.amountDue) { skipped++; return; }
      const existing = invoices.find(i => i.individualClientRef === ic.id && i.tourId === t.id);
      if (existing) { skipped++; return; }

      const inv = DB.saveInvoice({
        clientName: ic.name,
        tourId: t.id,
        tourName: t.tourName,
        amount: ic.amountDue,
        currency: t.currency || 'EUR',
        dueDate: '',
        description: `Individual booking — ${t.tourName} (${t.destination})\n${ic.numStudents ? ic.numStudents + ' student(s)' : ''}${ic.numSiblings ? ', ' + ic.numSiblings + ' sibling(s)' : ''}${ic.numAdults ? ', ' + ic.numAdults + ' adult(s)' : ''}`,
        individualClientRef: ic.id
      });
      inv.clientEmail = ic.email;
      inv.clientPhone = ic.phone;
      DB.saveInvoice(inv);
      created++;
    });

    alert(`Created ${created} invoice(s). ${skipped ? skipped + ' skipped (already invoiced or missing data).' : ''}`);
    this.viewTour(tourId);
  },

  /* ============================================================
     ITINERARY EDITOR — Day-by-day schedule
     ============================================================ */
  _renderItineraryEditor(t) {
    const days = t.itinerary || [];
    const inclusions = t.inclusions || [];

    return `
      <h3 style="margin-top:1.5rem">Itinerary <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— day-by-day schedule for PDF</span></h3>
      ${days.length ? days.map((day, di) => `
        <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem;border-left:3px solid var(--amber)">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
            <span style="background:var(--amber);color:#111;font-weight:700;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.82rem;flex-shrink:0">${day.day}</span>
            <input value="${(day.title||'').replace(/"/g,'&quot;')}" placeholder="Day title (e.g. Arrival in Madrid)" style="flex:1;padding:0.35rem 0.5rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveItineraryDay(${t.id},${di},'title',this.value)">
            <input type="date" value="${day.date||''}" style="padding:0.35rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveItineraryDay(${t.id},${di},'date',this.value)">
            <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.removeItineraryDay(${t.id},${di})">X</button>
          </div>
          <div style="padding-left:1.8rem">
            ${(day.items||[]).map((item, ii) => `
              <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.25rem">
                <input value="${(item.time||'').replace(/"/g,'&quot;')}" placeholder="0900" style="width:55px;padding:0.25rem;font-size:0.82rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveItineraryItem(${t.id},${di},${ii},'time',this.value)">
                <input value="${(item.description||'').replace(/"/g,'&quot;')}" placeholder="Activity description" style="flex:1;padding:0.25rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);${item.highlight?'font-weight:600;background:rgba(255,180,0,0.08)':''}" onchange="Tours.saveItineraryItem(${t.id},${di},${ii},'description',this.value)">
                <label style="font-size:0.75rem;white-space:nowrap;cursor:pointer;color:${item.highlight?'var(--amber)':'var(--gray-400)'}"><input type="checkbox" ${item.highlight?'checked':''} onchange="Tours.saveItineraryItem(${t.id},${di},${ii},'highlight',this.checked)"> Bold</label>
                <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem;padding:0.1rem 0.3rem" onclick="Tours.removeItineraryItem(${t.id},${di},${ii})">&#10005;</button>
              </div>
            `).join('')}
            <button class="btn btn-sm btn-outline" style="margin-top:0.3rem;font-size:0.75rem;padding:0.2rem 0.5rem" onclick="Tours.addItineraryItem(${t.id},${di})">+ Add Time Slot</button>
          </div>
        </div>
      `).join('') : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No itinerary days added yet. Build the day-by-day schedule to generate a PDF itinerary.</p>'}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">
        <button class="btn btn-sm btn-outline" onclick="Tours.addItineraryDay(${t.id})">+ Add Day</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.autoGenerateItinerary(${t.id})">Auto-Generate from Tour Dates</button>
        ${days.length ? `<button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="PDFItinerary.generate(${t.id})">Preview Itinerary PDF</button>` : ''}
      </div>

      <div style="margin-top:1rem;margin-bottom:1rem">
        <h4 style="font-size:0.88rem;margin-bottom:0.4rem">What's Included <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— shown on final page of itinerary</span></h4>
        <div id="itinerary-inclusions">
          ${inclusions.map((item, i) => `
            <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.2rem">
              <span style="color:var(--amber);font-weight:700">&#10003;</span>
              <input value="${item.replace(/"/g,'&quot;')}" style="flex:1;padding:0.25rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveInclusion(${t.id},${i},this.value)">
              <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem;padding:0.1rem 0.3rem" onclick="Tours.removeInclusion(${t.id},${i})">&#10005;</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-top:0.3rem" onclick="Tours.addInclusion(${t.id})">+ Add Item</button>
        ${!inclusions.length ? `<button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-top:0.3rem;margin-left:0.3rem;border-color:var(--amber);color:var(--amber)" onclick="Tours.addDefaultInclusions(${t.id})">Add Default Items</button>` : ''}
      </div>`;
  },

  addItineraryDay(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.itinerary) t.itinerary = [];
    const nextDay = t.itinerary.length + 1;
    // Calculate date from startDate
    let date = '';
    if (t.startDate) {
      const d = new Date(t.startDate);
      d.setDate(d.getDate() + nextDay - 1);
      date = d.toISOString().split('T')[0];
    }
    t.itinerary.push({ day: nextDay, date, title: '', items: [{ time: '0900', description: '', highlight: false }] });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  removeItineraryDay(tourId, dayIdx) {
    if (!confirm('Remove this day from the itinerary?')) return;
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.itinerary) return;
    t.itinerary.splice(dayIdx, 1);
    // Renumber days
    t.itinerary.forEach((d, i) => d.day = i + 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  saveItineraryDay(tourId, dayIdx, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.itinerary || !t.itinerary[dayIdx]) return;
    t.itinerary[dayIdx][field] = value;
    DB.saveTour(t);
  },

  addItineraryItem(tourId, dayIdx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.itinerary || !t.itinerary[dayIdx]) return;
    if (!t.itinerary[dayIdx].items) t.itinerary[dayIdx].items = [];
    t.itinerary[dayIdx].items.push({ time: '', description: '', highlight: false });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  removeItineraryItem(tourId, dayIdx, itemIdx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.itinerary || !t.itinerary[dayIdx]) return;
    t.itinerary[dayIdx].items.splice(itemIdx, 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  saveItineraryItem(tourId, dayIdx, itemIdx, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.itinerary || !t.itinerary[dayIdx] || !t.itinerary[dayIdx].items[itemIdx]) return;
    t.itinerary[dayIdx].items[itemIdx][field] = value;
    DB.saveTour(t);
  },

  autoGenerateItinerary(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.startDate) { alert('Tour must have a start date.'); return; }
    if (t.itinerary && t.itinerary.length) {
      if (!confirm('This will replace the existing itinerary. Continue?')) return;
    }
    const nights = t.nights || 0;
    const days = nights + 1;
    t.itinerary = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(t.startDate);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().split('T')[0];
      let title = '';
      let items = [];
      if (i === 0) {
        title = 'Arrival';
        items = [
          { time: '', description: 'Arrival at airport', highlight: true },
          { time: '', description: 'Transfer to hotel', highlight: false },
          { time: '', description: 'Check-in and welcome', highlight: false }
        ];
      } else if (i === days - 1) {
        title = 'Departure';
        items = [
          { time: '', description: 'Check-out', highlight: false },
          { time: '', description: 'Transfer to airport', highlight: false },
          { time: '', description: 'Departure flight', highlight: true }
        ];
      } else {
        title = 'Day ' + (i + 1);
        items = [
          { time: '0800', description: 'Breakfast at hotel', highlight: false },
          { time: '', description: '', highlight: false }
        ];
      }
      t.itinerary.push({ day: i + 1, date, title, items });
    }
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  addInclusion(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.inclusions) t.inclusions = [];
    t.inclusions.push('');
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  saveInclusion(tourId, idx, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.inclusions) return;
    t.inclusions[idx] = value;
    DB.saveTour(t);
  },

  removeInclusion(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.inclusions) return;
    t.inclusions.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  addDefaultInclusions(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    t.inclusions = [
      'Return flights',
      'Airport transfers',
      'Coach transport throughout',
      'Accommodation as detailed',
      'Meals as per hotel plan',
      'All activities and entrance fees',
      'Professional tour guide',
      'Full travel insurance'
    ];
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  /* ============================================================
     TOUR CHECKLIST
     ============================================================ */
  _renderChecklist(t) {
    const items = t.checklist || [];
    const doneCount = items.filter(c => c.done).length;
    const totalCount = items.length;

    return `
      <h3 style="margin-top:1.5rem">Tour Checklist ${totalCount ? `<span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— ${doneCount}/${totalCount} complete</span>` : ''}</h3>
      ${totalCount ? `
        <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem">
          <div style="background:var(--gray-200);border-radius:4px;height:6px;margin-bottom:0.8rem;overflow:hidden">
            <div style="background:var(--green);height:100%;width:${totalCount ? (doneCount/totalCount*100) : 0}%;transition:width 0.3s"></div>
          </div>
          ${items.map((item, i) => `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
              <input type="checkbox" ${item.done ? 'checked' : ''} onchange="Tours.toggleChecklistItem(${t.id},${i})" style="cursor:pointer;width:18px;height:18px">
              <input value="${(item.label||'').replace(/"/g,'&quot;')}" style="flex:1;padding:0.25rem 0.5rem;font-size:0.85rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);${item.done ? 'text-decoration:line-through;color:var(--gray-400)' : ''}" onchange="Tours.saveChecklistItem(${t.id},${i},'label',this.value)">
              <input type="date" value="${item.dueDate||''}" style="padding:0.25rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="Tours.saveChecklistItem(${t.id},${i},'dueDate',this.value)">
              <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.removeChecklistItem(${t.id},${i})">X</button>
            </div>
          `).join('')}
        </div>` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No checklist items yet.</p>'}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">
        <button class="btn btn-sm btn-outline" onclick="Tours.addChecklistItem(${t.id})">+ Add Item</button>
        ${!totalCount ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.addDefaultChecklist(${t.id})">Add Default Checklist</button>` : ''}
      </div>`;
  },

  toggleChecklistItem(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.checklist || !t.checklist[idx]) return;
    t.checklist[idx].done = !t.checklist[idx].done;
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  addChecklistItem(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.checklist) t.checklist = [];
    t.checklist.push({ label: '', done: false, dueDate: '' });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  removeChecklistItem(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.checklist) return;
    t.checklist.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  saveChecklistItem(tourId, idx, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.checklist || !t.checklist[idx]) return;
    t.checklist[idx][field] = value;
    DB.saveTour(t);
  },

  addDefaultChecklist(tourId, template) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const templates = {
      'School Trip': [
        { label: 'Parental consent forms collected', done: false, dueDate: '' },
        { label: 'Medical forms completed', done: false, dueDate: '' },
        { label: 'Insurance arranged', done: false, dueDate: '' },
        { label: 'Coach booking confirmed', done: false, dueDate: '' },
        { label: 'DBS checks for staff', done: false, dueDate: '' },
        { label: 'Risk assessment completed', done: false, dueDate: '' },
        { label: 'Emergency contact list compiled', done: false, dueDate: '' },
        { label: 'Hotel confirmed', done: false, dueDate: '' },
        { label: 'Flights booked', done: false, dueDate: '' },
        { label: 'Rooming list finalized', done: false, dueDate: '' },
        { label: 'Final payment received', done: false, dueDate: '' },
        { label: 'Passenger list complete', done: false, dueDate: '' }
      ],
      'Corporate Group': [
        { label: 'Contract signed', done: false, dueDate: '' },
        { label: 'Deposit received', done: false, dueDate: '' },
        { label: 'Venue booked', done: false, dueDate: '' },
        { label: 'Catering arranged', done: false, dueDate: '' },
        { label: 'Transport confirmed', done: false, dueDate: '' },
        { label: 'Insurance arranged', done: false, dueDate: '' },
        { label: 'Attendee list finalized', done: false, dueDate: '' },
        { label: 'Hotel confirmed', done: false, dueDate: '' },
        { label: 'Team building activities booked', done: false, dueDate: '' },
        { label: 'Final payment received', done: false, dueDate: '' }
      ],
      'Sports Tour': [
        { label: 'Fixtures confirmed', done: false, dueDate: '' },
        { label: 'Parental consent forms collected', done: false, dueDate: '' },
        { label: 'Medical forms completed', done: false, dueDate: '' },
        { label: 'Kit and equipment prepared', done: false, dueDate: '' },
        { label: 'Training venue booked', done: false, dueDate: '' },
        { label: 'Insurance arranged', done: false, dueDate: '' },
        { label: 'Coach booking confirmed', done: false, dueDate: '' },
        { label: 'Hotel confirmed', done: false, dueDate: '' },
        { label: 'Flights booked', done: false, dueDate: '' },
        { label: 'Rooming list finalized', done: false, dueDate: '' },
        { label: 'Final payment received', done: false, dueDate: '' },
        { label: 'Passenger list complete', done: false, dueDate: '' }
      ],
      'Custom': [
        { label: 'Hotel confirmed', done: false, dueDate: '' },
        { label: 'Flights booked', done: false, dueDate: '' },
        { label: 'Coach booked', done: false, dueDate: '' },
        { label: 'Insurance arranged', done: false, dueDate: '' },
        { label: 'Documents uploaded', done: false, dueDate: '' },
        { label: 'Rooming list finalized', done: false, dueDate: '' },
        { label: 'Final payment received', done: false, dueDate: '' },
        { label: 'Passenger list complete', done: false, dueDate: '' }
      ]
    };
    if (!template) {
      // Show template selection
      document.getElementById('tours-modal-content').querySelector('.checklist-template-select')?.remove();
      const container = document.createElement('div');
      container.className = 'checklist-template-select';
      container.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap';
      Object.keys(templates).forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline';
        btn.style.cssText = 'border-color:var(--amber);color:var(--amber)';
        btn.textContent = name;
        btn.onclick = () => Tours.addDefaultChecklist(tourId, name);
        container.appendChild(btn);
      });
      const target = document.getElementById('tours-modal-content');
      const checklistSection = target.querySelector('[onclick*="addDefaultChecklist"]');
      if (checklistSection) checklistSection.parentNode.insertBefore(container, checklistSection.nextSibling);
      return;
    }
    t.checklist = JSON.parse(JSON.stringify(templates[template] || templates['Custom']));
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  /* ============================================================
     ACTIVITY LOG / NOTES
     ============================================================ */
  _renderActivityLog(t) {
    const entries = t.activityLog || [];

    return `
      <h3 style="margin-top:1.5rem">Activity Log / Notes</h3>
      <div style="display:flex;gap:0.5rem;margin-bottom:0.8rem">
        <input id="tour-log-input-${t.id}" placeholder="Add a note..." style="flex:1;padding:0.4rem 0.6rem;font-size:0.85rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)">
        <button class="btn btn-sm btn-primary" onclick="Tours.addLogEntry(${t.id})">Add Note</button>
      </div>
      ${entries.length ? `
        <div style="border-left:3px solid var(--amber);padding-left:1rem;margin-bottom:0.8rem">
          ${[...entries].reverse().map((entry, ri) => {
            const idx = entries.length - 1 - ri;
            return `<div style="position:relative;margin-bottom:0.8rem;padding-bottom:0.8rem;border-bottom:1px solid var(--gray-100)">
              <div style="position:absolute;left:-1.35rem;top:0.2rem;width:10px;height:10px;background:var(--amber);border-radius:50%"></div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem">
                <span style="font-size:0.78rem;color:var(--gray-400)">${entry.author || 'Admin'} &mdash; ${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</span>
                <button class="btn btn-sm btn-danger" style="padding:0.1rem 0.3rem;font-size:0.68rem" onclick="Tours.removeLogEntry(${t.id},${idx})">X</button>
              </div>
              <p style="font-size:0.88rem;margin:0">${(entry.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </div>`;
          }).join('')}
        </div>` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No log entries yet.</p>'}`;
  },

  addLogEntry(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const input = document.getElementById('tour-log-input-' + tourId);
    if (!input || !input.value.trim()) return;
    if (!t.activityLog) t.activityLog = [];
    t.activityLog.push({
      text: input.value.trim(),
      author: 'Admin',
      timestamp: new Date().toISOString()
    });
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  removeLogEntry(tourId, idx) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.activityLog) return;
    t.activityLog.splice(idx, 1);
    DB.saveTour(t);
    this.viewTour(tourId);
  },

  /* ============================================================
     CLIENT PORTAL — Access codes, messages, documents
     ============================================================ */
  _renderPortalSection(t) {
    const hasCode = !!t.accessCode;
    const portalUrl = hasCode ? `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${t.accessCode}` : '';

    return `
      <h3 style="margin-top:1.5rem">Client Portal <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— share with group leaders / families</span></h3>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem">
        ${hasCode ? `
          <div style="margin-bottom:0.8rem">
            <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Access Code</label>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              <code style="font-family:'Courier New',monospace;font-size:1.4rem;font-weight:700;color:var(--navy);background:white;padding:0.4rem 1rem;border-radius:var(--radius);border:1.5px solid var(--gray-200);letter-spacing:0.1em">${t.accessCode}</code>
              <button class="btn btn-sm btn-outline" onclick="Tours.copyPortalLink(${t.id},'${t.accessCode}')">Copy Link</button>
              <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.generateAccessCode(${t.id})">New Code</button>
            </div>
          </div>
          <div style="margin-bottom:0.8rem">
            <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Portal URL</label>
            <input type="text" readonly value="${portalUrl}" style="width:100%;padding:0.4rem 0.6rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);background:white;color:var(--gray-500)" onclick="this.select()">
          </div>
        ` : `
          <p style="color:var(--gray-400);margin-bottom:0.8rem;font-size:0.85rem">Generate an access code so clients can view tour info, register passengers, and message you through the portal.</p>
          <button class="btn btn-primary" onclick="Tours.generateAccessCode(${t.id})">Generate Access Code</button>
        `}
      </div>

      <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-bottom:1rem">
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Client Messages</h4>
            <span id="msg-badge-${t.id}" style="background:var(--red);color:white;font-size:0.72rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:10px;display:none">0</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="Tours.viewMessages(${t.id})">View Messages</button>
        </div>
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Portal Documents</h4>
            <span id="doc-count-${t.id}" style="font-size:0.82rem;color:var(--gray-400)"></span>
          </div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="Tours.uploadDocument(${t.id})">Upload Document</button>
            <button class="btn btn-sm btn-outline" onclick="Tours.viewDocuments(${t.id})">View All</button>
          </div>
          <input type="file" id="doc-upload-${t.id}" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onchange="Tours.handleDocUpload(${t.id},event)">
        </div>
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Portal Passengers</h4>
            <span id="pax-badge-${t.id}" style="background:var(--blue);color:white;font-size:0.72rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:10px;display:none">0</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="Tours.viewPortalPassengers(${t.id})">View Registrations</button>
        </div>
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Family Flights</h4>
            <span id="flight-badge-${t.id}" style="background:var(--green);color:white;font-size:0.72rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:10px;display:none">0</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="Tours.viewAllFamilyFlights(${t.id})">View All Flights</button>
        </div>
      </div>
      ${hasCode ? `<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap"><button class="btn btn-sm btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="window.open('${portalUrl}','_blank')">Open Client Portal</button><button class="btn btn-sm btn-outline" style="border-color:#25D366;color:#25D366" onclick="window.open('https://wa.me/?text='+encodeURIComponent('Hi! Here is the portal for the tour ${(t.tourName||'').replace(/'/g,"\\'")}:\\n${portalUrl}'),'_blank')">WhatsApp Share</button></div>` : ''}
      <div id="portal-checklist-progress-${t.id}" style="margin-top:1rem"></div>
      <div style="margin-top:0.8rem">
        <h4 style="font-size:0.85rem;margin-bottom:0.4rem">Portal Payment Links <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— shown to clients on portal</span></h4>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Card Payment URL</label><input value="${t.portalPaymentCard || ''}" onchange="Tours.saveOrgField(${t.id},'portalPaymentCard',this.value)" placeholder="https://pay.stripe.com/..."></div>
          <div class="form-group"><label>Wise Payment URL</label><input value="${t.portalPaymentWise || ''}" onchange="Tours.saveOrgField(${t.id},'portalPaymentWise',this.value)" placeholder="https://wise.com/pay/..."></div>
        </div>
      </div>
      ${(t.individualClients && t.individualClients.length) ? (() => {
        const famCodes = t.familyAccessCodes || {};
        const codesGenerated = Object.keys(famCodes).length;
        const totalFamilies = t.individualClients.length;
        return `
        <h4 style="margin-top:1.5rem;margin-bottom:0.5rem;font-size:0.92rem">Family Portal Access <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— ${codesGenerated} of ${totalFamilies} codes generated</span></h4>
        <table class="data-table" style="font-size:0.82rem;margin-bottom:0.8rem">
          <thead><tr><th>Family</th><th>Code</th><th>Last Access</th><th>Actions</th></tr></thead>
          <tbody>${t.individualClients.map(ic => {
            const entry = famCodes[ic.id];
            const code = entry ? entry.code : null;
            return `<tr>
              <td><strong>${ic.name || '—'}</strong></td>
              <td>${code ? '<code style="font-family:monospace;font-size:0.85rem;letter-spacing:0.05em">' + code + '</code>' : '<span style="color:var(--gray-300)">Not generated</span>'}</td>
              <td>${entry && entry.lastAccess ? new Date(entry.lastAccess).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '<span style="color:var(--gray-300)">Never</span>'}</td>
              <td style="white-space:nowrap">${code
                ? '<button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.copyFamilyPortalLink(' + t.id + ',&#39;' + code + '&#39;)">Copy Link</button> <button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem;font-size:0.72rem;border-color:#25D366;color:#25D366" onclick="Tours.sendFamilyInvite(' + t.id + ',&#39;' + ic.id + '&#39;)">Invite</button> <button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem;font-size:0.72rem;border-color:var(--amber);color:var(--amber)" onclick="Tours.sendFamilyWelcome(' + t.id + ',&#39;' + ic.id + '&#39;)">Welcome</button>'
                : '<button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem;font-size:0.72rem;border-color:var(--blue);color:var(--blue)" onclick="Tours.generateFamilyCode(' + t.id + ',&#39;' + ic.id + '&#39;)">Generate</button>'
              }</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" style="border-color:var(--blue);color:var(--blue)" onclick="Tours.generateAllFamilyCodes(${t.id})">Generate All Codes</button>
          <button class="btn btn-sm btn-outline" style="border-color:#25D366;color:#25D366" onclick="Tours.sendAllFamilyInvites(${t.id})">Email All Invites</button>
          <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.sendAllFamilyWelcomes(${t.id})">Welcome All</button>
        </div>`;
      })() : ''}
      <div id="portal-detail-${t.id}"></div>`;
  },

  async _loadPortalBadges(tourId) {
    if (!DB._firebaseReady) return;
    try {
      const [paxSnap, flights] = await Promise.all([
        DB.firestore.collection('tours').doc(String(tourId)).collection('passengers').get({ source: 'server' }).catch(() => ({ size: 0 })),
        DB.getAllFamilyFlights(String(tourId)).catch(() => [])
      ]);
      const paxBadge = document.getElementById('pax-badge-' + tourId);
      if (paxBadge && paxSnap.size > 0) { paxBadge.textContent = paxSnap.size; paxBadge.style.display = 'inline-block'; }
      const flightBadge = document.getElementById('flight-badge-' + tourId);
      if (flightBadge && flights.length > 0) { flightBadge.textContent = flights.length; flightBadge.style.display = 'inline-block'; }
    } catch (e) {}
  },

  async _loadPortalChecklist(tourId) {
    const el = document.getElementById('portal-checklist-progress-' + tourId);
    if (!el || !DB._firebaseReady) return;
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;

    el.innerHTML = '<div style="font-size:0.82rem;color:var(--gray-400)">Loading portal progress...</div>';

    try {
      const tourIdStr = String(tourId);
      const [paxSnap, flightsDoc, sigDoc] = await Promise.all([
        DB.firestore.collection('tours').doc(tourIdStr).collection('passengers').get({ source: 'server' }).catch(() => ({ size: 0 })),
        DB.firestore.collection('tours').doc(tourIdStr).collection('tourFlights').doc('shared').get({ source: 'server' }).catch(() => ({ exists: false })),
        DB.firestore.collection('tours').doc(tourIdStr).collection('consent').doc('signatures').get({ source: 'server' }).catch(() => ({ exists: false, data: () => ({}) }))
      ]);

      const expectedPax = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0);
      const paxCount = paxSnap.size || 0;
      const paxOk = paxCount > 0 && (!expectedPax || paxCount >= expectedPax);

      const flightsOk = flightsDoc.exists && flightsDoc.data() && flightsDoc.data().arrival && flightsDoc.data().arrival.flightNumber;

      const roomPlan = t.roomPlan || [];
      const assignedSet = new Set();
      roomPlan.forEach(r => (r.passengers || []).forEach(id => assignedSet.add(id)));
      const roomOk = roomPlan.length > 0 && assignedSet.size > 0;

      const sigs = sigDoc.exists ? sigDoc.data() || {} : {};
      const requiredForms = t.requiredForms || ['terms', 'medical', 'photo'];
      // Count total forms signed across all access codes
      let totalFormsSigned = 0;
      let totalFormsExpected = 0;
      const sigEntries = Object.keys(sigs);
      if (sigEntries.length > 0) {
        sigEntries.forEach(code => {
          const mySigs = sigs[code] || {};
          totalFormsExpected += requiredForms.length;
          totalFormsSigned += requiredForms.filter(f => mySigs[f]).length;
        });
      }
      const formsOk = sigEntries.length > 0 && totalFormsSigned >= totalFormsExpected;

      const items = [
        { done: paxOk, label: 'Passengers registered', detail: expectedPax ? `${paxCount}/${expectedPax}` : `${paxCount}` },
        { done: !!flightsOk, label: 'Flight details submitted', detail: flightsOk ? 'Done' : 'Pending' },
        { done: roomOk, label: 'Room plan assigned', detail: roomOk ? `${assignedSet.size} assigned` : 'Pending' },
        { done: formsOk, label: 'Forms & consent signed', detail: sigEntries.length > 0 ? `${totalFormsSigned}/${totalFormsExpected}` : '0 signatures' }
      ];
      const doneCount = items.filter(i => i.done).length;
      const pct = Math.round(doneCount / items.length * 100);

      const barColor = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

      el.innerHTML = `
        <div style="background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Client Portal Progress</h4>
            <span style="font-size:0.82rem;font-weight:700;color:${barColor}">${doneCount}/${items.length} complete</span>
          </div>
          <div style="background:var(--gray-100);border-radius:8px;height:8px;overflow:hidden;margin-bottom:0.8rem">
            <div style="background:${barColor};height:100%;width:${pct}%;border-radius:8px;transition:width 0.5s"></div>
          </div>
          ${items.map(item => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;font-size:0.84rem;${item.done ? 'color:var(--gray-400)' : 'color:var(--navy)'}">
              <span style="color:${item.done ? 'var(--green)' : 'var(--gray-300)'};font-size:1rem">${item.done ? '\u2713' : '\u25CB'}</span>
              <span style="flex:1;${item.done ? 'text-decoration:line-through' : ''}">${item.label}</span>
              <span style="font-size:0.78rem;color:var(--gray-400)">${item.detail}</span>
            </div>
          `).join('')}
        </div>`;
    } catch (e) {
      el.innerHTML = '<div style="font-size:0.82rem;color:var(--gray-400)">Could not load portal progress.</div>';
    }
  },

  generateAccessCode(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    t.accessCode = DB.generateAccessCode(t.tourName);
    DB.saveTour(t);
    if (DB._firebaseReady) {
      DB.syncToFirestore('tours', [t]);
    }
    this.viewTour(tourId);
  },

  // Generate a family-specific portal code for one individual client
  generateFamilyCode(tourId, familyId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const ic = (t.individualClients || []).find(c => String(c.id) === String(familyId));
    if (!ic) return;
    if (!t.familyAccessCodes) t.familyAccessCodes = {};
    if (!t.familyAccessCodesList) t.familyAccessCodesList = [];
    const code = DB.generateFamilyAccessCode(ic.name);
    t.familyAccessCodes[familyId] = {
      code: code,
      generatedAt: new Date().toISOString(),
      lastAccess: null,
      accessCount: 0
    };
    // Rebuild flat list
    t.familyAccessCodesList = Object.values(t.familyAccessCodes).map(e => e.code);
    DB.saveTour(t);
    if (DB._firebaseReady) DB.syncToFirestore('tours', [t]);
    this.viewTour(tourId);
  },

  // Bulk generate family codes for all families that don't have one
  generateAllFamilyCodes(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients || !t.individualClients.length) return;
    if (!t.familyAccessCodes) t.familyAccessCodes = {};
    if (!t.familyAccessCodesList) t.familyAccessCodesList = [];
    let generated = 0;
    t.individualClients.forEach(ic => {
      if (!t.familyAccessCodes[ic.id]) {
        const code = DB.generateFamilyAccessCode(ic.name);
        t.familyAccessCodes[ic.id] = {
          code: code,
          generatedAt: new Date().toISOString(),
          lastAccess: null,
          accessCount: 0
        };
        generated++;
      }
    });
    t.familyAccessCodesList = Object.values(t.familyAccessCodes).map(e => e.code);
    DB.saveTour(t);
    if (DB._firebaseReady) DB.syncToFirestore('tours', [t]);
    if (generated > 0) alert(generated + ' family code(s) generated.');
    this.viewTour(tourId);
  },

  // Copy a family portal link to clipboard
  copyFamilyPortalLink(tourId, code) {
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Family portal link copied!');
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  },

  // Build family invite email body
  _familyInviteBody(t, ic, url) {
    const dest = t.destination || 'the destination';
    const dates = fmtDate(t.startDate) + ' — ' + fmtDate(t.endDate);
    const nights = t.nights ? ` (${t.nights} nights)` : '';
    const inv = DB.getInvoices().find(i => i.individualClientRef === ic.id && i.tourId === t.id);
    const amountLine = inv ? `\nYour total: ${fmt(inv.amount, t.currency)}` : (ic.amountDue ? `\nYour total: ${fmt(ic.amountDue, t.currency)}` : '');
    const paymentLines = (t.portalPaymentCard || t.portalPaymentWise) ? '\nPayment options are available directly on your portal.' : '';

    return `Dear ${ic.name},

We are pleased to share your private portal for the upcoming trip "${t.tourName}" to ${dest}.

TRIP DETAILS
Destination: ${dest}
Dates: ${dates}${nights}
${t.hotelName ? 'Hotel: ' + t.hotelName + '\n' : ''}${t.mealPlan ? 'Meal Plan: ' + t.mealPlan + '\n' : ''}
YOUR PRIVATE PORTAL
${url}

Through your portal you can:
- View the full tour details and itinerary
- Register all travelers in your family (names, passport details, dietary requirements, etc.)
- Check your payment schedule and make payments online${amountLine}${paymentLines}
- Send us private messages with any questions

IMPORTANT: This link is unique to your family. Please do not share it with other families as it gives access to your private information.

If you have any questions, you can message us directly through the portal or reply to this email.

We look forward to an amazing trip!

Kind regards,
Juan
Odisea Tours
juan@odisea-tours.com`;
  },

  // Build family welcome email body (post-registration, with cost + payment schedule + portal link)
  _familyWelcomeBody(t, ic, url) {
    const dest = t.destination || 'the destination';
    const dates = fmtDate(t.startDate) + ' — ' + fmtDate(t.endDate);
    const nights = t.nights ? ` (${t.nights} nights)` : '';
    const inv = DB.getInvoices().find(i => i.individualClientRef === ic.id && i.tourId === t.id);
    const amount = inv ? fmt(inv.amount, t.currency) : (ic.amountDue ? fmt(ic.amountDue, t.currency) : '[amount to be confirmed]');

    // Build payment schedule from invoice milestones or default
    let paymentSchedule = '';
    if (inv && inv.milestones && inv.milestones.length) {
      paymentSchedule = inv.milestones.map(ms =>
        `- ${fmtDate(ms.dueDate)} — ${ms.label || ms.percent + '%'}: ${fmt(ms.amount || (Number(inv.amount) * ms.percent / 100), t.currency)}`
      ).join('\n');
    } else {
      paymentSchedule = `- March 1st — 20% deposit: ${fmt(Number(inv ? inv.amount : ic.amountDue || 0) * 0.2, t.currency)}
- May 1st — 30%: ${fmt(Number(inv ? inv.amount : ic.amountDue || 0) * 0.3, t.currency)}
- June 1st — 30%: ${fmt(Number(inv ? inv.amount : ic.amountDue || 0) * 0.3, t.currency)}
- Remaining 20%: ${fmt(Number(inv ? inv.amount : ic.amountDue || 0) * 0.2, t.currency)}`;
    }

    return `Dear ${ic.name},

Thank you for registering for "${t.tourName}" to ${dest}! We're excited to have your family joining the group.

TRIP DETAILS
Destination: ${dest}
Dates: ${dates}${nights}
${t.hotelName ? 'Hotel: ' + t.hotelName + '\n' : ''}${t.mealPlan ? 'Meal Plan: ' + t.mealPlan + '\n' : ''}
YOUR FAMILY PORTAL
We've set up a dedicated portal for your family where you can:
- Register all your travelers (passport details, dietary requirements, etc.)
- View the full itinerary
- Add your flight details
- Access your invoice and track payments
- Send us private messages with any questions

Access your portal here:
${url}

COST & PAYMENT SCHEDULE
Your total: ${amount}

Payment schedule:
${paymentSchedule}

Payment links are available directly on your portal.

NEXT STEPS
1. Click the portal link above
2. Register each family member traveling
3. Make your first payment by the date shown above

IMPORTANT: This link is unique to your family. Please do not share it with other families as it gives access to your private information.

If you have any questions, reply to this email or use the Messages section in your portal to reach us directly.

We look forward to a fantastic trip!

Kind regards,
Juan
Odisea Tours
juan@odisea-tours.com`;
  },

  // Open editable email preview for family welcome
  sendFamilyWelcome(tourId, familyId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const ic = (t.individualClients || []).find(c => String(c.id) === String(familyId));
    if (!ic) return;
    const entry = (t.familyAccessCodes || {})[familyId];
    if (!entry) { alert('Generate a portal code first.'); return; }
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${entry.code}`;
    const subject = `Welcome to ${t.tourName} — Your Family Portal is Ready!`;
    const body = this._familyWelcomeBody(t, ic, url);

    const container = document.getElementById('portal-detail-' + t.id);
    if (!container) return;
    container.innerHTML = `
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-top:1rem;border:1.5px solid var(--gray-200)">
        <h4 style="margin-bottom:0.7rem;font-size:0.92rem">Welcome Email — ${ic.name} <span style="font-weight:400;color:var(--gray-400);font-size:0.8rem">${ic.email || 'no email set'}</span></h4>
        <div class="form-group" style="margin-bottom:0.5rem">
          <label style="font-size:0.8rem">To</label>
          <input id="fam-email-to" value="${(ic.email || '').replace(/"/g, '&quot;')}" placeholder="family@email.com" style="font-size:0.85rem">
        </div>
        <div class="form-group" style="margin-bottom:0.5rem">
          <label style="font-size:0.8rem">Subject</label>
          <input id="fam-email-subject" value="${subject.replace(/"/g, '&quot;')}" style="font-size:0.85rem">
        </div>
        <div class="form-group" style="margin-bottom:0.7rem">
          <label style="font-size:0.8rem">Body <span style="font-weight:400;color:var(--gray-400)">(edit before sending — customize payment dates & amounts as needed)</span></label>
          <textarea id="fam-email-body" rows="22" style="font-size:0.82rem;font-family:inherit;line-height:1.5;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</textarea>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" style="font-size:0.85rem" onclick="Tours._sendFamilyEmail()">Open in Email Client</button>
          <button class="btn btn-outline" style="font-size:0.85rem" onclick="Tours._copyFamilyEmail()">Copy to Clipboard</button>
          <button class="btn btn-outline" style="font-size:0.85rem" onclick="document.getElementById('portal-detail-${t.id}').innerHTML=''">Cancel</button>
        </div>
      </div>`;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  // Batch welcome email all families
  sendAllFamilyWelcomes(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients) return;
    const codes = t.familyAccessCodes || {};
    const ready = t.individualClients.filter(ic => codes[ic.id] && ic.email);
    const noCodes = t.individualClients.filter(ic => !codes[ic.id]).length;
    const noEmail = t.individualClients.filter(ic => codes[ic.id] && !ic.email).length;
    if (!ready.length) {
      let msg = 'No families ready to email.';
      if (noCodes > 0) msg += ` ${noCodes} missing codes.`;
      if (noEmail > 0) msg += ` ${noEmail} missing email addresses.`;
      alert(msg);
      return;
    }
    let msg = `Send welcome emails to ${ready.length} families?`;
    if (noEmail > 0) msg += `\n(${noEmail} families skipped — no email address)`;
    if (!confirm(msg)) return;
    ready.forEach(ic => {
      const entry = codes[ic.id];
      const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${entry.code}`;
      const subject = encodeURIComponent(`Welcome to ${t.tourName} — Your Family Portal is Ready!`);
      const body = encodeURIComponent(Tours._familyWelcomeBody(t, ic, url));
      window.open(`mailto:${ic.email}?subject=${subject}&body=${body}`, '_blank');
    });
  },

  // Open editable email preview for family invite
  sendFamilyInvite(tourId, familyId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const ic = (t.individualClients || []).find(c => String(c.id) === String(familyId));
    if (!ic) return;
    const entry = (t.familyAccessCodes || {})[familyId];
    if (!entry) { alert('Generate a code first.'); return; }
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${entry.code}`;
    const subject = `Your Portal Access — ${t.tourName}`;
    const body = this._familyInviteBody(t, ic, url);

    const container = document.getElementById('portal-detail-' + t.id);
    if (!container) return;
    container.innerHTML = `
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-top:1rem;border:1.5px solid var(--gray-200)">
        <h4 style="margin-bottom:0.7rem;font-size:0.92rem">Email Invite — ${ic.name} <span style="font-weight:400;color:var(--gray-400);font-size:0.8rem">${ic.email || 'no email set'}</span></h4>
        <div class="form-group" style="margin-bottom:0.5rem">
          <label style="font-size:0.8rem">To</label>
          <input id="fam-email-to" value="${(ic.email || '').replace(/"/g, '&quot;')}" placeholder="family@email.com" style="font-size:0.85rem">
        </div>
        <div class="form-group" style="margin-bottom:0.5rem">
          <label style="font-size:0.8rem">Subject</label>
          <input id="fam-email-subject" value="${subject.replace(/"/g, '&quot;')}" style="font-size:0.85rem">
        </div>
        <div class="form-group" style="margin-bottom:0.7rem">
          <label style="font-size:0.8rem">Body <span style="font-weight:400;color:var(--gray-400)">(edit before sending)</span></label>
          <textarea id="fam-email-body" rows="16" style="font-size:0.82rem;font-family:inherit;line-height:1.5;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</textarea>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" style="font-size:0.85rem" onclick="Tours._sendFamilyEmail()">Open in Email Client</button>
          <button class="btn btn-outline" style="font-size:0.85rem" onclick="Tours._copyFamilyEmail()">Copy to Clipboard</button>
          <button class="btn btn-outline" style="font-size:0.85rem" onclick="document.getElementById('portal-detail-${t.id}').innerHTML=''">Cancel</button>
        </div>
      </div>`;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _sendFamilyEmail() {
    const to = document.getElementById('fam-email-to').value;
    const subject = encodeURIComponent(document.getElementById('fam-email-subject').value);
    const body = encodeURIComponent(document.getElementById('fam-email-body').value);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self');
  },

  _copyFamilyEmail() {
    const subject = document.getElementById('fam-email-subject').value;
    const body = document.getElementById('fam-email-body').value;
    const full = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(full).then(() => {
      alert('Email copied to clipboard!');
    }).catch(() => {
      prompt('Copy this email:', full);
    });
  },

  // Batch email all families (opens one at a time)
  sendAllFamilyInvites(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.individualClients) return;
    const codes = t.familyAccessCodes || {};
    const withCodes = t.individualClients.filter(ic => codes[ic.id] && ic.email);
    const noCodes = t.individualClients.filter(ic => !codes[ic.id]).length;
    const noEmail = t.individualClients.filter(ic => codes[ic.id] && !ic.email).length;
    if (!withCodes.length) {
      let msg = 'No families ready to email.';
      if (noCodes > 0) msg += ` ${noCodes} missing codes.`;
      if (noEmail > 0) msg += ` ${noEmail} missing email addresses.`;
      alert(msg);
      return;
    }
    let msg = `Send invite emails to ${withCodes.length} families?`;
    if (noEmail > 0) msg += `\n(${noEmail} families skipped — no email address)`;
    if (!confirm(msg)) return;
    withCodes.forEach(ic => {
      const entry = codes[ic.id];
      const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${entry.code}`;
      const subject = encodeURIComponent(`Your Portal Access — ${t.tourName}`);
      const body = encodeURIComponent(Tours._familyInviteBody(t, ic, url));
      window.open(`mailto:${ic.email}?subject=${subject}&body=${body}`, '_blank');
    });
  },

  /* ============================================================
     GUIDE PORTAL — Access codes, expenses, notes viewer
     ============================================================ */
  _renderGuideSection(t) {
    const hasCode = !!t.guideAccessCode;
    const guideUrl = hasCode ? `${window.location.origin}${window.location.pathname.replace('index.html', '')}guide.html?code=${t.guideAccessCode}` : '';

    return `
      <h3 style="margin-top:1.5rem">Guide Portal <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— share with tour guide</span></h3>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem">
        ${hasCode ? `
          <div style="margin-bottom:0.8rem">
            <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Guide Access Code</label>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              <code style="font-family:'Courier New',monospace;font-size:1.4rem;font-weight:700;color:var(--navy);background:white;padding:0.4rem 1rem;border-radius:var(--radius);border:1.5px solid var(--gray-200);letter-spacing:0.1em">${t.guideAccessCode}</code>
              <button class="btn btn-sm btn-outline" onclick="Tours.copyGuideLink(${t.id},'${t.guideAccessCode}')">Copy Link</button>
              <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.generateGuideAccessCode(${t.id})">New Code</button>
            </div>
          </div>
          <div style="margin-bottom:0.8rem">
            <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Guide Portal URL</label>
            <input type="text" readonly value="${guideUrl}" style="width:100%;padding:0.4rem 0.6rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);background:white;color:var(--gray-500)" onclick="this.select()">
          </div>
        ` : `
          <p style="color:var(--gray-400);margin-bottom:0.8rem;font-size:0.85rem">Generate a guide access code so your tour guide can view tour info, manage room plans, track expenses, and communicate with the office.</p>
          <button class="btn btn-primary" onclick="Tours.generateGuideAccessCode(${t.id})">Generate Guide Code</button>
        `}
      </div>

      ${hasCode ? `
      <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-bottom:1rem">
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <h4 style="font-size:0.88rem;color:var(--navy);margin-bottom:0.5rem">Guide Expenses</h4>
          <button class="btn btn-sm btn-outline" onclick="Tours.viewGuideExpenses(${t.id})">View Expenses</button>
        </div>
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <h4 style="font-size:0.88rem;color:var(--navy);margin-bottom:0.5rem">Guide Notes</h4>
          <button class="btn btn-sm btn-outline" onclick="Tours.viewGuideNotes(${t.id})">View Notes</button>
        </div>
        <div style="flex:1;min-width:200px;background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h4 style="font-size:0.88rem;color:var(--navy)">Guide Documents</h4>
          </div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="Tours.uploadGuideDocument(${t.id})">Upload Document</button>
            <button class="btn btn-sm btn-outline" onclick="Tours.viewGuideDocuments(${t.id})">View All</button>
          </div>
          <input type="file" id="guide-doc-upload-${t.id}" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onchange="Tours.handleGuideDocUpload(${t.id},event)">
        </div>
      </div>
      <div style="margin-bottom:1rem">
        <button class="btn btn-sm btn-outline" style="border-color:var(--blue);color:var(--blue)" onclick="Tours.sendProviderDetailsToGuide(${t.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px;margin-right:0.3rem"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Send Provider Details to Guide
        </button>
        ${t.guideProviderDetails ? '<span style="font-size:0.78rem;color:var(--green);margin-left:0.5rem">&#10003; Sent</span>' : ''}
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">
        <button class="btn btn-sm btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="window.open('${guideUrl}','_blank')">Open Guide Portal</button>
        <button class="btn btn-sm btn-outline" style="border-color:#25D366;color:#25D366" onclick="window.open('https://wa.me/?text='+encodeURIComponent('Hi! Here is the guide portal for ${(t.tourName||'').replace(/'/g,"\\'")}:\\n${guideUrl}'),'_blank')">WhatsApp Share</button>
      </div>
      ` : ''}
      <div id="guide-detail-${t.id}"></div>`;
  },

  generateGuideAccessCode(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    t.guideAccessCode = DB.generateGuideAccessCode(t.tourName);
    DB.saveTour(t);
    if (DB._firebaseReady) {
      DB.syncToFirestore('tours', [t]);
    }
    this.viewTour(tourId);
  },

  copyGuideLink(tourId, code) {
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}guide.html?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Guide portal link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  },

  async viewGuideExpenses(tourId) {
    const container = document.getElementById('guide-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const expenses = await DB.getGuideExpenses(String(tourId));
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Guide Expenses (${expenses.length}) — Total: ${fmt(total)}</span>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button style="background:none;border:1px solid rgba(255,255,255,0.3);color:white;cursor:pointer;font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:var(--radius)" onclick="Tours.exportGuideExpensesCSV(${tourId})">CSV Export</button>
            <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('guide-detail-${tourId}').innerHTML=''">&times; Close</button>
          </div>
        </div>
        <div style="padding:1rem;max-height:400px;overflow-y:auto">
          ${expenses.length ? `<table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Receipt</th></tr></thead>
            <tbody>${expenses.map(e => `<tr>
              <td>${e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
              <td>${e.category||'—'}</td>
              <td>${e.description||'—'}</td>
              <td><strong>${fmt(e.amount, e.currency)}</strong></td>
              <td>${e.receiptPhoto ? '<img src="'+e.receiptPhoto+'" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="window.open(this.src)">' : '—'}</td>
            </tr>`).join('')}</tbody>
          </table>` : '<p style="color:var(--gray-400);font-size:0.85rem">No expenses recorded by guide yet.</p>'}
        </div>
      </div>`;

    // Store for CSV export
    this._guideExpenses = expenses;
  },

  exportGuideExpensesCSV(tourId) {
    const expenses = this._guideExpenses || [];
    if (!expenses.length) { alert('No expenses to export.'); return; }
    const header = 'Date,Category,Description,Amount,Currency\n';
    const rows = expenses.map(e => {
      const date = e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '';
      return `"${date}","${(e.category||'').replace(/"/g,'""')}","${(e.description||'').replace(/"/g,'""')}","${e.amount||0}","${e.currency||'EUR'}"`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guide-expenses-${tourId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async viewGuideNotes(tourId) {
    const container = document.getElementById('guide-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const notes = await DB.getGuideNotes(String(tourId));

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Guide Notes (${notes.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('guide-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem;max-height:400px;overflow-y:auto">
          ${notes.length ? notes.map(n => {
            const typeColors = { incident: 'var(--red)', delay: 'var(--amber)', issue: '#9B59B6', note: 'var(--blue)' };
            const sevColors = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--green)' };
            return `<div style="padding:0.7rem 0;border-bottom:1px solid var(--gray-50)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem">
                <div>
                  <span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:${typeColors[n.type]||'var(--blue)'};margin-right:0.5rem">${n.type||'note'}</span>
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sevColors[n.severity]||'var(--green)'};vertical-align:middle"></span>
                  <span style="font-size:0.72rem;color:var(--gray-400);margin-left:0.3rem">${n.severity||'low'}</span>
                </div>
                <span style="font-size:0.72rem;color:var(--gray-400)">${n.createdAt ? new Date(n.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</span>
              </div>
              <div style="font-weight:700;font-size:0.88rem;color:var(--navy)">${(n.title||'').replace(/</g,'&lt;')}</div>
              ${n.description ? `<div style="font-size:0.82rem;color:var(--gray-500);margin-top:0.2rem">${(n.description||'').replace(/</g,'&lt;')}</div>` : ''}
            </div>`;
          }).join('') : '<p style="color:var(--gray-400);font-size:0.85rem">No notes recorded by guide yet.</p>'}
        </div>
      </div>`;
  },

  // === GUIDE DOCUMENTS ===
  uploadGuideDocument(tourId) {
    const input = document.getElementById('guide-doc-upload-' + tourId);
    if (input) input.click();
  },

  async handleGuideDocUpload(tourId, event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large (max 10 MB).');
      return;
    }
    if (!DB._firebaseReady) {
      alert('Firebase not configured. Cannot upload documents.');
      return;
    }
    const result = await DB.uploadGuideDocument(String(tourId), file);
    if (result) {
      alert('Guide document uploaded: ' + file.name);
      this.viewTour(tourId);
    } else {
      alert('Upload failed. Please try again.');
    }
    event.target.value = '';
  },

  async viewGuideDocuments(tourId) {
    const container = document.getElementById('guide-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const docs = await DB.getGuideDocuments(String(tourId));
    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Guide Documents (${docs.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('guide-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem">
          ${docs.length ? docs.map(d => {
            const size = d.size ? (d.size < 1024*1024 ? Math.round(d.size/1024)+' KB' : (d.size/(1024*1024)).toFixed(1)+' MB') : '';
            return `<div style="display:flex;align-items:center;gap:0.8rem;padding:0.6rem 0;border-bottom:1px solid var(--gray-50)">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
                <div style="font-size:0.75rem;color:var(--gray-400)">${size} &bull; ${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : ''}</div>
              </div>
              <a href="${d.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="white-space:nowrap">Download</a>
              <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.deleteGuideDocument(${tourId},'${d.id}','${(d.storagePath||'').replace(/'/g,"\\'")}')">X</button>
            </div>`;
          }).join('') : '<p style="color:var(--gray-400);font-size:0.85rem">No guide documents uploaded yet.</p>'}
        </div>
      </div>`;
  },

  async deleteGuideDocument(tourId, docId, storagePath) {
    if (!confirm('Delete this guide document?')) return;
    await DB.deleteGuideDocument(String(tourId), docId, storagePath);
    this.viewGuideDocuments(tourId);
  },

  // === SEND PROVIDER DETAILS TO GUIDE ===
  async sendProviderDetailsToGuide(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const providers = DB.getProviders();
    const details = [];

    // Hotels
    if (t.hotels && t.hotels.length) {
      t.hotels.forEach(h => {
        const name = h.name || h.hotel || h.hotelName || '';
        const prov = providers.find(p => p.companyName && name && p.companyName.toLowerCase().includes(name.toLowerCase()));
        details.push({
          name: name,
          category: 'Hotel',
          phone: (prov && prov.phone) || h.phone || '',
          email: (prov && prov.email) || h.email || '',
          website: (prov && prov.website) || '',
          address: (prov && prov.address) || h.address || '',
          notes: (prov && prov.notes) || '',
          starRating: (prov && prov.starRating) || h.starRating || 0,
          checkIn: h.checkIn || '',
          checkOut: h.checkOut || '',
          service: '',
          costInfo: ''
        });
      });
    }

    // Activities
    if (t.activities && t.activities.length) {
      t.activities.forEach(a => {
        const name = a.name || a.activity || '';
        const prov = providers.find(p => p.companyName && name && p.companyName.toLowerCase().includes(name.toLowerCase()));
        details.push({
          name: name,
          category: 'Activity',
          phone: (prov && prov.phone) || '',
          email: (prov && prov.email) || '',
          website: (prov && prov.website) || '',
          address: (prov && prov.address) || a.location || '',
          notes: (prov && prov.notes) || a.notes || '',
          starRating: 0,
          checkIn: a.date || '',
          checkOut: '',
          service: a.description || '',
          costInfo: ''
        });
      });
    }

    // Provider expenses (transport, other)
    if (t.providerExpenses && t.providerExpenses.length) {
      t.providerExpenses.forEach(pe => {
        const name = pe.providerName || '';
        if (!name || details.find(d => d.name.toLowerCase() === name.toLowerCase())) return;
        const prov = providers.find(p => p.companyName && name && p.companyName.toLowerCase().includes(name.toLowerCase()));
        details.push({
          name: name,
          category: pe.category || (prov && prov.category) || 'Provider',
          phone: (prov && prov.phone) || '',
          email: (prov && prov.email) || '',
          website: (prov && prov.website) || '',
          address: (prov && prov.address) || '',
          notes: (prov && prov.notes) || '',
          starRating: (prov && prov.starRating) || 0,
          checkIn: '',
          checkOut: '',
          service: pe.description || '',
          costInfo: ''
        });
      });
    }

    t.guideProviderDetails = details;
    DB.saveTour(t);
    if (DB._firebaseReady) {
      DB.syncToFirestore('tours', [t]);
    }
    alert('Provider details sent to guide portal (' + details.length + ' providers).');
    this.viewTour(tourId);
  },

  copyPortalLink(tourId, code) {
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Portal link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  },

  _adminMsgTab: {}, // tourId -> 'group' | familyId

  _switchAdminMsgTab(tourId, tab) {
    this._adminMsgTab[tourId] = tab;
    this.viewMessages(tourId);
  },

  async viewMessages(tourId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

    await DB.resetUnreadCount(String(tourId), 'unreadMessagesCount');

    const allMessages = await DB.getTourMessages(String(tourId));
    const t = DB.getTours().find(x => x.id === tourId);
    const families = (t && t.individualClients) || [];
    const activeTab = this._adminMsgTab[tourId] || 'group';

    // Filter messages for active tab
    let filtered;
    if (activeTab === 'group') {
      filtered = allMessages.filter(m => !m.type || m.type === 'group');
    } else {
      filtered = allMessages.filter(m => m.type === 'family' && String(m.familyId) === String(activeTab));
    }

    // Count unread per family thread
    const familyMsgCounts = {};
    families.forEach(ic => {
      familyMsgCounts[ic.id] = allMessages.filter(m => m.type === 'family' && String(m.familyId) === String(ic.id)).length;
    });

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Messages</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        ${families.length ? `
        <div style="display:flex;gap:0;border-bottom:1px solid var(--gray-100);overflow-x:auto">
          <button class="admin-msg-tab${activeTab === 'group' ? ' active' : ''}" onclick="Tours._switchAdminMsgTab(${tourId},'group')">Group Announcements (${allMessages.filter(m => !m.type || m.type === 'group').length})</button>
          ${families.map(ic => `<button class="admin-msg-tab${activeTab === String(ic.id) ? ' active' : ''}" onclick="Tours._switchAdminMsgTab(${tourId},'${ic.id}')">${(ic.name||'Family').replace(/'/g,"\\'")} (${familyMsgCounts[ic.id]||0})</button>`).join('')}
        </div>` : ''}
        <div style="max-height:350px;overflow-y:auto;padding:1rem;background:var(--gray-50)" id="admin-chat-${tourId}">
          ${filtered.length ? filtered.map(m => `
            <div style="max-width:85%;padding:0.6rem 0.8rem;border-radius:10px;margin-bottom:0.5rem;font-size:0.85rem;line-height:1.5;${
              m.sender === 'admin'
                ? 'background:var(--navy);color:white;margin-left:auto;border-bottom-right-radius:3px'
                : 'background:white;border:1px solid var(--gray-100);border-bottom-left-radius:3px'
            }">
              ${m.type === 'group' || !m.type ? '<div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.5;margin-bottom:0.2rem">Announcement</div>' : ''}
              <div>${(m.text||'').replace(/</g,'&lt;')}</div>
              <div style="font-size:0.7rem;opacity:0.6;margin-top:0.2rem">${m.sender === 'admin' ? 'You' : (m.senderName || 'Client')} &bull; ${m.timestamp ? new Date(m.timestamp).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
            </div>
          `).join('') : '<div style="text-align:center;color:var(--gray-400);padding:1rem;font-size:0.85rem">No messages yet.</div>'}
        </div>
        <form style="display:flex;gap:0.5rem;padding:0.8rem 1rem;border-top:1px solid var(--gray-100)" onsubmit="Tours.sendAdminMessage(${tourId},event)">
          <input type="text" id="admin-msg-input-${tourId}" placeholder="${activeTab === 'group' ? 'Send group announcement...' : 'Reply to family...'}" style="flex:1;padding:0.5rem 0.8rem;border:1.5px solid var(--gray-200);border-radius:20px;font-size:0.85rem">
          <button type="submit" class="btn btn-sm btn-primary" style="border-radius:20px;padding:0.5rem 1rem">Send</button>
        </form>
      </div>`;

    const chatEl = document.getElementById('admin-chat-' + tourId);
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  },

  async sendAdminMessage(tourId, event) {
    event.preventDefault();
    const input = document.getElementById('admin-msg-input-' + tourId);
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const activeTab = this._adminMsgTab[tourId] || 'group';
    const msg = {
      text: text,
      sender: 'admin',
      senderName: 'Odisea Tours'
    };
    if (activeTab === 'group') {
      msg.type = 'group';
    } else {
      msg.type = 'family';
      msg.familyId = activeTab;
    }
    await DB.sendTourMessage(String(tourId), msg);
    this.viewMessages(tourId);
  },

  uploadDocument(tourId) {
    const input = document.getElementById('doc-upload-' + tourId);
    if (input) input.click();
  },

  async handleDocUpload(tourId, event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large (max 10 MB).');
      return;
    }
    if (!DB._firebaseReady) {
      alert('Firebase not configured. Cannot upload documents.');
      return;
    }
    const result = await DB.uploadTourDocument(String(tourId), file);
    if (result) {
      alert('Document uploaded: ' + file.name);
      this.viewTour(tourId);
    } else {
      alert('Upload failed. Please try again.');
    }
    event.target.value = '';
  },

  async viewDocuments(tourId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const docs = await DB.getTourDocuments(String(tourId));
    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Portal Documents (${docs.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem">
          ${docs.length ? docs.map(d => {
            const size = d.size ? (d.size < 1024*1024 ? Math.round(d.size/1024)+' KB' : (d.size/(1024*1024)).toFixed(1)+' MB') : '';
            return `<div style="display:flex;align-items:center;gap:0.8rem;padding:0.6rem 0;border-bottom:1px solid var(--gray-50)">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
                <div style="font-size:0.75rem;color:var(--gray-400)">${size} &bull; ${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : ''}</div>
              </div>
              <a href="${d.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="white-space:nowrap">Download</a>
              <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.deleteDocument(${tourId},'${d.id}','${(d.storagePath||'').replace(/'/g,"\\'")}')">X</button>
            </div>`;
          }).join('') : '<p style="color:var(--gray-400);font-size:0.85rem">No documents uploaded yet.</p>'}
        </div>
      </div>`;
  },

  async deleteDocument(tourId, docId, storagePath) {
    if (!confirm('Delete this document?')) return;
    await DB.deleteTourDocument(String(tourId), docId, storagePath);
    this.viewDocuments(tourId);
  },

  async viewPortalPassengers(tourId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    await DB.resetUnreadCount(String(tourId), 'unreadPassengersCount');
    const passengers = await DB.getTourPassengers(String(tourId));

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Portal Registrations (${passengers.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem">
          ${passengers.length ? `<table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Name</th><th>Role</th><th>Family</th><th>DOB</th><th>Nationality</th><th>Passport</th><th>Dietary</th><th>Emergency</th><th>Registered</th></tr></thead>
            <tbody>${passengers.map(p => `<tr>
              <td><strong>${p.firstName||''} ${p.lastName||''}</strong></td>
              <td>${p.role||'—'}</td>
              <td>${p.family||'—'}</td>
              <td>${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
              <td>${p.nationality||'—'}</td>
              <td>${p.passportNumber||'—'}</td>
              <td>${p.dietary||'—'}</td>
              <td>${p.emergencyContact||'—'}</td>
              <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</td>
            </tr>`).join('')}</tbody>
          </table>` : '<p style="color:var(--gray-400);font-size:0.85rem">No passengers registered through the portal yet.</p>'}
        </div>
      </div>`;
  },

  async viewFamilyFlights(tourId, familyId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const flight = await DB.getFamilyFlight(String(tourId), String(familyId));
    if (!flight) {
      container.innerHTML = '<div style="padding:1rem;color:var(--gray-400);font-size:0.85rem">No flight details submitted by this family.</div>';
      return;
    }

    const arr = flight.arrival || {};
    const ret = flight.return || {};
    const fmtFl = (f) => f.flightNumber
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem 1rem;font-size:0.82rem">
          <div><strong>Date:</strong> ${f.date || '—'}</div><div><strong>Flight:</strong> ${f.flightNumber || '—'}</div>
          <div><strong>Airline:</strong> ${f.airline || '—'}</div><div><strong>Terminal:</strong> ${f.terminal || '—'}</div>
          <div><strong>From:</strong> ${f.departureAirport || '—'} at ${f.departureTime || '—'}</div>
          <div><strong>To:</strong> ${f.arrivalAirport || '—'} at ${f.arrivalTime || '—'}</div>
          ${f.notes ? '<div style="grid-column:1/-1"><strong>Notes:</strong> ' + f.notes + '</div>' : ''}
        </div>`
      : '<p style="color:var(--gray-300);font-size:0.82rem">Not submitted</p>';

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>${flight.familyName || 'Family'} — Flight Details</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem">
          <h4 style="font-size:0.88rem;color:var(--amber);margin-bottom:0.5rem">Arrival Flight</h4>
          ${fmtFl(arr)}
          <h4 style="font-size:0.88rem;color:var(--amber);margin-top:1rem;margin-bottom:0.5rem">Return Flight</h4>
          ${fmtFl(ret)}
          <p style="font-size:0.72rem;color:var(--gray-300);margin-top:0.8rem">Last updated: ${flight.updatedAt ? new Date(flight.updatedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</p>
        </div>
      </div>`;
  },

  async viewAllFamilyFlights(tourId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div>';

    const flights = await DB.getAllFamilyFlights(String(tourId));

    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>All Family Flights (${flights.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="padding:1rem">
          ${flights.length ? `<table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Family</th><th>Arr. Date</th><th>Arr. Flight</th><th>Arr. Time</th><th>Ret. Date</th><th>Ret. Flight</th><th>Ret. Time</th></tr></thead>
            <tbody>${flights.map(f => {
              const a = f.arrival || {};
              const r = f.return || {};
              return `<tr style="cursor:pointer" onclick="Tours.viewFamilyFlights('${tourId}','${f.familyId}')">
                <td><strong>${f.familyName || f.familyId}</strong></td>
                <td>${a.date || '—'}</td>
                <td>${a.flightNumber || '—'}</td>
                <td>${a.departureTime ? a.departureTime + ' &rarr; ' + (a.arrivalTime||'') : '—'}</td>
                <td>${r.date || '—'}</td>
                <td>${r.flightNumber || '—'}</td>
                <td>${r.departureTime ? r.departureTime + ' &rarr; ' + (r.arrivalTime||'') : '—'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>` : '<p style="color:var(--gray-400);font-size:0.85rem">No families have submitted flight details yet.</p>'}
        </div>
      </div>`;
  },

  sendWhatsApp(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.clientPhone) { alert('No phone number for this client.'); return; }
    const sel = document.getElementById('wa-tmpl-' + tourId);
    const tmplIdx = sel ? Number(sel.value) : 0;
    const groupSize = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
    const portalUrl = t.accessCode ? window.location.origin + window.location.pathname.replace('index.html','') + 'portal.html?code=' + t.accessCode : '';
    const invoices = DB.getInvoices().filter(i => i.tourId === t.id);
    const inv = invoices[0];
    const paid = inv ? (inv.payments||[]).reduce((s,p)=>s+Number(p.amount),0) : 0;
    const balance = inv ? Number(inv.amount) - paid : 0;
    WhatsApp.send(t.clientPhone, tmplIdx, {
      clientName: t.clientName || '',
      tourName: t.tourName || '',
      destination: t.destination || '',
      startDate: fmtDate(t.startDate),
      endDate: fmtDate(t.endDate),
      groupSize: groupSize,
      portalUrl: portalUrl,
      amount: inv ? fmt(balance, inv.currency) : '',
      dueDate: inv ? fmtDate(inv.dueDate) : '',
      paymentUrl: (inv && inv.paymentLinkCard) || portalUrl
    });
  },

  sendSMS(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.clientPhone) { alert('No phone number.'); return; }
    const portalUrl = t.accessCode ? window.location.origin + window.location.pathname.replace('index.html','') + 'portal.html?code=' + t.accessCode : '';
    const text = 'Hi ' + (t.clientName||'') + ', your tour "' + (t.tourName||'') + '" info: ' + portalUrl + ' - Odisea Tours';
    SMS.send(t.clientPhone, text);
  },

  exportCalendar(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;

    const formatICSDate = (dateStr) => {
      if (!dateStr) return '';
      return dateStr.replace(/-/g, '') + 'T000000';
    };

    const groupSize = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Odisea Tours//CRM//EN\r\n';

    // Main tour event
    ics += 'BEGIN:VEVENT\r\n';
    ics += 'DTSTART;VALUE=DATE:' + (t.startDate || '').replace(/-/g, '') + '\r\n';
    ics += 'DTEND;VALUE=DATE:' + (t.endDate || '').replace(/-/g, '') + '\r\n';
    ics += 'SUMMARY:' + (t.tourName || 'Tour') + '\r\n';
    ics += 'DESCRIPTION:Destination: ' + (t.destination || '') + '\\nClient: ' + (t.clientName || '') + '\\nGroup: ' + groupSize + ' pax\\nNights: ' + (t.nights || 0) + '\r\n';
    ics += 'LOCATION:' + (t.destination || '') + '\r\n';
    ics += 'UID:tour-' + t.id + '@odiseatours\r\n';
    ics += 'END:VEVENT\r\n';

    // Payment deadline events from invoices
    const invoices = DB.getInvoices().filter(i => i.tourId === t.id);
    invoices.forEach(inv => {
      if (inv.dueDate) {
        ics += 'BEGIN:VEVENT\r\n';
        ics += 'DTSTART;VALUE=DATE:' + inv.dueDate.replace(/-/g, '') + '\r\n';
        ics += 'DTEND;VALUE=DATE:' + inv.dueDate.replace(/-/g, '') + '\r\n';
        ics += 'SUMMARY:Payment Due: ' + (inv.number || '') + ' - ' + (t.tourName || '') + '\r\n';
        ics += 'DESCRIPTION:Invoice ' + (inv.number || '') + ' - ' + fmt(inv.amount, inv.currency) + ' due\\nClient: ' + (inv.clientName || '') + '\r\n';
        ics += 'UID:payment-' + inv.id + '@odiseatours\r\n';
        ics += 'END:VEVENT\r\n';
      }
      // Milestone events
      (inv.paymentSchedule || []).forEach((ms, mi) => {
        if (ms.dueDate) {
          const msAmount = ms.amount || (ms.percentage ? Number(inv.amount) * ms.percentage / 100 : 0);
          ics += 'BEGIN:VEVENT\r\n';
          ics += 'DTSTART;VALUE=DATE:' + ms.dueDate.replace(/-/g, '') + '\r\n';
          ics += 'DTEND;VALUE=DATE:' + ms.dueDate.replace(/-/g, '') + '\r\n';
          ics += 'SUMMARY:' + (ms.label || 'Payment') + ': ' + (t.tourName || '') + '\r\n';
          ics += 'DESCRIPTION:' + (ms.label || 'Payment milestone') + ' - ' + fmt(msAmount, inv.currency) + '\r\n';
          ics += 'UID:milestone-' + inv.id + '-' + mi + '@odiseatours\r\n';
          ics += 'END:VEVENT\r\n';
        }
      });
    });

    ics += 'END:VCALENDAR';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (t.tourName || 'tour').replace(/[^a-zA-Z0-9]/g, '_') + '.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // === CSV Export Methods ===
  exportPassengerList(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;

    if (!DB._firebaseReady) { alert('Firebase not connected.'); return; }

    DB.getTourPassengers(String(tourId)).then(passengers => {
      if (!passengers.length) { alert('No passengers registered for this tour.'); return; }

      const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const rows = [['First Name', 'Last Name', 'Role', 'Family', 'Date of Birth', 'Nationality', 'Passport Number', 'Passport Expiry', 'Dietary', 'Medical', 'Emergency Contact', 'Room'].map(esc).join(',')];
      passengers.forEach(p => {
        rows.push([p.firstName, p.lastName, p.role, p.family, p.dateOfBirth, p.nationality, p.passportNumber, p.passportExpiry, p.dietary, p.medical, p.emergencyContact, p.room || ''].map(esc).join(','));
      });

      const csv = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Passengers_' + (t.tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  },

  exportRoomingList(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!DB._firebaseReady) { alert('Firebase not connected.'); return; }

    DB.getTourPassengers(String(tourId)).then(passengers => {
      const roomPlan = t.roomPlan || [];
      const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const rows = [['Room', 'Room Type', 'Guest Name', 'Role', 'Family', 'Check-in', 'Check-out', 'Nights', 'Dietary', 'Special Requests'].map(esc).join(',')];

      roomPlan.forEach(room => {
        const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
        const roomType = roomPax.length === 1 ? 'SGL' : roomPax.length === 2 ? 'TWN' : roomPax.length === 3 ? 'TRP' : roomPax.length >= 4 ? 'QAD' : 'SGL';
        roomPax.forEach((p, i) => {
          rows.push([
            room.name || '',
            i === 0 ? roomType : '',
            (p.firstName || '') + ' ' + (p.lastName || ''),
            p.role || '', p.family || '',
            t.startDate || '', t.endDate || '', t.nights || '',
            p.dietary || '', p.medical || ''
          ].map(esc).join(','));
        });
      });

      // Unassigned
      const assigned = new Set();
      roomPlan.forEach(r => (r.passengers || []).forEach(id => assigned.add(id)));
      const unassigned = passengers.filter(p => !assigned.has(p.id));
      if (unassigned.length) {
        rows.push('');
        rows.push(['UNASSIGNED','','','','','','','','',''].join(','));
        unassigned.forEach(p => {
          rows.push(['', '', (p.firstName||'') + ' ' + (p.lastName||''), p.role||'', p.family||'', '', '', '', p.dietary||'', ''].map(esc).join(','));
        });
      }

      const csv = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Rooming_' + (t.tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  },

  exportFinancialSummary(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const c = t.costs || {};
    const invoices = DB.getInvoices().filter(i => i.tourId === t.id);
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalCollected = invoices.reduce((s, i) => s + (i.payments||[]).reduce((ps,p)=>ps+Number(p.amount),0), 0);
    const providerTotal = (t.providerExpenses||[]).reduce((s,e)=>s+(e.amount||0),0);
    const providerPaid = (t.providerExpenses||[]).reduce((s,e)=>s+(e.paidAmount||0),0);

    const esc = (v) => { const s = String(v == null ? '' : v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [];
    rows.push(['Financial Summary \u2014 ' + (t.tourName || 'Tour')].join(','));
    rows.push([''].join(','));
    rows.push(['Category', 'Amount (' + (t.currency||'EUR') + ')'].join(','));
    rows.push(['Revenue \u2014 Students (' + (t.numStudents||0) + ' x ' + (t.priceStudent||0) + ')', ((t.numStudents||0)*(t.priceStudent||0)).toFixed(2)].join(','));
    rows.push(['Revenue \u2014 Siblings (' + (t.numSiblings||0) + ' x ' + (t.priceSibling||0) + ')', ((t.numSiblings||0)*(t.priceSibling||0)).toFixed(2)].join(','));
    rows.push(['Revenue \u2014 Adults (' + (t.numAdults||0) + ' x ' + (t.priceAdult||0) + ')', ((t.numAdults||0)*(t.priceAdult||0)).toFixed(2)].join(','));
    rows.push(['TOTAL REVENUE', (c.totalRevenue||0).toFixed(2)].join(','));
    rows.push([''].join(','));
    rows.push(['Cost \u2014 Accommodation', (c.accommodation||0).toFixed(2)].join(','));
    rows.push(['Cost \u2014 Meals', (c.meals||0).toFixed(2)].join(','));
    rows.push(['Cost \u2014 Transport', (c.transport||0).toFixed(2)].join(','));
    rows.push(['Cost \u2014 Activities', (c.activities||0).toFixed(2)].join(','));
    rows.push(['Cost \u2014 Guide', (c.guide||0).toFixed(2)].join(','));
    rows.push(['TOTAL COSTS', (c.grand||0).toFixed(2)].join(','));
    rows.push([''].join(','));
    rows.push(['PROFIT', (c.profit||0).toFixed(2)].join(','));
    rows.push(['MARGIN', ((c.margin||0).toFixed(1) + '%')].join(','));
    rows.push([''].join(','));
    rows.push(['Invoiced', totalInvoiced.toFixed(2)].join(','));
    rows.push(['Collected', totalCollected.toFixed(2)].join(','));
    rows.push(['Outstanding', (totalInvoiced - totalCollected).toFixed(2)].join(','));
    rows.push([''].join(','));
    rows.push(['Provider Costs Total', providerTotal.toFixed(2)].join(','));
    rows.push(['Provider Costs Paid', providerPaid.toFixed(2)].join(','));

    // Provider breakdown
    if ((t.providerExpenses||[]).length) {
      rows.push([''].join(','));
      rows.push(['Provider Expenses Breakdown'].join(','));
      rows.push(['Provider', 'Category', 'Amount', 'Paid', 'Status'].join(','));
      (t.providerExpenses||[]).forEach(e => {
        rows.push([esc(e.providerName), esc(e.category), (e.amount||0).toFixed(2), (e.paidAmount||0).toFixed(2), e.paid ? 'Paid' : 'Unpaid'].join(','));
      });
    }

    const csv = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Financial_' + (t.tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // === Interactive Itinerary Map ===
  _renderItineraryMap(t) {
    const hotels = t.hotels || [];
    const activities = t.activities || [];

    // Collect all locations to geocode
    const locations = [];
    const dest = (t.destination || '').split('\u2192').map(d => d.trim()).filter(Boolean);
    dest.forEach(d => locations.push({ name: d, type: 'destination' }));
    hotels.forEach(h => { if (h.hotelName) locations.push({ name: h.hotelName + ', ' + (h.city || ''), type: 'hotel', label: h.hotelName }); });
    activities.forEach(a => { if (a.name && a.destination) locations.push({ name: a.name + ', ' + a.destination, type: 'activity', label: a.name }); });

    if (!locations.length) return '';

    // Store locations on the tour object so _initMap can access them
    this._pendingMapData = { tourId: t.id, locations };

    return `
      <h3 style="margin-top:1.5rem">Itinerary Map</h3>
      <div id="tour-map-${t.id}" style="height:400px;border-radius:var(--radius-lg);overflow:hidden;border:1.5px solid var(--gray-200);margin-bottom:1rem">
        <div style="padding:2rem;text-align:center;color:var(--gray-400)">Loading map...</div>
      </div>`;
  },

  _initMap() {
    if (!this._pendingMapData) return;
    const { tourId, locations } = this._pendingMapData;
    const mapEl = document.getElementById('tour-map-' + tourId);

    if (typeof L === 'undefined') {
      // Leaflet not loaded yet — retry in 500ms (async script may still be loading)
      if (!this._mapRetries) this._mapRetries = 0;
      if (this._mapRetries < 10) {
        this._mapRetries++;
        if (mapEl) mapEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-400)">Loading map library...</div>';
        setTimeout(() => this._initMap(), 500);
        return;
      }
      if (mapEl) mapEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--red)">Map library failed to load. Check your internet connection.</div>';
      this._pendingMapData = null;
      return;
    }

    this._pendingMapData = null;
    this._mapRetries = 0;

    if (!mapEl || mapEl._leaflet_id) return;

    const map = L.map(mapEl).setView([40.4168, -3.7038], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    // Fix tiles not loading when map is inside a modal
    setTimeout(() => map.invalidateSize(), 200);

    const markers = [];
    const icons = {
      destination: L.divIcon({ className: '', html: '<div style="background:#ffb400;color:white;font-weight:700;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">\u{1F4CD}</div>', iconSize: [28, 28], iconAnchor: [14, 14] }),
      hotel: L.divIcon({ className: '', html: '<div style="background:#1a1a2e;color:white;font-weight:700;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">\u{1F3E8}</div>', iconSize: [28, 28], iconAnchor: [14, 14] }),
      activity: L.divIcon({ className: '', html: '<div style="background:#22c55e;color:white;font-weight:700;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">\u26BD</div>', iconSize: [28, 28], iconAnchor: [14, 14] })
    };
    const coords = [];

    function geocodeNext(idx) {
      if (idx >= locations.length) {
        if (coords.length > 1) {
          L.polyline(coords, { color: '#ffb400', weight: 3, dashArray: '10,10', opacity: 0.7 }).addTo(map);
        }
        if (markers.length) {
          map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
        }
        return;
      }

      const loc = locations[idx];
      fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(loc.name) + '&limit=1&email=info@odisea-tours.com')
        .then(r => r.json())
        .then(data => {
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            const marker = L.marker([lat, lon], { icon: icons[loc.type] || icons.destination })
              .bindPopup('<strong>' + (loc.label || loc.name) + '</strong><br><span style="font-size:0.82rem;color:gray">' + loc.type + '</span>')
              .addTo(map);
            markers.push(marker);
            if (loc.type === 'destination' || loc.type === 'hotel') coords.push([lat, lon]);
          }
          setTimeout(() => geocodeNext(idx + 1), 300);
        })
        .catch(() => setTimeout(() => geocodeNext(idx + 1), 300));
    }

    geocodeNext(0);
  },

  // === Feature 1: Duplicate Tour ===
  cloneTour(id) {
    const original = DB.getTours().find(x => x.id === id);
    if (!original) return;
    const clone = JSON.parse(JSON.stringify(original));
    delete clone.id;
    delete clone.createdAt;
    delete clone.confirmedAt;
    delete clone.accessCode;
    clone.tourName = (clone.tourName || '') + ' (Copy)';
    clone.status = 'Preparing';
    if (clone.checklist && clone.checklist.length) {
      clone.checklist.forEach(item => { item.done = false; });
    }
    DB.saveTour(clone);
    closeModal('tours-modal');
    this.render();
  },

  // === Feature 2: Timeline / Gantt View ===
  _renderTimeline(tours) {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const months = [];
    for (let i = 0; i < 6; i++) {
      const m = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      months.push(m);
    }
    const timelineStart = months[0].getTime();
    const timelineEnd = new Date(months[5].getFullYear(), months[5].getMonth() + 1, 0).getTime();
    const totalDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

    const colorMap = { 'Preparing': 'var(--amber)', 'In Progress': 'var(--blue)', 'Completed': 'var(--green)' };

    // Filter tours with dates within the visible range
    const visibleTours = tours.filter(t => {
      if (!t.startDate || !t.endDate) return false;
      const s = new Date(t.startDate).getTime();
      const e = new Date(t.endDate).getTime();
      return s <= timelineEnd && e >= timelineStart;
    });

    // Detect overlapping tours
    const overlaps = new Set();
    for (let i = 0; i < visibleTours.length; i++) {
      for (let j = i + 1; j < visibleTours.length; j++) {
        const a = visibleTours[i], b = visibleTours[j];
        const aStart = new Date(a.startDate).getTime(), aEnd = new Date(a.endDate).getTime();
        const bStart = new Date(b.startDate).getTime(), bEnd = new Date(b.endDate).getTime();
        if (aStart <= bEnd && bStart <= aEnd) {
          overlaps.add(a.id);
          overlaps.add(b.id);
        }
      }
    }

    // Month headers
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let monthHeadersHTML = months.map(m => {
      const mStart = m.getTime();
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getTime();
      const mDays = Math.ceil((mEnd - mStart) / (1000 * 60 * 60 * 24)) + 1;
      const widthPct = (mDays / totalDays * 100).toFixed(2);
      return `<div style="flex:0 0 ${widthPct}%;text-align:center;font-size:0.78rem;font-weight:600;padding:0.4rem 0;border-right:1px solid var(--gray-200);color:var(--gray-500)">${monthNames[m.getMonth()]} ${m.getFullYear()}</div>`;
    }).join('');

    // Tour bars
    let barsHTML = '';
    if (!visibleTours.length) {
      barsHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-400);font-size:0.85rem">No tours in this date range.</div>';
    } else {
      visibleTours.forEach(t => {
        const tStart = Math.max(new Date(t.startDate).getTime(), timelineStart);
        const tEnd = Math.min(new Date(t.endDate).getTime(), timelineEnd);
        const leftPct = ((tStart - timelineStart) / (1000 * 60 * 60 * 24) / totalDays * 100).toFixed(2);
        const widthPct = (((tEnd - tStart) / (1000 * 60 * 60 * 24) + 1) / totalDays * 100).toFixed(2);
        const color = colorMap[t.status] || 'var(--gray-400)';
        const isOverlap = overlaps.has(t.id);
        barsHTML += `<div style="position:relative;height:32px;margin-bottom:0.3rem">
          <div style="position:absolute;left:${leftPct}%;width:${widthPct}%;top:0;height:100%;background:${color};border-radius:4px;cursor:pointer;display:flex;align-items:center;padding:0 0.5rem;overflow:hidden;white-space:nowrap;font-size:0.75rem;font-weight:600;color:white;opacity:0.9;${isOverlap ? 'border:2px dashed var(--red);' : ''}" onclick="Tours.viewTour(${t.id})" title="${t.tourName} (${fmtDate(t.startDate)} - ${fmtDate(t.endDate)})${isOverlap ? ' - OVERLAP' : ''}">
            ${t.tourName} &nbsp;<span style="opacity:0.8;font-weight:400;font-size:0.7rem">${fmtDate(t.startDate)} - ${fmtDate(t.endDate)}</span>
          </div>
        </div>`;
      });
    }

    document.getElementById('tours-list-container').innerHTML = `
      <div style="overflow-x:auto;padding-bottom:0.5rem">
        <div style="min-width:800px">
          <div style="display:flex;border-bottom:2px solid var(--gray-200);background:var(--gray-50);border-radius:var(--radius) var(--radius) 0 0">
            ${monthHeadersHTML}
          </div>
          <div style="padding:0.8rem 0;position:relative;background:white;min-height:80px">
            ${barsHTML}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:1rem;margin-top:0.5rem;font-size:0.78rem;color:var(--gray-500)">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--amber);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>Preparing</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--blue);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>In Progress</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>Completed</span>
        <span><span style="display:inline-block;width:12px;height:12px;border:2px dashed var(--red);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>Overlap</span>
      </div>`;
  },

  // === Feature 4: Provider Expense Reconciliation ===
  _renderReconciliation(t) {
    const c = t.costs || {};
    const exps = t.providerExpenses || [];
    const cur = t.currency || 'EUR';

    const categories = [
      { key: 'Accommodation', estimated: (c.accommodation || 0) + (c.meals || 0), expCategory: ['Hotel', 'Accommodation'] },
      { key: 'Transport', estimated: c.transport || 0, expCategory: ['Transport'] },
      { key: 'Activities', estimated: c.activities || 0, expCategory: ['Activities', 'Activity'] },
      { key: 'Guide', estimated: c.guide || 0, expCategory: ['Guide'] },
      { key: 'Other', estimated: 0, expCategory: ['Other', ''] }
    ];

    // Calculate actuals from provider expenses grouped by category
    const categorized = new Set();
    categories.forEach(cat => {
      cat.actual = 0;
      exps.forEach((e, idx) => {
        const eCat = (e.category || '').trim();
        if (cat.expCategory.some(c => c.toLowerCase() === eCat.toLowerCase())) {
          cat.actual += (e.amount || 0);
          categorized.add(idx);
        }
      });
    });
    // Any uncategorized expenses go to Other
    exps.forEach((e, idx) => {
      if (!categorized.has(idx)) {
        categories[4].actual += (e.amount || 0);
      }
    });

    const totalEstimated = categories.reduce((s, cat) => s + cat.estimated, 0);
    const totalActual = categories.reduce((s, cat) => s + cat.actual, 0);
    const totalVariance = totalActual - totalEstimated;

    if (!exps.length && !totalEstimated) return '';

    let rowsHTML = categories.map(cat => {
      const variance = cat.actual - cat.estimated;
      const pct = cat.estimated > 0 ? Math.abs(variance / cat.estimated * 100) : (cat.actual > 0 ? 100 : 0);
      const isFlag = pct > 10 && (cat.estimated > 0 || cat.actual > 0);
      return `<tr style="${isFlag ? 'background:rgba(239,68,68,0.06)' : ''}">
        <td><strong>${cat.key}</strong></td>
        <td>${fmt(cat.estimated, cur)}</td>
        <td>${fmt(cat.actual, cur)}</td>
        <td style="color:${variance > 0 ? 'var(--red)' : variance < 0 ? 'var(--green)' : 'inherit'};font-weight:600">${variance >= 0 ? '+' : ''}${fmt(variance, cur)} ${isFlag ? '<span style="color:var(--red);font-size:0.75rem">(' + pct.toFixed(0) + '% off)</span>' : ''}</td>
      </tr>`;
    }).join('');

    const totalPct = totalEstimated > 0 ? Math.abs(totalVariance / totalEstimated * 100) : 0;

    return `
      <h3 style="margin-top:1.5rem">Cost Reconciliation <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">-- estimated vs actual</span></h3>
      <table class="data-table" style="font-size:0.85rem;margin-bottom:1rem">
        <thead><tr><th>Category</th><th>Estimated</th><th>Actual (Providers)</th><th>Variance</th></tr></thead>
        <tbody>
          ${rowsHTML}
          <tr style="font-weight:700;border-top:2px solid var(--gray-200)">
            <td>TOTAL</td>
            <td>${fmt(totalEstimated, cur)}</td>
            <td>${fmt(totalActual, cur)}</td>
            <td style="color:${totalVariance > 0 ? 'var(--red)' : totalVariance < 0 ? 'var(--green)' : 'inherit'}">${totalVariance >= 0 ? '+' : ''}${fmt(totalVariance, cur)} (${totalPct.toFixed(1)}%)</td>
          </tr>
        </tbody>
      </table>`;
  },

  // === Feature 5: Tour Calendar View ===
  _renderCalendar(tours) {
    const year = this._calendarYear;
    const month = this._calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay(); // 0=Sun
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const colorMap = { 'Preparing': 'var(--amber)', 'In Progress': 'var(--blue)', 'Completed': 'var(--green)' };

    // Find tours that overlap this month
    const monthStart = firstDay.getTime();
    const monthEnd = lastDay.getTime();
    const monthTours = tours.filter(t => {
      if (!t.startDate || !t.endDate) return false;
      const s = new Date(t.startDate).getTime();
      const e = new Date(t.endDate).getTime();
      return s <= monthEnd && e >= monthStart;
    });

    // Build day cells
    const dayCells = [];
    // Leading blanks
    for (let i = 0; i < startDow; i++) dayCells.push('<div style="min-height:80px;background:var(--gray-50);border:1px solid var(--gray-100);border-radius:var(--radius)"></div>');

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d).getTime();
      const dayTours = monthTours.filter(t => {
        const s = new Date(t.startDate).getTime();
        const e = new Date(t.endDate).getTime();
        return dayDate >= s && dayDate <= e;
      });
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      let tourBars = dayTours.map(t => {
        const color = colorMap[t.status] || 'var(--gray-400)';
        return `<div style="background:${color};color:white;font-size:0.68rem;font-weight:600;padding:0.1rem 0.3rem;border-radius:3px;margin-bottom:0.15rem;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" onclick="Tours.viewTour(${t.id})" title="${t.tourName}">${t.tourName}</div>`;
      }).join('');
      dayCells.push(`<div style="min-height:80px;background:white;border:1px solid ${isToday ? 'var(--amber)' : 'var(--gray-100)'};border-radius:var(--radius);padding:0.2rem 0.3rem;overflow:hidden">
        <div style="font-size:0.78rem;font-weight:${isToday ? '700' : '600'};color:${isToday ? 'var(--amber)' : 'var(--gray-500)'};margin-bottom:0.2rem">${d}</div>
        ${tourBars}
      </div>`);
    }

    document.getElementById('tours-list-container').innerHTML = `
      <div style="margin-bottom:0.8rem;display:flex;align-items:center;justify-content:space-between">
        <button class="btn btn-sm btn-outline" onclick="Tours._calendarMonth--;if(Tours._calendarMonth<0){Tours._calendarMonth=11;Tours._calendarYear--;}Tours.render();">&larr; Prev</button>
        <h3 style="margin:0;font-size:1.1rem">${monthNames[month]} ${year}</h3>
        <button class="btn btn-sm btn-outline" onclick="Tours._calendarMonth++;if(Tours._calendarMonth>11){Tours._calendarMonth=0;Tours._calendarYear++;}Tours.render();">Next &rarr;</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.2rem;margin-bottom:0.3rem">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div style="text-align:center;font-size:0.75rem;font-weight:700;color:var(--gray-400);padding:0.3rem 0">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.2rem">
        ${dayCells.join('')}
      </div>
      <div style="display:flex;gap:1rem;margin-top:0.8rem;font-size:0.78rem;color:var(--gray-500)">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--amber);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>Preparing</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--blue);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>In Progress</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;vertical-align:middle;margin-right:0.2rem"></span>Completed</span>
      </div>`;
  },

  // === Feature 6: Commission Section ===
  _renderCommission(t) {
    const cur = t.currency || 'EUR';
    const rate = t.commissionRate || 0;
    const totalRevenue = (t.costs && t.costs.totalRevenue) || 0;
    const commissionAmount = totalRevenue * rate / 100;

    return `
      <h3 style="margin-top:1.5rem">Commission <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">-- agent commission</span></h3>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem">
        <div class="form-row form-row-3" style="margin-bottom:0.8rem">
          <div class="form-group">
            <label>Commission Agent</label>
            <input value="${(t.commissionAgent || '').replace(/"/g,'&quot;')}" placeholder="Agent name" onchange="Tours.saveOrgField(${t.id},'commissionAgent',this.value)">
          </div>
          <div class="form-group">
            <label>Commission Rate (%)</label>
            <input type="number" step="0.1" min="0" max="100" value="${rate}" onchange="Tours.saveOrgField(${t.id},'commissionRate',this.value);Tours.viewTour(${t.id})">
          </div>
          <div class="form-group">
            <label>Commission Amount</label>
            <div style="padding:0.45rem 0;font-weight:700;font-size:1rem;color:var(--navy)">${fmt(commissionAmount, cur)}</div>
          </div>
        </div>
        <div style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.5rem">Based on total revenue of ${fmt(totalRevenue, cur)} at ${rate}%</div>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;cursor:pointer">
          <input type="checkbox" ${t.commissionPaid ? 'checked' : ''} onchange="Tours.saveOrgField(${t.id},'commissionPaid',this.checked)">
          <span style="font-weight:600;color:${t.commissionPaid ? 'var(--green)' : 'var(--gray-500)'}">Commission Paid</span>
        </label>
      </div>`;
  }
};
