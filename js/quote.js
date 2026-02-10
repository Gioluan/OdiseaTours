/* === NEW QUOTE / PRICING CALCULATOR === */
const Quote = {
  currentStep: 0,
  totalSteps: 8,
  data: {},
  editingQuoteId: null,
  stepNames: ['Setup', 'Group', 'Hotel', 'Transport', 'Activities', 'Guide', 'Itinerary', 'Summary'],

  init() {
    this.editingQuoteId = null;
    this.data = {
      tourName: '', groupName: '', destinations: [{city: 'Madrid', custom: ''}], nights: 5,
      startDate: '', endDate: '', currency: 'EUR',
      numStudents: 20, numSiblings: 0, numAdults: 2, numFOC: 0,
      hotels: [],
      flightCostPerPerson: 0, airportTransfers: 0, coachHire: 0, internalTransport: 0,
      activities: [],
      noGuide: false, numGuides: 1, guideDailyRate: 0, guideFlights: 0, guideAccommodation: 0, guideMeals: 0,
      itinerary: [],
      priceStudent: 0, priceSibling: 0, priceAdult: 0,
      agentCommission: false, agentName: '', agentCommissionType: 'per_person', agentCommissionAmount: 0,
      clientId: null, clientName: '', clientEmail: '', clientPhone: '', followUpDate: ''
    };
    this.currentStep = 0;
    this.render();
  },

  loadQuote(q) {
    this.editingQuoteId = q.id;
    this.data = {
      tourName: q.tourName || q.groupName || '',
      groupName: q.groupName || q.tourName || '',
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
      noGuide: q.noGuide || false,
      numGuides: q.numGuides || 1,
      guideDailyRate: q.guideDailyRate || 0,
      guideFlights: q.guideFlights || 0,
      guideAccommodation: q.guideAccommodation || 0,
      guideMeals: q.guideMeals || 0,
      itinerary: q.itinerary ? JSON.parse(JSON.stringify(q.itinerary)) : [],
      priceStudent: q.priceStudent || 0,
      priceSibling: q.priceSibling || 0,
      priceAdult: q.priceAdult || 0,
      agentCommission: q.agentCommission || false,
      agentName: q.agentName || '',
      agentCommissionType: q.agentCommissionType || 'per_person',
      agentCommissionAmount: q.agentCommissionAmount || 0,
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
  _actHeaderRendered: false,

  activityHeaderHTML() {
    return `<div class="activity-row act-header" style="margin-bottom:0.2rem;font-size:0.75rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.04em">
      <span>Activity Name</span>
      <span>Cost / Person</span>
      <span>Tour Day</span>
      <span></span>
      <span></span>
      <span></span>
    </div>`;
  },

  activityRowHTML(a, i) {
    return `<div class="activity-row act-row">
      <input class="act-name" value="${a.name}" placeholder="e.g. Stadium Tour">
      <input class="act-cost" type="number" step="0.01" value="${a.costPerPerson}" placeholder="0.00" ${a.isFree?'disabled':''}>
      <input class="act-day" type="number" min="1" value="${a.day}" placeholder="1">
      <label class="checkbox-label"><input type="checkbox" class="act-free" ${a.isFree?'checked':''} onchange="this.closest('.act-row').querySelector('.act-cost').disabled=this.checked;if(this.checked)this.closest('.act-row').querySelector('.act-cost').value=0"> Free</label>
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
        d.groupName = this.val('q-groupName');
        d.tourName = d.groupName; // Group Name is the primary identifier
        d.clientId = Number(this.val('q-clientId')) || null;
        d.clientName = this.val('q-clientName');
        d.clientEmail = this.val('q-clientEmail');
        d.clientPhone = this.val('q-clientPhone');
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
        d.noGuide = document.getElementById('q-noGuide') ? document.getElementById('q-noGuide').checked : false;
        if (d.noGuide) {
          d.numGuides = 0; d.guideDailyRate = 0; d.guideFlights = 0; d.guideAccommodation = 0; d.guideMeals = 0;
        } else {
          d.numGuides = Number(this.val('q-numGuides')) || 1;
          d.guideDailyRate = Number(this.val('q-guideRate')) || 0;
          d.guideFlights = Number(this.val('q-guideFlights')) || 0;
          d.guideAccommodation = Number(this.val('q-guideAccom')) || 0;
          d.guideMeals = Number(this.val('q-guideMeals')) || 0;
        }
        break;
      case 6:
        this.collectItinerary();
        break;
      case 7:
        d.priceStudent = Number(this.val('q-priceStudent')) || 0;
        d.priceSibling = Number(this.val('q-priceSibling')) || 0;
        d.priceAdult = Number(this.val('q-priceAdult')) || 0;
        d.agentCommission = document.getElementById('q-agentCommission') ? document.getElementById('q-agentCommission').checked : d.agentCommission;
        d.agentName = this.val('q-agentName') || '';
        d.agentCommissionType = this.val('q-agentCommType') || 'per_person';
        d.agentCommissionAmount = Number(this.val('q-agentCommAmt')) || 0;
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
        const clientOpts = DB.getClients();
        w.innerHTML = `
          <h3>Tour Setup</h3>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Group Name</label><input id="q-groupName" value="${d.groupName}" placeholder="e.g. Madrid Football Tour 2025"></div>
            <div class="form-group">
              <label>Client</label>
              <select id="q-clientSelect" onchange="Quote.onClientSelect()">
                <option value="">— Select client —</option>
                ${clientOpts.map(c => `<option value="${c.id}" data-name="${(c.name||'').replace(/"/g,'&quot;')}" data-email="${c.email||''}" data-phone="${c.phone||''}" ${d.clientId && d.clientId === c.id ? 'selected' : ''}>${c.name}${c.contactPerson ? ' — ' + c.contactPerson : ''}</option>`).join('')}
                <option value="__new__">+ Add New Client...</option>
              </select>
              <input type="hidden" id="q-clientId" value="${d.clientId || ''}">
              <input type="hidden" id="q-clientName" value="${d.clientName || ''}">
              <input type="hidden" id="q-clientEmail" value="${d.clientEmail || ''}">
              <input type="hidden" id="q-clientPhone" value="${d.clientPhone || ''}">
            </div>
            <div class="form-group"><label>Currency</label><select id="q-currency"><option value="EUR" ${d.currency==='EUR'?'selected':''}>EUR (€)</option><option value="USD" ${d.currency==='USD'?'selected':''}>USD ($)</option></select></div>
          </div>
          <div id="q-new-client-panel" style="display:none;background:var(--gray-50);border:1.5px dashed var(--amber);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem">
            <strong style="font-size:0.88rem;color:var(--amber)">Add New Client</strong>
            <div class="form-row form-row-4" style="margin-top:0.5rem">
              <div class="form-group"><label>Client Name</label><input id="q-new-cli-name" placeholder="e.g. St Patrick's School"></div>
              <div class="form-group"><label>Email</label><input id="q-new-cli-email" placeholder="client@email.com"></div>
              <div class="form-group"><label>Phone</label><input id="q-new-cli-phone" placeholder="+34..."></div>
              <div class="form-group"><label>Type</label><select id="q-new-cli-type"><option>School</option><option>Sports Club</option><option>Corporate</option><option>Private</option><option>Other</option></select></div>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
              <button class="btn btn-sm btn-primary" onclick="Quote.saveNewClient()">Save & Select</button>
              <button class="btn btn-sm btn-outline" onclick="document.getElementById('q-new-client-panel').style.display='none';document.getElementById('q-clientSelect').value=''">Cancel</button>
            </div>
          </div>
          ${d.clientName && !d.clientId ? `<div style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.5rem">Client: <strong>${d.clientName}</strong> ${d.clientEmail ? '(' + d.clientEmail + ')' : ''}</div>` : ''}
          <div class="form-group">
            <label>Destinations (up to 6 cities)</label>
            <div id="dest-list">${(d.destinations || [{city:'Madrid',custom:''}]).map((dest, i) => this.destRowHTML(dest, i)).join('')}</div>
            <button class="btn btn-outline btn-sm" onclick="Quote.addDestination()" style="margin-top:0.5rem" id="btn-add-dest">+ Add Destination</button>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Number of Nights</label><input id="q-nights" type="number" min="1" max="30" value="${d.nights}"></div>
            <div class="form-group"><label>Start Date</label><input id="q-startDate" type="date" value="${d.startDate}"></div>
            <div class="form-group"><label>End Date</label><input id="q-endDate" type="date" value="${d.endDate}"></div>
          </div>
          <div id="quote-suggestions" style="margin-top:1rem"></div>`;
        setTimeout(() => this.renderSmartSuggestions(), 50);
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
          </div>
          <div style="margin-top:1rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius-lg)">
            <h4 style="font-size:0.88rem;margin-bottom:0.5rem">Check Flight Prices</h4>
            <p style="font-size:0.82rem;color:var(--gray-400);margin-bottom:0.5rem">Open flight comparison sites with pre-filled search parameters.</p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
              <button class="btn btn-sm btn-outline" onclick="Quote.checkFlightPrices('skyscanner')">Skyscanner</button>
              <button class="btn btn-sm btn-outline" onclick="Quote.checkFlightPrices('google')">Google Flights</button>
            </div>
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
              ${destActivities.length ? this.activityHeaderHTML() : ''}
              <div id="act-list-${slug}">${destActivities.map((a, i) => this.activityRowHTML(a, i)).join('')}</div>
              <button class="btn btn-outline btn-sm" onclick="Quote.addActivity('${label}')" style="margin-top:0.5rem">+ Add Activity</button>
            </div>`;
          });
          w.innerHTML = html;
        } else {
          w.innerHTML = `
            <h3>Activities</h3>
            <div class="preset-chips">${presets.map(p => `<button class="preset-chip" onclick="Quote.addPresetActivity('${p.name}',${p.cost},${!!p.free},'')">${p.name} ${p.free?'(Free)':'('+d.currency+p.cost+')'}</button>`).join('')}</div>
            ${d.activities.length ? this.activityHeaderHTML() : ''}
            <div id="activities-list">${d.activities.map((a, i) => this.activityRowHTML(a, i)).join('')}</div>
            <button class="btn btn-outline btn-sm" onclick="Quote.addActivity('')" style="margin-top:0.5rem">+ Add Activity</button>`;
        }
        break;
      }

      case 5: {
        const tp = d.numStudents + d.numSiblings + d.numAdults;
        const days = d.nights + 1;
        const guideTotal = d.noGuide ? 0 : (d.numGuides * d.guideDailyRate * days) + d.guideFlights + d.guideAccommodation + d.guideMeals;
        const perPax = tp > 0 ? guideTotal / tp : 0;
        w.innerHTML = `
          <h3>Guide Costs</h3>
          <div style="margin-bottom:1rem;padding:1rem;background:${d.noGuide ? 'var(--red-bg)' : 'var(--gray-50)'};border-radius:var(--radius-lg);border:1.5px solid ${d.noGuide ? 'var(--red)' : 'var(--gray-200)'}">
            <label class="checkbox-label" style="font-size:1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem">
              <input type="checkbox" id="q-noGuide" ${d.noGuide ? 'checked' : ''} onchange="Quote.toggleNoGuide(this.checked)">
              No Guide Required
            </label>
            <p style="font-size:0.82rem;color:var(--gray-400);margin-top:0.3rem;margin-left:1.5rem">Check this if the tour does not require a professional guide. Guide costs will be set to zero and excluded from the quote PDF.</p>
          </div>
          <div id="guide-fields" style="display:${d.noGuide ? 'none' : 'block'}">
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
            </div>
          </div>
          ${d.noGuide ? '<div class="card" style="margin-top:1rem;background:var(--green-bg);border:1.5px solid var(--green);text-align:center"><strong style="color:var(--green)">No guide — guide costs set to zero</strong></div>' : ''}`;
        break;
      }

      case 6: {
        const days = d.nights + 1;
        const itin = d.itinerary || [];
        let itinHTML = '<h3>Sample Itinerary</h3>';
        itinHTML += '<div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:1rem;font-size:0.85rem;color:var(--gray-500);border-left:4px solid var(--amber)">';
        itinHTML += 'Create a day-by-day itinerary to include in the PDF quote. This is optional.';
        itinHTML += '</div>';
        itinHTML += '<div style="display:flex;gap:0.5rem;margin-bottom:1rem">';
        itinHTML += '<button class="btn btn-outline btn-sm" onclick="Quote.autoPopulateItinerary()">Auto-fill ' + days + ' Days</button>';
        itinHTML += '<button class="btn btn-outline btn-sm" onclick="Quote.addItineraryDay()">+ Add Day</button>';
        itinHTML += '</div>';
        itinHTML += '<div id="itinerary-list">';
        itin.forEach((item, idx) => {
          itinHTML += this.itineraryDayHTML(item, idx);
        });
        itinHTML += '</div>';
        w.innerHTML = itinHTML;
        break;
      }

      case 7:
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
    const guide = d.noGuide ? 0 : (d.numGuides * d.guideDailyRate * days) + d.guideFlights + d.guideAccommodation + d.guideMeals;

    // Agent commission
    let agentComm = 0;
    if (d.agentCommission && d.agentCommissionAmount > 0) {
      if (d.agentCommissionType === 'per_person') {
        agentComm = d.agentCommissionAmount * tp;
      } else {
        // percent — calculated on subtotal before commission
        const subtotal = accommodation + meals + transport + activities + guide;
        agentComm = subtotal * (d.agentCommissionAmount / 100);
      }
    }

    const grand = accommodation + meals + transport + activities + guide + agentComm;
    const costPerPerson = paying > 0 ? grand / paying : 0;
    return { accommodation, meals, flights, transport, activities, guide, agentComm, grand, totalParticipants: tp, payingParticipants: paying, costPerPerson, days, hotelDetails };
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
          <p><strong>Group:</strong> ${d.groupName || 'Untitled'}</p>
          <p><strong>Client:</strong> ${d.clientName || '—'}${d.clientEmail ? ' (' + d.clientEmail + ')' : ''}</p>
          <p><strong>Destination:</strong> ${dest}</p>
          <p><strong>Dates:</strong> ${fmtDate(d.startDate)} — ${fmtDate(d.endDate)} (${d.nights} nights)</p>
          ${isMulti ? '<p><strong>Hotels:</strong></p>' : ''}
          ${hotelSummaryHTML}
        </div>
        <div>
          <p><strong>Students:</strong> ${d.numStudents} | <strong>Siblings:</strong> ${d.numSiblings} | <strong>Adults:</strong> ${d.numAdults}</p>
          <p><strong>FOC Places:</strong> ${d.numFOC || 0}</p>
          <p><strong>Total Participants:</strong> ${c.totalParticipants} (${c.payingParticipants} paying)</p>
          <p><strong>Guides:</strong> ${d.noGuide ? 'None' : d.numGuides}</p>
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
        ${d.noGuide ? '' : `<div class="cost-line"><span>Guide Costs</span><span>${fmt(c.guide, d.currency)}</span></div>`}
        ${c.agentComm > 0 ? `<div class="cost-line"><span>Agent Commission${d.agentName ? ' (' + d.agentName + ')' : ''} ${d.agentCommissionType === 'per_person' ? fmt(d.agentCommissionAmount, d.currency) + '/person x ' + c.totalParticipants : d.agentCommissionAmount + '%'}</span><span>${fmt(c.agentComm, d.currency)}</span></div>` : ''}
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
      <h3 style="margin-top:1.5rem">Agent Commission</h3>
      <p style="font-size:0.85rem;color:var(--gray-400);margin-bottom:1rem">If an agent/referrer earns commission on this tour, enable it here.</p>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1rem;border:1.5px solid var(--gray-100)">
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-weight:600;font-size:0.92rem;margin-bottom:0.8rem">
          <input type="checkbox" id="q-agentCommission" ${d.agentCommission ? 'checked' : ''} onchange="Quote.toggleAgentCommission(this.checked)">
          Pay agent commission
        </label>
        <div id="agent-commission-fields" style="display:${d.agentCommission ? 'block' : 'none'}">
          <div class="form-row form-row-3">
            <div class="form-group"><label>Agent Name</label><input id="q-agentName" placeholder="e.g. John Smith" value="${d.agentName || ''}"></div>
            <div class="form-group">
              <label>Commission Type</label>
              <select id="q-agentCommType" onchange="Quote.updateCommissionLabel()">
                <option value="per_person" ${d.agentCommissionType === 'per_person' ? 'selected' : ''}>Set Amount per Person</option>
                <option value="percent" ${d.agentCommissionType === 'percent' ? 'selected' : ''}>Percentage of Costs</option>
              </select>
            </div>
            <div class="form-group"><label id="agent-comm-label">${d.agentCommissionType === 'percent' ? 'Commission %' : 'Amount per Person (' + d.currency + ')'}</label><input id="q-agentCommAmt" type="number" step="0.01" value="${d.agentCommissionAmount || ''}" placeholder="0.00"></div>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:1.2rem">
        <button class="btn btn-primary" style="font-size:1rem;padding:0.7rem 2rem" onclick="Quote.calculateProfit()">Calculate Profit</button>
      </div>
      <div id="profit-result"></div>
      <div class="form-row form-row-2" style="margin-top:1.5rem">
        <div class="form-group"><label>Follow-up Date</label><input id="q-followUp" type="date" value="${d.followUpDate}"></div>
      </div>`;
  },

  calculateProfit() {
    const ps = Number(document.getElementById('q-priceStudent').value) || 0;
    const pb = Number(document.getElementById('q-priceSibling').value) || 0;
    const pa = Number(document.getElementById('q-priceAdult').value) || 0;
    const d = this.data;

    // Sync commission fields before calculating
    d.agentCommission = document.getElementById('q-agentCommission') ? document.getElementById('q-agentCommission').checked : d.agentCommission;
    d.agentName = this.val('q-agentName') || '';
    d.agentCommissionType = this.val('q-agentCommType') || 'per_person';
    d.agentCommissionAmount = Number(this.val('q-agentCommAmt')) || 0;

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
          <div style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;font-weight:600">${c.agentComm > 0 ? 'Net Profit (after commission)' : 'Profit'}</div>
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
                  <span>Total Costs (excl. commission)</span><strong style="color:var(--red)">${fmt(c.grand - c.agentComm, d.currency)}</strong>
                </div>
                ${c.agentComm > 0 ? `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>Agent Commission${d.agentName ? ' (' + d.agentName + ')' : ''}</span><strong style="color:var(--amber)">${fmt(c.agentComm, d.currency)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--gray-100)">
                  <span>Total Costs (incl. commission)</span><strong style="color:var(--red)">${fmt(c.grand, d.currency)}</strong>
                </div>` : ''}
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

  toggleNoGuide(checked) {
    this.data.noGuide = checked;
    const fields = document.getElementById('guide-fields');
    if (fields) fields.style.display = checked ? 'none' : 'block';
    if (checked) {
      this.data.numGuides = 0;
      this.data.guideDailyRate = 0;
      this.data.guideFlights = 0;
      this.data.guideAccommodation = 0;
      this.data.guideMeals = 0;
    }
    this.renderStep();
  },

  toggleAgentCommission(checked) {
    this.data.agentCommission = checked;
    const fields = document.getElementById('agent-commission-fields');
    if (fields) fields.style.display = checked ? 'block' : 'none';
  },

  updateCommissionLabel() {
    const type = (document.getElementById('q-agentCommType') || {}).value || 'per_person';
    const label = document.getElementById('agent-comm-label');
    if (label) label.textContent = type === 'percent' ? 'Commission %' : 'Amount per Person (' + this.data.currency + ')';
  },

  onClientSelect() {
    const sel = document.getElementById('q-clientSelect');
    const val = sel.value;
    if (val === '__new__') {
      document.getElementById('q-new-client-panel').style.display = 'block';
      sel.value = '';
      return;
    }
    const id = Number(val);
    if (!id) {
      document.getElementById('q-clientId').value = '';
      document.getElementById('q-clientName').value = '';
      document.getElementById('q-clientEmail').value = '';
      document.getElementById('q-clientPhone').value = '';
      return;
    }
    const c = DB.getClients().find(x => x.id === id);
    if (!c) return;
    document.getElementById('q-clientId').value = c.id;
    document.getElementById('q-clientName').value = c.name || '';
    document.getElementById('q-clientEmail').value = c.email || '';
    document.getElementById('q-clientPhone').value = c.phone || '';
  },

  saveNewClient() {
    const name = document.getElementById('q-new-cli-name').value.trim();
    const email = document.getElementById('q-new-cli-email').value.trim();
    const phone = document.getElementById('q-new-cli-phone').value.trim();
    const type = document.getElementById('q-new-cli-type').value;
    if (!name) { alert('Please enter a client name.'); return; }
    const newClient = DB.saveClient({
      name, contactPerson: '', email, phone, type,
      city: '', country: '', notes: 'Added from quote wizard'
    });
    // Set on hidden fields
    document.getElementById('q-clientId').value = newClient.id;
    document.getElementById('q-clientName').value = name;
    document.getElementById('q-clientEmail').value = email;
    document.getElementById('q-clientPhone').value = phone;
    // Refresh the dropdown and select the new client
    const sel = document.getElementById('q-clientSelect');
    const opt = document.createElement('option');
    opt.value = newClient.id;
    opt.textContent = name;
    opt.selected = true;
    sel.insertBefore(opt, sel.querySelector('option[value="__new__"]'));
    // Hide panel
    document.getElementById('q-new-client-panel').style.display = 'none';
  },

  fillClientFromDB() {
    this.onClientSelect();
  },

  /* --- Itinerary helpers --- */
  itineraryDayHTML(item, idx) {
    return `<div class="card itin-day" style="margin-bottom:0.8rem;border-left:4px solid var(--amber);position:relative">
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:0.5rem">
        <div style="background:var(--amber);color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0">
          ${item.day}
        </div>
        <input class="itin-title" value="${(item.title || '').replace(/"/g, '&quot;')}" placeholder="e.g. Arrival & City Tour" style="flex:1;padding:0.5rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:var(--font-body);font-size:0.88rem;font-weight:600">
        <button class="btn btn-sm btn-danger" onclick="Quote.removeItineraryDay(${idx})" style="flex-shrink:0">X</button>
      </div>
      <textarea class="itin-desc" rows="2" placeholder="Describe the day's activities..." style="width:100%;padding:0.5rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:var(--font-body);font-size:0.85rem;resize:vertical">${item.description || ''}</textarea>
    </div>`;
  },

  collectItinerary() {
    const cards = document.querySelectorAll('.itin-day');
    this.data.itinerary = [];
    cards.forEach((card, idx) => {
      this.data.itinerary.push({
        day: idx + 1,
        title: card.querySelector('.itin-title').value,
        description: card.querySelector('.itin-desc').value
      });
    });
  },

  addItineraryDay() {
    this.collectItinerary();
    const nextDay = this.data.itinerary.length + 1;
    this.data.itinerary.push({ day: nextDay, title: '', description: '' });
    this.renderStep();
  },

  removeItineraryDay(idx) {
    this.collectItinerary();
    this.data.itinerary.splice(idx, 1);
    this.data.itinerary.forEach((item, i) => { item.day = i + 1; });
    this.renderStep();
  },

  autoPopulateItinerary() {
    this.collectItinerary();
    const days = this.data.nights + 1;
    const existing = this.data.itinerary;
    const result = [];
    for (let i = 0; i < days; i++) {
      if (existing[i]) {
        existing[i].day = i + 1;
        result.push(existing[i]);
      } else {
        let title = '';
        if (i === 0) title = 'Arrival Day';
        else if (i === days - 1) title = 'Departure Day';
        result.push({ day: i + 1, title, description: '' });
      }
    }
    this.data.itinerary = result;
    this.renderStep();
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
      itinerary: d.itinerary && d.itinerary.length ? JSON.parse(JSON.stringify(d.itinerary)) : [],
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

  checkFlightPrices(engine) {
    const d = this.data;
    const dest = d.destinations && d.destinations[0] ? this.getDestLabel(d.destinations[0]) : '';
    const tp = d.numStudents + d.numSiblings + d.numAdults + (d.numFOC || 0);
    const startDate = d.startDate || '';
    const endDate = d.endDate || '';

    if (engine === 'skyscanner') {
      // Skyscanner URL format
      const url = 'https://www.skyscanner.es/transport/flights/?adults=' + tp + (startDate ? '&outboundDate=' + startDate : '') + (endDate ? '&inboundDate=' + endDate : '');
      window.open(url, '_blank');
    } else {
      // Google Flights
      const url = 'https://www.google.com/travel/flights?q=flights+to+' + encodeURIComponent(dest) + (startDate ? '+' + startDate : '') + '&passengers=' + tp;
      window.open(url, '_blank');
    }
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
  },

  renderSmartSuggestions() {
    const container = document.getElementById('quote-suggestions');
    if (!container) return;

    const d = this.data;
    const dests = d.destinations || [];
    const destLabel = dests.length ? this.getDestLabel(dests[0]) : '';
    if (!destLabel) { container.innerHTML = ''; return; }

    const quotes = DB.getQuotes();
    const tours = DB.getTours();
    const allPast = [...quotes, ...tours].filter(q => {
      const dest = q.destination || '';
      return dest.toLowerCase().includes(destLabel.toLowerCase());
    });

    if (!allPast.length) { container.innerHTML = ''; return; }

    // Calculate averages
    const prices = allPast.filter(q => q.priceStudent > 0).map(q => q.priceStudent);
    const avgPrice = prices.length ? Math.round(prices.reduce((s,p) => s + p, 0) / prices.length) : 0;
    const hotels = [...new Set(allPast.filter(q => q.hotels && q.hotels.length).flatMap(q => q.hotels.map(h => h.hotelName)).filter(Boolean))];
    const activities = [...new Set(allPast.filter(q => q.activities && q.activities.length).flatMap(q => q.activities.map(a => a.name)).filter(Boolean))];

    let html = '<div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:1rem;border-left:4px solid var(--amber)">';
    html += '<h4 style="font-size:0.88rem;color:var(--amber);margin-bottom:0.5rem">Smart Suggestions for ' + destLabel + '</h4>';
    html += '<div style="font-size:0.85rem;color:var(--gray-500)">';
    html += '<p>Based on ' + allPast.length + ' previous quote' + (allPast.length !== 1 ? 's' : '') + ' to ' + destLabel + ':</p>';
    if (avgPrice) html += '<p style="margin-top:0.3rem">Average student price: <strong>' + fmt(avgPrice, d.currency || 'EUR') + '</strong></p>';
    if (hotels.length) html += '<p style="margin-top:0.3rem">Hotels used: ' + hotels.slice(0,5).join(', ') + '</p>';
    if (activities.length) html += '<p style="margin-top:0.3rem">Popular activities: ' + activities.slice(0,5).join(', ') + '</p>';
    html += '</div>';

    // Template dropdown
    if (allPast.length) {
      html += '<div style="margin-top:0.5rem"><label style="font-size:0.82rem;font-weight:600">Use Previous Quote as Template:</label>';
      html += '<select id="tmpl-quote-sel" style="margin-left:0.5rem;padding:0.3rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)">';
      html += '<option value="">\u2014 Select \u2014</option>';
      allPast.slice(0,10).forEach(q => {
        html += '<option value="' + q.id + '">' + (q.tourName || 'Quote') + ' \u2014 ' + (q.clientName || '') + '</option>';
      });
      html += '</select>';
      html += ' <button class="btn btn-sm btn-outline" style="font-size:0.78rem" onclick="Quote.loadFromTemplate()">Apply</button>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  },

  loadFromTemplate() {
    const sel = document.getElementById('tmpl-quote-sel');
    if (!sel || !sel.value) return;
    const id = Number(sel.value);
    const source = DB.getQuotes().find(q => q.id === id) || DB.getTours().find(t => t.id === id);
    if (!source) return;
    if (!confirm('Load data from "' + (source.tourName || 'this quote') + '"? This will replace current quote data.')) return;
    this.loadQuote(source);
  }
};
