/* === NEW QUOTE / PRICING CALCULATOR === */
const Quote = {
  currentStep: 0,
  totalSteps: 7,
  data: {},
  editingQuoteId: null,
  stepNames: ['Setup', 'Group', 'Hotel', 'Transport', 'Activities', 'Guide', 'Summary'],

  init() {
    this.editingQuoteId = null;
    this.data = {
      tourName: '', groupName: '', destinations: [{city: 'Madrid', custom: ''}], nights: 5,
      startDate: '', endDate: '', currency: 'EUR',
      numStudents: 20, numSiblings: 0, numAdults: 2, numFOC: 0,
      hotels: [],
      flightCostPerPerson: 0, airportTransfers: 0, coachHire: 0, internalTransport: 0,
      activities: [],
      numGuides: 1, guideDailyRate: 0, guideFlights: 0, guideAccommodation: 0, guideMeals: 0,
      priceStudent: 0, priceSibling: 0, priceAdult: 0,
      clientId: null, clientName: '', clientEmail: '', clientPhone: '', followUpDate: ''
    };
    this.currentStep = 0;
    this.render();
  },

  loadQuote(q) {
    this.editingQuoteId = q.id;
    this.data = {
      tourName: q.tourName || '',
      groupName: q.groupName || '',
      destinations: q.destinations && q.destinations.length ? JSON.parse(JSON.stringify(q.destinations)) : [{city: 'Madrid', custom: ''}],
      nights: q.nights || 5,
      startDate: q.startDate || '',
      endDate: q.endDate || '',
      currency: q.currency || 'EUR',
      numStudents: q.numStudents || 0,
      numSiblings: q.numSiblings || 0,
      numAdults: q.numAdults || 0,
      numFOC: q.numFOC || 0,
      hotels: q.hotels && q.hotels.length ? JSON.parse(JSON.stringify(q.hotels)) : [],
      flightCostPerPerson: q.flightCostPerPerson || 0,
      airportTransfers: q.airportTransfers || 0,
      coachHire: q.coachHire || 0,
      internalTransport: q.internalTransport || 0,
      activities: q.activities ? JSON.parse(JSON.stringify(q.activities)) : [],
      numGuides: q.numGuides || 1,
      guideDailyRate: q.guideDailyRate || 0,
      guideFlights: q.guideFlights || 0,
      guideAccommodation: q.guideAccommodation || 0,
      guideMeals: q.guideMeals || 0,
      priceStudent: q.priceStudent || 0,
      priceSibling: q.priceSibling || 0,
      priceAdult: q.priceAdult || 0,
      clientId: q.clientId || null,
      clientName: q.clientName || '',
      clientEmail: q.clientEmail || '',
      clientPhone: q.clientPhone || '',
      followUpDate: q.followUpDate || ''
    };
    // If no hotels array but has legacy flat fields, build one
    if (!this.data.hotels.length && q.hotelName) {
      const destLabel = this.data.destinations.length ? this.getDestLabel(this.data.destinations[0]) : 'Madrid';
      this.data.hotels = [{
        city: destLabel,
        hotelName: q.hotelName || '',
        starRating: q.starRating || 3,
        rooms: [{ type: q.roomType || 'Twin', qty: q.numRooms || 10, costPerNight: q.costPerNightPerRoom || 0 }],
        hotelConfirmed: q.hotelConfirmed || false,
        mealPlan: q.mealPlan || 'Half Board',
        mealCostPerPersonPerDay: q.mealCostPerPersonPerDay || 0,
        nights: q.nights || 5
      }];
    }
    // Migrate any hotels that have legacy fields but no rooms array
    this.data.hotels.forEach(h => {
      if (!h.rooms || !h.rooms.length) {
        h.rooms = [{ type: h.roomType || 'Twin', qty: h.numRooms || 10, costPerNight: h.costPerNightPerRoom || 0 }];
      }
    });
    this.currentStep = 0;
    this.render();
  },

  render() {
    this.renderIndicators();
    this.renderStep();
    this.updateNav();
  },

  renderIndicators() {
    const editBanner = this.editingQuoteId
      ? `<div style="background:var(--amber);color:white;padding:0.5rem 1rem;border-radius:var(--radius);margin-bottom:0.8rem;font-size:0.88rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>Editing Quote Q-${String(this.editingQuoteId).padStart(4,'0')}</span>
          <button class="btn btn-sm" style="background:white;color:var(--amber);border:none;font-weight:600" onclick="Quote.init()">Cancel Edit</button>
        </div>`
      : '';
    document.getElementById('quote-step-indicators').innerHTML = editBanner + this.stepNames.map((name, i) =>
      `<div class="step-ind ${i === this.currentStep ? 'active' : i < this.currentStep ? 'done' : ''}" onclick="Quote.goToStep(${i})">${i + 1}. ${name}</div>`
    ).join('');
  },

  updateNav() {
    document.getElementById('btn-prev-step').style.display = this.currentStep === 0 ? 'none' : '';
    const nextBtn = document.getElementById('btn-next-step');
    if (this.currentStep === this.totalSteps - 1) {
      nextBtn.textContent = this.editingQuoteId ? 'Save Changes' : 'Save Quote';
      nextBtn.onclick = () => Quote.saveQuote();
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.onclick = () => Quote.nextStep();
    }
  },

  nextStep() {
    this.collectStepData();
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.render();
    }
  },

  prevStep() {
    this.collectStepData();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render();
    }
  },

  goToStep(n) {
    this.collectStepData();
    this.currentStep = n;
    this.render();
  },

  val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },

  /* --- Destination helpers --- */
  getDestLabel(dest) {
    return dest.city === 'Custom' ? (dest.custom || 'Custom') : dest.city;
  },

  getDestinationLabel(dests) {
    if (!dests || !dests.length) return '—';
    return dests.map(d => this.getDestLabel(d)).join(' → ');
  },

  destRowHTML(dest, i) {
    const d = dest || { city: 'Madrid', custom: '' };
    return `<div class="dest-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem">
      <select class="dest-city" style="flex:1;padding:0.5rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:var(--font-body);font-size:0.88rem" onchange="this.nextElementSibling.style.display=this.value==='Custom'?'block':'none'">
        <option ${d.city==='Madrid'?'selected':''}>Madrid</option>
        <option ${d.city==='Valencia'?'selected':''}>Valencia</option>
        <option ${d.city==='Barcelona'?'selected':''}>Barcelona</option>
        <option ${d.city==='Tenerife'?'selected':''}>Tenerife</option>
        <option value="Custom" ${d.city==='Custom'?'selected':''}>Custom / Abroad</option>
      </select>
      <input class="dest-custom" style="flex:1;padding:0.5rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:var(--font-body);font-size:0.88rem;display:${d.city==='Custom'?'block':'none'}" value="${d.custom||''}" placeholder="Enter city name">
      ${i === 0 ? '<div style="width:36px"></div>' : '<button class="btn btn-sm btn-danger" onclick="Quote.removeDestination(this)" style="flex-shrink:0">X</button>'}
    </div>`;
  },

  addDestination() {
    const list = document.getElementById('dest-list');
    const count = list.querySelectorAll('.dest-row').length;
    if (count >= 6) { alert('Maximum 6 destinations per tour.'); return; }
    list.insertAdjacentHTML('beforeend', this.destRowHTML({ city: 'Madrid', custom: '' }, count));
    if (count + 1 >= 6) document.getElementById('btn-add-dest').style.display = 'none';
  },

  removeDestination(btn) {
    const row = btn.closest('.dest-row');
    const list = document.getElementById('dest-list');
    if (list.querySelectorAll('.dest-row').length <= 1) return;
    row.remove();
    document.getElementById('btn-add-dest').style.display = '';
  },

  collectDestinations() {
    const rows = document.querySelectorAll('.dest-row');
    const dests = [];
    rows.forEach(row => {
      const city = row.querySelector('.dest-city').value;
      const custom = row.querySelector('.dest-custom').value;
      dests.push({ city, custom });
    });
    return dests.length ? dests : [{ city: 'Madrid', custom: '' }];
  },

  /* --- Hotels per destination --- */
  syncHotels() {
    const d = this.data;
    const dests = d.destinations || [{ city: 'Madrid', custom: '' }];
    const existing = d.hotels || [];
    const synced = [];
    dests.forEach(dest => {
      const label = this.getDestLabel(dest);
      const found = existing.find(h => h.city === label);
      if (found) {
        // Migrate legacy single-room to rooms array
        if (!found.rooms || !found.rooms.length) {
          found.rooms = [{ type: found.roomType || 'Twin', qty: found.numRooms || 10, costPerNight: found.costPerNightPerRoom || 0 }];
        }
        synced.push(found);
      } else {
        synced.push({
          city: label,
          hotelName: '', starRating: 3, hotelConfirmed: false,
          rooms: [{ type: 'Twin', qty: 10, costPerNight: 0 }],
          mealPlan: 'Half Board', mealCostPerPersonPerDay: 0,
          nights: dests.length === 1 ? d.nights : 0
        });
      }
    });
    if (synced.length === 1) synced[0].nights = d.nights;
    d.hotels = synced;
  },

  roomRowHTML(r) {
    const types = ['Twin', 'Double', 'Triple', 'Single', 'Quad'];
    return `<div class="room-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.3rem">
      <select class="r-type" style="flex:1;padding:0.4rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-size:0.85rem">${types.map(t => `<option ${r.type===t?'selected':''}>${t}</option>`).join('')}</select>
      <input class="r-qty" type="number" min="0" value="${r.qty}" style="width:60px;padding:0.4rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-size:0.85rem" placeholder="Qty">
      <input class="r-cost" type="number" step="0.01" value="${r.costPerNight}" style="width:90px;padding:0.4rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-size:0.85rem" placeholder="Cost/night">
      <button class="btn btn-sm btn-danger" onclick="this.closest('.room-row').remove()" style="flex-shrink:0;padding:0.25rem 0.5rem">X</button>
    </div>`;
  },

  addRoomRow(btn) {
    const container = btn.previousElementSibling;
    container.insertAdjacentHTML('beforeend', this.roomRowHTML({ type: 'Twin', qty: 1, costPerNight: 0 }));
  },

  _hotelOptions(city, selectedName) {
    const providers = DB.getProviders().filter(p => p.category === 'Hotel' && (!city || p.city === city));
    let opts = '<option value="">— Select hotel —</option>';
    providers.forEach(p => {
      const stars = p.starRating ? ' ' + '★'.repeat(p.starRating) : '';
      const sel = (p.companyName === selectedName) ? 'selected' : '';
      opts += `<option value="${p.companyName}" data-stars="${p.starRating||3}" data-email="${p.email||''}" ${sel}>${p.companyName}${stars}</option>`;
    });
    opts += '<option value="__new__">+ Add New Hotel...</option>';
    // If selectedName exists but isn't in the provider list, add it as a custom option
    if (selectedName && !providers.find(p => p.companyName === selectedName)) {
      opts = opts.replace('— Select hotel —', '— Select hotel —</option><option value="' + selectedName.replace(/"/g,'&quot;') + '" selected>' + selectedName);
    }
    return opts;
  },

  onHotelSelect(sel, idx) {
    const val = sel.value;
    const card = sel.closest('.hotel-card');
    if (val === '__new__') {
      // Show inline "add hotel" form
      const city = card.dataset.hotelCity || '';
      const panel = card.querySelector('.h-new-panel');
      if (panel) panel.style.display = 'block';
      sel.value = '';
      return;
    }
    // Fill star rating from provider data
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.stars) {
      card.querySelector('.h-stars').value = opt.dataset.stars;
    }
  },

  saveNewHotel(idx) {
    const card = document.querySelectorAll('.hotel-card')[idx];
    if (!card) return;
    const name = card.querySelector('.h-new-name').value.trim();
    const city = card.querySelector('.h-new-city').value.trim();
    const stars = Number(card.querySelector('.h-new-stars').value) || 3;
    const email = card.querySelector('.h-new-email').value.trim();
    if (!name) { alert('Please enter a hotel name.'); return; }
    // Save to providers DB
    DB.saveProvider({
      companyName: name,
      category: 'Hotel',
      city: city,
      contactPerson: '',
      email: email,
      phone: '',
      starRating: stars,
      website: '',
      notes: 'Added from quote wizard'
    });
    // Set the hotel name and stars on the card
    const sel = card.querySelector('.h-select');
    // Re-render options and select the new one
    const destCity = card.dataset.hotelCity || city;
    sel.innerHTML = this._hotelOptions(destCity, name);
    card.querySelector('.h-stars').value = stars;
    // Hide the panel
    card.querySelector('.h-new-panel').style.display = 'none';
  },

  hotelCardHTML(h, idx, currency, isMulti) {
    const rooms = h.rooms || [{ type: 'Twin', qty: 10, costPerNight: 0 }];
    const city = h.city || '';
    return `<div class="card hotel-card" data-hotel-idx="${idx}" data-hotel-city="${city}" style="margin-bottom:1rem;border-left:4px solid var(--amber)">
      ${isMulti ? `<h4 style="margin-bottom:0.8rem;color:var(--amber);font-family:var(--font-heading)">📍 ${h.city}</h4>` : ''}
      <div class="form-row form-row-${isMulti ? '4' : '3'}">
        <div class="form-group"><label>Hotel</label><select class="h-select" onchange="Quote.onHotelSelect(this,${idx})">${this._hotelOptions(city, h.hotelName)}</select></div>
        <div class="form-group"><label>Star Rating</label><select class="h-stars">${[1,2,3,4,5].map(s=>`<option value="${s}" ${h.starRating==s?'selected':''}>${'★'.repeat(s)}</option>`).join('')}</select></div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0.55rem">
          <label class="checkbox-label" style="font-size:0.9rem">
            <input type="checkbox" class="h-confirmed" ${h.hotelConfirmed?'checked':''}>
            <strong style="color:${h.hotelConfirmed?'var(--green)':'var(--red)'}">${h.hotelConfirmed?'CONFIRMED':'NOT CONFIRMED'}</strong>
          </label>
        </div>
        ${isMulti ? `<div class="form-group"><label>Nights at ${h.city}</label><input class="h-nights" type="number" min="0" value="${h.nights}"></div>` : ''}
      </div>
      <div class="h-new-panel" style="display:none;background:var(--gray-50);border:1.5px dashed var(--amber);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem">
        <strong style="font-size:0.88rem;color:var(--amber)">Add New Hotel to Database</strong>
        <div class="form-row form-row-4" style="margin-top:0.5rem">
          <div class="form-group"><label>Hotel Name</label><input class="h-new-name" placeholder="e.g. Hotel Gran Via"></div>
          <div class="form-group"><label>City</label><input class="h-new-city" value="${city}" placeholder="City"></div>
          <div class="form-group"><label>Stars</label><select class="h-new-stars">${[1,2,3,4,5].map(s=>`<option value="${s}" ${s===3?'selected':''}>${'★'.repeat(s)}</option>`).join('')}</select></div>
          <div class="form-group"><label>Email</label><input class="h-new-email" placeholder="hotel@email.com"></div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
          <button class="btn btn-sm btn-primary" onclick="Quote.saveNewHotel(${idx})">Save & Select</button>
          <button class="btn btn-sm btn-outline" onclick="this.closest('.h-new-panel').style.display='none'">Cancel</button>
        </div>
      </div>
      <div style="margin-bottom:0.8rem">
        <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:0.4rem">Room Types & Costs (${currency})</label>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;font-size:0.75rem;color:var(--gray-400);padding-left:0.1rem">
          <span style="flex:1">Type</span><span style="width:60px">Qty</span><span style="width:90px">Cost/Night</span><span style="width:36px"></span>
        </div>
        <div class="room-rows">${rooms.map(r => this.roomRowHTML(r)).join('')}</div>
        <button class="btn btn-outline btn-sm" onclick="Quote.addRoomRow(this)" style="margin-top:0.3rem">+ Add Room Type</button>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Meal Plan</label><select class="h-mealPlan"><option ${h.mealPlan==='Half Board'?'selected':''}>Half Board</option><option ${h.mealPlan==='Full Board'?'selected':''}>Full Board</option><option ${h.mealPlan==='Breakfast Only'?'selected':''}>Breakfast Only</option></select></div>
        <div class="form-group"><label>Meal Cost / Person / Day (${currency})</label><input class="h-mealCost" type="number" step="0.01" value="${h.mealCostPerPersonPerDay}"></div>
      </div>
    </div>`;
  },

  collectHotels() {
    const cards = document.querySelectorAll('.hotel-card');
    const d = this.data;
    const isMulti = (d.destinations || []).length > 1;
    d.hotels = [];
    cards.forEach((card, idx) => {
      const dest = d.destinations[idx] || d.destinations[0];
      const rooms = [];
      card.querySelectorAll('.room-row').forEach(row => {
        rooms.push({
          type: row.querySelector('.r-type').value,
          qty: Number(row.querySelector('.r-qty').value) || 0,
          costPerNight: Number(row.querySelector('.r-cost').value) || 0
        });
      });
      d.hotels.push({
        city: this.getDestLabel(dest),
        hotelName: card.querySelector('.h-select').value || '',
        starRating: Number(card.querySelector('.h-stars').value) || 3,
        hotelConfirmed: card.querySelector('.h-confirmed').checked,
        rooms: rooms.length ? rooms : [{ type: 'Twin', qty: 0, costPerNight: 0 }],
        mealPlan: card.querySelector('.h-mealPlan').value,
        mealCostPerPersonPerDay: Number(card.querySelector('.h-mealCost').value) || 0,
        nights: isMulti ? (Number(card.querySelector('.h-nights').value) || 0) : d.nights
      });
    });
  },

  /* --- Activities per destination --- */
  activityRowHTML(a, i) {
    return `<div class="activity-row act-row">
      <input class="act-name" value="${a.name}" placeholder="Activity name">
      <input class="act-cost" type="number" step="0.01" value="${a.costPerPerson}" placeholder="Cost/person" ${a.isFree?'disabled':''}>
      <input class="act-day" type="number" min="1" value="${a.day}" placeholder="Day">
      <label class="checkbox-label"><input type="checkbox" class="act-free" ${a.isFree?'checked':''} onchange="this.closest('.act-row').querySelector('.act-cost').disabled=this.checked;if(this.checked)this.closest('.act-row').querySelector('.act-cost').value=0">Free</label>
      <label class="checkbox-label" style="white-space:nowrap"><input type="checkbox" class="act-players" ${a.playersOnly?'checked':''}> Players Only</label>
      <button class="btn btn-sm btn-danger" onclick="this.closest('.act-row').remove()">X</button>
    </div>`;
  },

  addActivity(destLabel) {
    const listId = destLabel ? 'act-list-' + this.slugify(destLabel) : 'activities-list';
    const list = document.getElementById(listId);
    if (!list) return;
    list.insertAdjacentHTML('beforeend', this.activityRowHTML({ name: '', costPerPerson: 0, day: 1, isFree: false }, list.querySelectorAll('.act-row').length));
  },

  addPresetActivity(name, cost, free, destLabel) {
    this.collectActivities();
    this.data.activities.push({ name, costPerPerson: cost, day: 1, isFree: free, playersOnly: false, destination: destLabel || '' });
    this.renderStep();
  },

  slugify(str) {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '_');
  },

  collectActivities() {
    const d = this.data;
    const dests = d.destinations || [{city:'Madrid',custom:''}];
    const isMulti = dests.length > 1;
    d.activities = [];

    if (isMulti) {
      dests.forEach(dest => {
        const label = this.getDestLabel(dest);
        const listEl = document.getElementById('act-list-' + this.slugify(label));
        if (!listEl) return;
        listEl.querySelectorAll('.act-row').forEach(row => {
          d.activities.push({
            name: row.querySelector('.act-name').value,
            costPerPerson: Number(row.querySelector('.act-cost').value) || 0,
            day: Number(row.querySelector('.act-day').value) || 1,
            isFree: row.querySelector('.act-free').checked,
            playersOnly: row.querySelector('.act-players').checked,
            destination: label
          });
        });
      });
    } else {
      const rows = document.querySelectorAll('.act-row');
      rows.forEach(row => {
        d.activities.push({
          name: row.querySelector('.act-name').value,
          costPerPerson: Number(row.querySelector('.act-cost').value) || 0,
          day: Number(row.querySelector('.act-day').value) || 1,
          isFree: row.querySelector('.act-free').checked,
          playersOnly: row.querySelector('.act-players').checked,
          destination: this.getDestLabel(dests[0])
        });
      });
    }
  },

  /* --- Step data collection --- */
  collectStepData() {
    const d = this.data;
    switch (this.currentStep) {
      case 0:
        d.tourName = this.val('q-tourName');
        d.groupName = this.val('q-groupName');
        d.destinations = this.collectDestinations();
        d.nights = Number(this.val('q-nights')) || 5;
        d.startDate = this.val('q-startDate');
        d.endDate = this.val('q-endDate');
        d.currency = this.val('q-currency');
        break;
      case 1:
        d.numStudents = Number(this.val('q-students')) || 0;
        d.numSiblings = Number(this.val('q-siblings')) || 0;
        d.numAdults = Number(this.val('q-adults')) || 0;
        d.numFOC = Number(this.val('q-foc')) || 0;
        break;
      case 2:
        this.collectHotels();
        break;
      case 3:
        d.flightCostPerPerson = Number(this.val('q-flightCost')) || 0;
        d.airportTransfers = Number(this.val('q-transfers')) || 0;
        d.coachHire = Number(this.val('q-coach')) || 0;
        d.internalTransport = Number(this.val('q-internal')) || 0;
        break;
      case 4:
        this.collectActivities();
        break;
      case 5:
        d.numGuides = Number(this.val('q-numGuides')) || 1;
        d.guideDailyRate = Number(this.val('q-guideRate')) || 0;
        d.guideFlights = Number(this.val('q-guideFlights')) || 0;
        d.guideAccommodation = Number(this.val('q-guideAccom')) || 0;
        d.guideMeals = Number(this.val('q-guideMeals')) || 0;
        break;
      case 6:
        d.priceStudent = Number(this.val('q-priceStudent')) || 0;
        d.priceSibling = Number(this.val('q-priceSibling')) || 0;
        d.priceAdult = Number(this.val('q-priceAdult')) || 0;
        d.clientId = Number(this.val('q-clientId')) || null;
        d.clientName = this.val('q-clientName');
        d.clientEmail = this.val('q-clientEmail');
        d.clientPhone = this.val('q-clientPhone');
        d.followUpDate = this.val('q-followUp');
        break;
    }
  },

  /* --- Step rendering --- */
  renderStep() {
    const d = this.data;
    const w = document.getElementById('quote-wizard');
    switch (this.currentStep) {
      case 0:
        w.innerHTML = `
          <h3>Tour Setup</h3>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Tour Name</label><input id="q-tourName" value="${d.tourName}" placeholder="e.g. Madrid Football Tour 2025"></div>
            <div class="form-group"><label>Group Name</label><input id="q-groupName" value="${d.groupName}" placeholder="e.g. St. Patrick's FC U16"></div>
            <div class="form-group"><label>Currency</label><select id="q-currency"><option value="EUR" ${d.currency==='EUR'?'selected':''}>EUR (€)</option><option value="USD" ${d.currency==='USD'?'selected':''}>USD ($)</option></select></div>
          </div>
          <div class="form-group">
            <label>Destinations (up to 6 cities)</label>
            <div id="dest-list">${(d.destinations || [{city:'Madrid',custom:''}]).map((dest, i) => this.destRowHTML(dest, i)).join('')}</div>
            <button class="btn btn-outline btn-sm" onclick="Quote.addDestination()" style="margin-top:0.5rem" id="btn-add-dest">+ Add Destination</button>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Number of Nights</label><input id="q-nights" type="number" min="1" max="30" value="${d.nights}"></div>
            <div class="form-group"><label>Start Date</label><input id="q-startDate" type="date" value="${d.startDate}"></div>
            <div class="form-group"><label>End Date</label><input id="q-endDate" type="date" value="${d.endDate}"></div>
          </div>`;
        break;

      case 1:
        const total = d.numStudents + d.numSiblings + d.numAdults + d.numFOC;
        const paying = d.numStudents + d.numSiblings + d.numAdults;
        w.innerHTML = `
          <h3>Group Composition</h3>
          <div class="form-row form-row-4">
            <div class="form-group"><label>Students / Players</label><input id="q-students" type="number" min="0" value="${d.numStudents}"></div>
            <div class="form-group"><label>Siblings</label><input id="q-siblings" type="number" min="0" value="${d.numSiblings}"></div>
            <div class="form-group"><label>Adults (Family)</label><input id="q-adults" type="number" min="0" value="${d.numAdults}"></div>
            <div class="form-group"><label>FOC (Free of Charge)</label><input id="q-foc" type="number" min="0" value="${d.numFOC}"></div>
          </div>
          <div class="card" style="margin-top:1rem;background:var(--gray-50)">
            <strong>Total Participants: ${total}</strong> (${paying} paying + ${d.numFOC} FOC)
          </div>`;
        break;

      case 2:
        this.syncHotels();
        const dests = d.destinations || [{city:'Madrid',custom:''}];
        const isMulti = dests.length > 1;
        let hotelHTML = '<h3>Accommodation</h3>';
        if (isMulti) {
          hotelHTML += `<div class="card" style="background:var(--gray-50);margin-bottom:1rem;padding:0.8rem 1rem">
            <strong>Multi-destination tour:</strong> Configure accommodation for each city. Total nights across all cities should equal ${d.nights}.
          </div>`;
        }
        d.hotels.forEach((h, idx) => {
          hotelHTML += this.hotelCardHTML(h, idx, d.currency, isMulti);
        });
        w.innerHTML = hotelHTML;
        break;

      case 3:
        w.innerHTML = `
          <h3>Transportation</h3>
          <div class="form-row form-row-2">
            <div class="form-group"><label>Flight Cost per Person (${d.currency})</label><input id="q-flightCost" type="number" step="0.01" value="${d.flightCostPerPerson}"></div>
            <div class="form-group"><label>Airport Transfers — Total (${d.currency})</label><input id="q-transfers" type="number" step="0.01" value="${d.airportTransfers}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>Coach / Bus Hire — Total (${d.currency})</label><input id="q-coach" type="number" step="0.01" value="${d.coachHire}"></div>
            <div class="form-group"><label>Internal Transport — Total (${d.currency})</label><input id="q-internal" type="number" step="0.01" value="${d.internalTransport}"></div>
          </div>`;
        break;

      case 4: {
        const presets = [
          { name: 'Santiago Bernabeu Tour', cost: 25 },
          { name: 'Camp Nou Tour', cost: 30 },
          { name: 'Organized Football Match', cost: 15 },
          { name: 'Cultural City Walk', cost: 0, free: true },
          { name: 'Beach Activity', cost: 0, free: true },
          { name: 'Museum Visit', cost: 12 }
        ];
        const actDests = d.destinations || [{city:'Madrid',custom:''}];
        const multiAct = actDests.length > 1;

        if (multiAct) {
          let html = '<h3>Activities</h3>';
          html += `<div class="card" style="background:var(--gray-50);margin-bottom:1rem;padding:0.8rem 1rem">
            <strong>Multi-destination tour:</strong> Add activities for each city separately.
          </div>`;
          actDests.forEach(dest => {
            const label = this.getDestLabel(dest);
            const slug = this.slugify(label);
            const destActivities = d.activities.filter(a => a.destination === label);
            html += `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--amber)">
              <h4 style="margin-bottom:0.8rem;color:var(--amber);font-family:var(--font-heading)">📍 ${label} — Activities</h4>
              <div class="preset-chips">${presets.map(p => `<button class="preset-chip" onclick="Quote.addPresetActivity('${p.name}',${p.cost},${!!p.free},'${label}')">${p.name} ${p.free?'(Free)':'('+d.currency+p.cost+')'}</button>`).join('')}</div>
              <div id="act-list-${slug}">${destActivities.map((a, i) => this.activityRowHTML(a, i)).join('')}</div>
              <button class="btn btn-outline btn-sm" onclick="Quote.addActivity('${label}')" style="margin-top:0.5rem">+ Add Activity</button>
            </div>`;
          });
          w.innerHTML = html;
        } else {
          w.innerHTML = `
            <h3>Activities</h3>
            <div class="preset-chips">${presets.map(p => `<button class="preset-chip" onclick="Quote.addPresetActivity('${p.name}',${p.cost},${!!p.free},'')">${p.name} ${p.free?'(Free)':'('+d.currency+p.cost+')'}</button>`).join('')}</div>
            <div id="activities-list">${d.activities.map((a, i) => this.activityRowHTML(a, i)).join('')}</div>
            <button class="btn btn-outline btn-sm" onclick="Quote.addActivity('')" style="margin-top:0.5rem">+ Add Activity</button>`;
        }
        break;
      }

      case 5: {
        const tp = d.numStudents + d.numSiblings + d.numAdults;
        const days = d.nights + 1;
        const guideTotal = (d.numGuides * d.guideDailyRate * days) + d.guideFlights + d.guideAccommodation + d.guideMeals;
        const perPax = tp > 0 ? guideTotal / tp : 0;
        w.innerHTML = `
          <h3>Guide Costs</h3>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Number of Guides</label><input id="q-numGuides" type="number" min="0" value="${d.numGuides}"></div>
            <div class="form-group"><label>Guide Daily Rate (${d.currency})</label><input id="q-guideRate" type="number" step="0.01" value="${d.guideDailyRate}"></div>
            <div class="form-group"><label>Guide Flights (${d.currency})</label><input id="q-guideFlights" type="number" step="0.01" value="${d.guideFlights}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>Guide Accommodation (${d.currency})</label><input id="q-guideAccom" type="number" step="0.01" value="${d.guideAccommodation}"></div>
            <div class="form-group"><label>Guide Meals (${d.currency})</label><input id="q-guideMeals" type="number" step="0.01" value="${d.guideMeals}"></div>
          </div>
          <div class="card" style="margin-top:1rem;background:var(--gray-50)">
            <strong>Total Guide Cost: ${fmt(guideTotal, d.currency)}</strong> | <strong>Per Participant: ${fmt(perPax, d.currency)}</strong>
          </div>`;
        break;
      }

      case 6:
        this.renderSummary(w);
        break;
    }
  },

  /* --- Cost calculation --- */
  calculateCosts() {
    const d = this.data;
    const paying = d.numStudents + d.numSiblings + d.numAdults;
    const tp = paying + (d.numFOC || 0);
    const days = d.nights + 1;

    // Accommodation & meals: sum across all hotels
    this.syncHotels();
    let accommodation = 0;
    let meals = 0;
    const hotelDetails = [];
    d.hotels.forEach(h => {
      const hNights = h.nights || d.nights;
      const rooms = h.rooms || [];
      const hAccom = rooms.reduce((s, r) => s + (r.qty || 0) * (r.costPerNight || 0) * hNights, 0);
      const hDays = hNights + 1;
      const hMeals = h.mealCostPerPersonPerDay * tp * hDays;
      accommodation += hAccom;
      meals += hMeals;
      hotelDetails.push({ city: h.city, accommodation: hAccom, meals: hMeals, nights: hNights, rooms });
    });

    const flights = d.flightCostPerPerson * tp;
    const transport = flights + d.airportTransfers + d.coachHire + d.internalTransport;
    const activities = d.activities.reduce((s, a) => {
      if (a.isFree) return s;
      const pax = a.playersOnly ? d.numStudents : tp;
      return s + a.costPerPerson * pax;
    }, 0);
    const guide = (d.numGuides * d.guideDailyRate * days) + d.guideFlights + d.guideAccommodation + d.guideMeals;
    const grand = accommodation + meals + transport + activities + guide;
    const costPerPerson = paying > 0 ? grand / paying : 0;
    return { accommodation, meals, flights, transport, activities, guide, grand, totalParticipants: tp, payingParticipants: paying, costPerPerson, days, hotelDetails };
  },

  /* --- Summary step --- */
  renderSummary(w) {
    const d = this.data;
    const c = this.calculateCosts();
    const dest = this.getDestinationLabel(d.destinations);
    const isMulti = (d.destinations || []).length > 1;

    // Hotel summary lines
    const roomsSummary = (rooms) => (rooms || []).map(r => `${r.qty}x ${r.type} @ ${fmt(r.costPerNight, d.currency)}/night`).join(', ');
    let hotelSummaryHTML = '';
    if (isMulti) {
      hotelSummaryHTML = d.hotels.map(h =>
        `<p style="margin-left:0.5rem"><strong>${h.city}:</strong> ${h.hotelName || '—'} ${'★'.repeat(h.starRating)} (${h.nights} nights, ${h.mealPlan})
         <span class="badge ${h.hotelConfirmed?'badge-confirmed':'badge-unpaid'}">${h.hotelConfirmed?'Confirmed':'Not Confirmed'}</span></p>
         <p style="margin-left:1rem;font-size:0.85rem;color:var(--gray-500)">Rooms: ${roomsSummary(h.rooms) || '—'}</p>`
      ).join('');
    } else {
      const h = d.hotels[0] || {};
      hotelSummaryHTML = `<p><strong>Hotel:</strong> ${h.hotelName || '—'} ${'★'.repeat(h.starRating||0)} <span class="badge ${h.hotelConfirmed?'badge-confirmed':'badge-unpaid'}">${h.hotelConfirmed?'Confirmed':'Not Confirmed'}</span></p>
        <p><strong>Rooms:</strong> ${roomsSummary(h.rooms) || '—'}</p>
        <p><strong>Meal Plan:</strong> ${h.mealPlan || '—'}</p>`;
    }

    // Cost breakdown - per hotel detail if multi
    let accomBreakdown = '';
    if (isMulti && c.hotelDetails) {
      accomBreakdown = c.hotelDetails.map(hd =>
        `<div class="cost-line" style="padding-left:1.5rem;font-size:0.88rem;color:var(--gray-500)"><span>${hd.city}: ${hd.nights} nights</span><span>${fmt(hd.accommodation, d.currency)}</span></div>`
      ).join('');
      accomBreakdown += c.hotelDetails.map(hd =>
        `<div class="cost-line" style="padding-left:1.5rem;font-size:0.88rem;color:var(--gray-500)"><span>${hd.city} Meals</span><span>${fmt(hd.meals, d.currency)}</span></div>`
      ).join('');
    }

    // Activities per destination if multi
    let actSummary = '';
    if (isMulti) {
      d.destinations.forEach(dest => {
        const label = this.getDestLabel(dest);
        const destActs = d.activities.filter(a => a.destination === label);
        if (destActs.length) {
          actSummary += `<p style="margin:0.3rem 0 0.15rem;font-weight:600;color:var(--amber)">${label}:</p>`;
          destActs.forEach(a => {
            actSummary += `<p style="margin-left:0.5rem;font-size:0.88rem">${a.name} ${a.isFree ? '(Free)' : fmt(a.costPerPerson, d.currency) + '/person'}${a.playersOnly ? ' <span style="color:var(--amber);font-weight:600;font-size:0.78rem">PLAYERS ONLY</span>' : ''}</p>`;
          });
        }
      });
    } else {
      d.activities.forEach(a => {
        actSummary += `<p style="font-size:0.88rem">${a.name} ${a.isFree ? '(Free)' : fmt(a.costPerPerson, d.currency) + '/person'}${a.playersOnly ? ' <span style="color:var(--amber);font-weight:600;font-size:0.78rem">PLAYERS ONLY</span>' : ''}</p>`;
      });
    }

    w.innerHTML = `
      <h3>Summary & Pricing</h3>
      <div class="grid-2" style="margin-bottom:1rem">
        <div>
          <p><strong>Tour:</strong> ${d.tourName || 'Untitled'}</p>
          <p><strong>Group:</strong> ${d.groupName || '—'}</p>
          <p><strong>Destination:</strong> ${dest}</p>
          <p><strong>Dates:</strong> ${fmtDate(d.startDate)} — ${fmtDate(d.endDate)} (${d.nights} nights)</p>
          ${isMulti ? '<p><strong>Hotels:</strong></p>' : ''}
          ${hotelSummaryHTML}
        </div>
        <div>
          <p><strong>Students:</strong> ${d.numStudents} | <strong>Siblings:</strong> ${d.numSiblings} | <strong>Adults:</strong> ${d.numAdults}</p>
          <p><strong>FOC Places:</strong> ${d.numFOC || 0}</p>
          <p><strong>Total Participants:</strong> ${c.totalParticipants} (${c.payingParticipants} paying)</p>
          <p><strong>Guides:</strong> ${d.numGuides}</p>
          <p><strong>Activities:</strong> ${d.activities.length}</p>
          ${actSummary ? '<div style="margin-top:0.5rem">' + actSummary + '</div>' : ''}
        </div>
      </div>
      <div class="cost-summary">
        <h3>Cost Breakdown</h3>
        <div class="cost-line"><span>Accommodation</span><span>${fmt(c.accommodation, d.currency)}</span></div>
        ${accomBreakdown}
        <div class="cost-line"><span>Meals</span><span>${fmt(c.meals, d.currency)}</span></div>
        <div class="cost-line"><span>Flights (${c.totalParticipants} pax)</span><span>${fmt(c.flights, d.currency)}</span></div>
        <div class="cost-line"><span>Airport Transfers</span><span>${fmt(d.airportTransfers, d.currency)}</span></div>
        <div class="cost-line"><span>Coach / Bus Hire</span><span>${fmt(d.coachHire, d.currency)}</span></div>
        <div class="cost-line"><span>Internal Transport</span><span>${fmt(d.internalTransport, d.currency)}</span></div>
        <div class="cost-line"><span>Activities</span><span>${fmt(c.activities, d.currency)}</span></div>
        <div class="cost-line"><span>Guide Costs</span><span>${fmt(c.guide, d.currency)}</span></div>
        <div class="cost-line total"><span>TOTAL COST</span><span class="cost-val">${fmt(c.grand, d.currency)}</span></div>
        <div class="cost-line"><span>Suggested Min. Per Person</span><span>${fmt(c.costPerPerson, d.currency)}</span></div>
      </div>
      <h3 style="margin-top:1.5rem">Set Prices Per Category</h3>
      <p style="font-size:0.85rem;color:var(--gray-400);margin-bottom:1rem">Set the selling price per person for each category. The suggested minimum cost per person is ${fmt(c.costPerPerson, d.currency)}.</p>
      <div class="pricing-cards">
        <div class="price-card">
          <div class="pc-label">Student / Player</div>
          <input id="q-priceStudent" type="number" step="0.01" value="${d.priceStudent || ''}" placeholder="0.00">
          <div class="pc-currency">${d.currency}</div>
        </div>
        <div class="price-card">
          <div class="pc-label">Sibling</div>
          <input id="q-priceSibling" type="number" step="0.01" value="${d.priceSibling || ''}" placeholder="0.00">
          <div class="pc-currency">${d.currency}</div>
        </div>
        <div class="price-card">
          <div class="pc-label">Adult</div>
          <input id="q-priceAdult" type="number" step="0.01" value="${d.priceAdult || ''}" placeholder="0.00">
          <div class="pc-currency">${d.currency}</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:1.2rem">
        <button class="btn btn-primary" style="font-size:1rem;padding:0.7rem 2rem" onclick="Quote.calculateProfit()">Calculate Profit</button>
      </div>
      <div id="profit-result"></div>
      <h3 style="margin-top:1.5rem">Client Information</h3>
      <div class="form-group" style="margin-bottom:0.8rem">
        <label>Select Existing Client</label>
        <select id="q-clientSelect" onchange="Quote.fillClientFromDB()">
          <option value="">— Type manually or select —</option>
          ${DB.getClients().map(c => `<option value="${c.id}" ${d.clientId && d.clientId === c.id ? 'selected' : ''}>${c.name}${c.contactPerson ? ' — ' + c.contactPerson : ''}</option>`).join('')}
        </select>
      </div>
      <input type="hidden" id="q-clientId" value="${d.clientId || ''}">
      <div class="form-row form-row-2">
        <div class="form-group"><label>Client Name</label><input id="q-clientName" value="${d.clientName}" placeholder="School or club name"></div>
        <div class="form-group"><label>Email</label><input id="q-clientEmail" type="email" value="${d.clientEmail}" placeholder="client@email.com"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Phone</label><input id="q-clientPhone" value="${d.clientPhone}" placeholder="+34..."></div>
        <div class="form-group"><label>Follow-up Date</label><input id="q-followUp" type="date" value="${d.followUpDate}"></div>
      </div>`;
  },

  calculateProfit() {
    const ps = Number(document.getElementById('q-priceStudent').value) || 0;
    const pb = Number(document.getElementById('q-priceSibling').value) || 0;
    const pa = Number(document.getElementById('q-priceAdult').value) || 0;
    const d = this.data;
    const c = this.calculateCosts();

    const revenueStudents = ps * d.numStudents;
    const revenueSiblings = pb * d.numSiblings;
    const revenueAdults = pa * d.numAdults;
    const totalRevenue = revenueStudents + revenueSiblings + revenueAdults;
    const profit = totalRevenue - c.grand;
    const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;
    const profitPerPerson = c.payingParticipants > 0 ? profit / c.payingParticipants : 0;

    const el = document.getElementById('profit-result');
    el.innerHTML = `
      <div style="margin-top:1.2rem;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)">
        <div style="background:${profit >= 0 ? 'var(--green)' : 'var(--red)'};color:white;padding:1.2rem 1.5rem;text-align:center">
          <div style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;font-weight:600">Profit</div>
          <div style="font-size:2.2rem;font-weight:700;margin:0.3rem 0">${fmt(profit, d.currency)}</div>
          <div style="font-size:0.9rem;opacity:0.9">Margin: ${margin}% | Per paying person: ${fmt(profitPerPerson, d.currency)}</div>
        </div>
        <div style="background:var(--white);padding:1.2rem 1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Revenue Breakdown</div>
              <div style="margin-top:0.5rem">
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>${d.numStudents} Students x ${fmt(ps, d.currency)}</span><strong>${fmt(revenueStudents, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>${d.numSiblings} Siblings x ${fmt(pb, d.currency)}</span><strong>${fmt(revenueSiblings, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>${d.numAdults} Adults x ${fmt(pa, d.currency)}</span><strong>${fmt(revenueAdults, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;font-size:1.05rem">
                  <span>Total Revenue</span><span>${fmt(totalRevenue, d.currency)}</span>
                </div>
              </div>
            </div>
            <div>
              <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Cost vs Revenue</div>
              <div style="margin-top:0.5rem">
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>Total Costs</span><strong style="color:var(--red)">${fmt(c.grand, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>Total Revenue</span><strong style="color:var(--green)">${fmt(totalRevenue, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;font-size:1.05rem;color:${profit>=0?'var(--green)':'var(--red)'}">
                  <span>Net Profit</span><span>${fmt(profit, d.currency)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.9rem">
                  <span>Profit Margin</span><strong>${margin}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.9rem">
                  <span>Profit per paying person</span><strong>${fmt(profitPerPerson, d.currency)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  fillClientFromDB() {
    const sel = document.getElementById('q-clientSelect');
    const id = Number(sel.value);
    if (!id) {
      document.getElementById('q-clientId').value = '';
      return;
    }
    const c = DB.getClients().find(x => x.id === id);
    if (!c) return;
    document.getElementById('q-clientId').value = c.id;
    document.getElementById('q-clientName').value = c.name || '';
    document.getElementById('q-clientEmail').value = c.email || '';
    document.getElementById('q-clientPhone').value = c.phone || '';
  },

  resetQuote() {
    if (!confirm('Are you sure you want to reset this quote? All entered data will be cleared.')) return;
    this.init();
  },

  buildQuoteObject() {
    const d = this.data;
    const costs = this.calculateCosts();
    const dest = this.getDestinationLabel(d.destinations);
    const h0 = d.hotels[0] || {};
    const h0rooms = h0.rooms || [];
    const totalRooms = h0rooms.reduce((s, r) => s + (r.qty || 0), 0);
    const totalRoomCost = h0rooms.reduce((s, r) => s + (r.qty || 0) * (r.costPerNight || 0), 0);
    const avgCostPerRoom = totalRooms > 0 ? totalRoomCost / totalRooms : 0;
    return {
      ...d,
      destination: dest,
      destinations: d.destinations,
      hotels: JSON.parse(JSON.stringify(d.hotels)),
      // Backward compat flat fields from first hotel
      hotelName: h0.hotelName || '',
      starRating: h0.starRating || 3,
      costPerNightPerRoom: avgCostPerRoom,
      numRooms: totalRooms,
      roomType: h0rooms.length ? h0rooms[0].type : 'Twin',
      roomTypeAlt: '',
      hotelConfirmed: h0.hotelConfirmed || false,
      mealPlan: h0.mealPlan || 'Half Board',
      mealCostPerPersonPerDay: h0.mealCostPerPersonPerDay || 0,
      costs,
      totalRevenue: (d.priceStudent * d.numStudents) + (d.priceSibling * d.numSiblings) + (d.priceAdult * d.numAdults),
      numFOC: d.numFOC,
      groupName: d.groupName
    };
  },

  saveQuote() {
    this.collectStepData();
    const q = this.buildQuoteObject();

    // Auto-add client to Clients DB if new (not selected from dropdown)
    if (q.clientName && !q.clientId) {
      const existing = DB.getClients();
      const match = existing.find(c => (c.name || '').toLowerCase().trim() === q.clientName.toLowerCase().trim());
      if (match) {
        q.clientId = match.id;
        // Update email/phone on existing client if provided and currently empty
        let updated = false;
        if (q.clientEmail && !match.email) { match.email = q.clientEmail; updated = true; }
        if (q.clientPhone && !match.phone) { match.phone = q.clientPhone; updated = true; }
        if (updated) DB.saveClient(match);
      } else {
        const newClient = DB.saveClient({
          name: q.clientName,
          contactPerson: '',
          email: q.clientEmail || '',
          phone: q.clientPhone || '',
          type: 'School',
          city: '',
          country: '',
          notes: 'Added from quote'
        });
        q.clientId = newClient.id;
      }
    }

    if (this.editingQuoteId) {
      // Editing an existing quote — ask what to do
      const choice = prompt(
        'You are editing Quote Q-' + String(this.editingQuoteId).padStart(4, '0') + '.\n\n' +
        'Type "update" to update the existing quote, or "new" to save as a new quote.\n\n' +
        '(update / new):',
        'update'
      );
      if (!choice) return; // cancelled

      const action = choice.trim().toLowerCase();
      if (action === 'update') {
        // Preserve original quote's id, createdAt, and status
        const existing = DB.getQuotes().find(x => x.id === this.editingQuoteId);
        if (existing) {
          q.id = existing.id;
          q.createdAt = existing.createdAt;
          q.status = existing.status;
        }
        DB.saveQuote(q);
        alert('Quote Q-' + String(this.editingQuoteId).padStart(4, '0') + ' updated successfully!');
      } else if (action === 'new') {
        q.status = 'Draft';
        DB.saveQuote(q);
        alert('New quote saved successfully!');
      } else {
        alert('Invalid choice. Please type "update" or "new".');
        return;
      }
    } else {
      q.status = 'Draft';
      DB.saveQuote(q);
      alert('Quote saved successfully!');
    }

    this.init();
    App.switchTab('crm');
  }
};
