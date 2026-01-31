/* === CONFIRMED TOURS MODULE === */
const Tours = {
  init() { this.render(); },

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
            <td><button class="btn btn-sm btn-outline" onclick="Tours.viewTour(${t.id})">View</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
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
          <p><strong>Group:</strong> ${groupSize} pax (${t.numStudents} students, ${t.numSiblings} siblings, ${t.numAdults} adults${t.numFOC ? ', ' + t.numFOC + ' FOC' : ''})</p>
        </div>
      </div>
      <div class="form-group">
        <label>Tour Status</label>
        <select onchange="Tours.updateStatus(${t.id}, this.value)">
          <option ${t.status==='Preparing'?'selected':''}>Preparing</option>
          <option ${t.status==='In Progress'?'selected':''}>In Progress</option>
          <option ${t.status==='Completed'?'selected':''}>Completed</option>
        </select>
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

      ${Tours._renderProviderExpenses(t)}

      ${Tours._renderIndividualClients(t)}

      <h3 style="margin-top:1.5rem">Linked Invoices</h3>
      ${invoices.length ? `<table class="data-table" style="margin-bottom:1rem">
        <thead><tr><th>Invoice</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>${invoices.map(i => {
          const paid = (i.payments||[]).reduce((s,p)=>s+Number(p.amount),0);
          const st = paid >= Number(i.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
          return `<tr><td>${i.number}</td><td>${fmt(i.amount,i.currency)}</td><td>${fmt(paid,i.currency)}</td><td><span class="badge ${badgeClass(st)}">${st}</span></td></tr>`;
        }).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:1rem">No invoices yet. Create one from the Invoicing tab.</p>'}

      <div class="modal-actions">
        <button class="btn btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="PDFItinerary.generate(${t.id})">Generate Itinerary PDF</button>
        <button class="btn btn-danger" onclick="if(confirm('Delete this tour?')){Tours.deleteTour(${t.id})}">Delete</button>
        <button class="btn btn-outline" onclick="closeModal('tours-modal')">Close</button>
      </div>`;
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
    DB.deleteTour(id);
    closeModal('tours-modal');
    this.render();
    Dashboard.render();
  },

  // Organization helpers
  saveOrgField(id, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t) return;
    t[field] = isNaN(Number(value)) ? value : Number(value);
    DB.saveTour(t);
  },

  saveOrgHotel(id, hotelIdx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.hotels || !t.hotels[hotelIdx]) return;
    t.hotels[hotelIdx][field] = isNaN(Number(value)) ? value : Number(value);
    DB.saveTour(t);
  },

  saveOrgRoom(id, hotelIdx, roomIdx, field, value) {
    const t = DB.getTours().find(x => x.id === id);
    if (!t || !t.hotels || !t.hotels[hotelIdx]) return;
    const rooms = t.hotels[hotelIdx].rooms;
    if (!rooms || !rooms[roomIdx]) return;
    rooms[roomIdx][field] = Number(value) || 0;
    DB.saveTour(t);
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

  recalcCosts(id) {
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
    this.viewTour(id);
    alert('Costs recalculated! Total: ' + fmt(grand, t.currency) + ' | Profit: ' + fmt(profit, t.currency));
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

  /* ============================================================
     INDIVIDUAL CLIENTS (families / individuals paying separately)
     ============================================================ */
  _renderIndividualClients(t) {
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
      <h3 style="margin-top:1.5rem">Individual Clients <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— families / individuals paying separately</span></h3>
      ${clients.length ? `
      <div style="display:flex;gap:1rem;margin-bottom:0.8rem;font-size:0.85rem;flex-wrap:wrap">
        <span><strong>Clients:</strong> ${clients.length}</span>
        <span><strong>Participants:</strong> ${icStudents} students, ${icSiblings} siblings, ${icAdults} adults</span>
        <span><strong>Total billed:</strong> ${fmt(totalDue, t.currency)}</span>
        <span><strong>Collected:</strong> <span style="color:var(--green)">${fmt(totalPaidIC, t.currency)}</span></span>
        <span><strong>Outstanding:</strong> <span style="color:${totalDue - totalPaidIC > 0 ? 'var(--red)' : 'var(--green)'}">${fmt(totalDue - totalPaidIC, t.currency)}</span></span>
      </div>
      <table class="data-table" style="font-size:0.82rem;margin-bottom:0.8rem">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Students</th><th>Siblings</th><th>Adults</th><th>Amount Due</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${clients.map((ic, i) => {
          const inv = invoices.find(iv => iv.individualClientRef === ic.id && iv.tourId === t.id);
          const paid = inv ? (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0) : 0;
          const status = !inv ? 'No Invoice' : paid >= Number(inv.amount) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
          return `<tr>
            <td><strong>${ic.name || '—'}</strong></td>
            <td>${ic.email || '—'}</td>
            <td>${ic.phone || '—'}</td>
            <td>${ic.numStudents || 0}</td>
            <td>${ic.numSiblings || 0}</td>
            <td>${ic.numAdults || 0}</td>
            <td style="font-weight:600">${fmt(ic.amountDue || 0, t.currency)}</td>
            <td><span class="badge ${status === 'Paid' ? 'badge-confirmed' : status === 'Partial' ? 'badge-sent' : status === 'Unpaid' ? 'badge-unpaid' : 'badge-draft'}">${status}</span></td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="Tours.editIndividualClient(${t.id},${i})" title="Edit">Edit</button>
              ${!inv ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.createIndividualInvoice(${t.id},${i})" title="Create invoice">Invoice</button>` : `<button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="PDFQuote.generateInvoice(${inv.id})" title="View PDF">PDF</button>`}
              <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.72rem" onclick="Tours.removeIndividualClient(${t.id},${i})">X</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>` : '<p style="color:var(--gray-400);margin-bottom:0.5rem;font-size:0.85rem">No individual clients added yet. Use this for groups where families pay separately.</p>'}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="Tours.addIndividualClient(${t.id})">+ Add Individual Client</button>
        ${clients.length > 0 ? `<button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber)" onclick="Tours.autoCalcIndividualAmounts(${t.id})">Auto-Calculate Amounts</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Tours.createAllIndividualInvoices(${t.id})">Create All Invoices</button>` : ''}
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
        <div class="form-group"><label>Students / Players</label><input id="ic-students" type="number" min="0" value="${ic.numStudents||0}"></div>
        <div class="form-group"><label>Siblings</label><input id="ic-siblings" type="number" min="0" value="${ic.numSiblings||0}"></div>
        <div class="form-group"><label>Adults</label><input id="ic-adults" type="number" min="0" value="${ic.numAdults||0}"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="ic-notes" rows="2" placeholder="Room preferences, dietary requirements, etc.">${ic.notes||''}</textarea></div>
      <p style="font-size:0.82rem;color:var(--gray-400);margin:0.5rem 0">
        Quick calc: ${ic.numStudents||0} students × ${fmt(t.priceStudent||0, t.currency)} + ${ic.numSiblings||0} siblings × ${fmt(t.priceSibling||0, t.currency)} + ${ic.numAdults||0} adults × ${fmt(t.priceAdult||0, t.currency)}
        = <strong>${fmt(((ic.numStudents||0)*(t.priceStudent||0)) + ((ic.numSiblings||0)*(t.priceSibling||0)) + ((ic.numAdults||0)*(t.priceAdult||0)), t.currency)}</strong>
        <button class="btn btn-sm btn-outline" style="margin-left:0.5rem;font-size:0.75rem" onclick="document.getElementById('ic-amount').value=${((ic.numStudents||0)*(t.priceStudent||0)) + ((ic.numSiblings||0)*(t.priceSibling||0)) + ((ic.numAdults||0)*(t.priceAdult||0))}">Use this amount</button>
      </p>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Tours.saveIndividualClient(${tourId},${idx})">Save</button>
        <button class="btn btn-outline" onclick="Tours.viewTour(${tourId})">Cancel</button>
      </div>`;
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
          <script>(async()=>{if(!DB._firebaseReady)return;try{const s=await DB.firestore.collection('tours').doc('${t.id}').collection('passengers').get();const b=document.getElementById('pax-badge-${t.id}');if(b&&s.size>0){b.textContent=s.size;b.style.display='inline-block';}}catch(e){}})()</script>
        </div>
      </div>
      ${hasCode ? `<div style="margin-top:0.5rem"><button class="btn btn-sm btn-outline" style="border-color:var(--navy);color:var(--navy)" onclick="window.open('${portalUrl}','_blank')">Open Client Portal</button></div>` : ''}
      <div id="portal-detail-${t.id}"></div>`;
  },

  generateAccessCode(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    t.accessCode = DB.generateAccessCode(t.tourName);
    DB.saveTour(t);
    // Also sync to Firestore
    if (DB._firebaseReady) {
      DB.syncToFirestore('tours', [t]);
    }
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

  async viewMessages(tourId) {
    const container = document.getElementById('portal-detail-' + tourId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1rem"><div style="display:inline-block;width:20px;height:20px;border:2.5px solid var(--gray-200);border-top-color:var(--amber);border-radius:50%;animation:spin 0.6s linear infinite"></div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

    // Reset unread count
    await DB.resetUnreadCount(String(tourId), 'unreadMessagesCount');

    const messages = await DB.getTourMessages(String(tourId));
    container.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);margin-bottom:1rem">
        <div style="background:var(--navy);color:white;padding:0.8rem 1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Client Messages (${messages.length})</span>
          <button style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem" onclick="document.getElementById('portal-detail-${tourId}').innerHTML=''">&times; Close</button>
        </div>
        <div style="max-height:350px;overflow-y:auto;padding:1rem;background:var(--gray-50)" id="admin-chat-${tourId}">
          ${messages.length ? messages.map(m => `
            <div style="max-width:85%;padding:0.6rem 0.8rem;border-radius:10px;margin-bottom:0.5rem;font-size:0.85rem;line-height:1.5;${
              m.sender === 'admin'
                ? 'background:var(--navy);color:white;margin-left:auto;border-bottom-right-radius:3px'
                : 'background:white;border:1px solid var(--gray-100);border-bottom-left-radius:3px'
            }">
              <div>${(m.text||'').replace(/</g,'&lt;')}</div>
              <div style="font-size:0.7rem;opacity:0.6;margin-top:0.2rem">${m.sender === 'admin' ? 'You' : (m.senderName || 'Client')} &bull; ${m.timestamp ? new Date(m.timestamp).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
            </div>
          `).join('') : '<div style="text-align:center;color:var(--gray-400);padding:1rem;font-size:0.85rem">No messages yet.</div>'}
        </div>
        <form style="display:flex;gap:0.5rem;padding:0.8rem 1rem;border-top:1px solid var(--gray-100)" onsubmit="Tours.sendAdminMessage(${tourId},event)">
          <input type="text" id="admin-msg-input-${tourId}" placeholder="Reply to client..." style="flex:1;padding:0.5rem 0.8rem;border:1.5px solid var(--gray-200);border-radius:20px;font-size:0.85rem">
          <button type="submit" class="btn btn-sm btn-primary" style="border-radius:20px;padding:0.5rem 1rem">Send</button>
        </form>
      </div>`;

    // Scroll to bottom
    const chatEl = document.getElementById('admin-chat-' + tourId);
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  },

  async sendAdminMessage(tourId, event) {
    event.preventDefault();
    const input = document.getElementById('admin-msg-input-' + tourId);
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await DB.sendTourMessage(String(tourId), {
      text: text,
      sender: 'admin',
      senderName: 'Odisea Tours'
    });
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
            <thead><tr><th>Name</th><th>DOB</th><th>Nationality</th><th>Passport</th><th>Dietary</th><th>Emergency</th><th>Registered</th></tr></thead>
            <tbody>${passengers.map(p => `<tr>
              <td><strong>${p.firstName||''} ${p.lastName||''}</strong></td>
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
  }
};
