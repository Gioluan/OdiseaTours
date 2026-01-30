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
  }
};
