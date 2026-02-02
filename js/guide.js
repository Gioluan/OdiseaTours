/* === GUIDE PORTAL — All logic for guide.html === */
const Guide = {
  tourId: null,
  tourData: null,
  currentSection: 'today',
  _messageListener: null,
  _passengers: [],
  _roomPlan: [],
  _headcount: 0,
  _providers: [],

  // ── Helpers ──
  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  _fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  _fmtTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
           new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },
  _fmtCurrency(amount, currency) {
    currency = currency || 'EUR';
    const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return sym + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // ── Init ──
  async init() {
    try {
      if (typeof firebase !== 'undefined' && typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        DB.firestore = firebase.firestore();
        DB.storage = firebase.storage();
        DB._firebaseReady = true;
        DB.firestore.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Firebase init failed:', e.message);
    }

    // Check for saved session
    const savedCode = sessionStorage.getItem('guide_code');
    const savedTourId = sessionStorage.getItem('guide_tourId');

    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');

    if (savedCode && savedTourId) {
      await this.loadTour(savedCode, savedTourId);
    } else if (urlCode) {
      document.getElementById('guide-code-input').value = urlCode;
      this.handleLogin();
    }
  },

  // ── Login ──
  async handleLogin(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('guide-code-input');
    const errorEl = document.getElementById('guide-login-error');
    const code = (input.value || '').trim().toUpperCase();

    if (!code) { errorEl.textContent = 'Please enter your guide code.'; return; }
    if (!DB._firebaseReady) { errorEl.textContent = 'Service unavailable. Please try again.'; return; }

    errorEl.textContent = '';
    input.disabled = true;

    try {
      const tour = await DB.getTourByGuideAccessCode(code);
      if (!tour) {
        errorEl.textContent = 'Invalid guide code. Please check and try again.';
        input.disabled = false;
        return;
      }
      await this.loadTour(code, tour.id);
    } catch (e) {
      errorEl.textContent = 'Connection error. Please try again.';
      input.disabled = false;
    }
  },

  async loadTour(code, tourId) {
    this.tourId = String(tourId);
    sessionStorage.setItem('guide_code', code);
    sessionStorage.setItem('guide_tourId', this.tourId);

    try {
      const doc = await DB.firestore.collection('tours').doc(this.tourId).get();
      if (doc.exists) {
        this.tourData = { id: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.warn('loadTour failed:', e.message);
    }

    if (!this.tourData) {
      this.logout();
      return;
    }

    // Load passengers
    try {
      this._passengers = await DB.getTourPassengers(this.tourId);
    } catch (e) { this._passengers = []; }

    // Load providers from Firestore
    try {
      const snap = await DB.firestore.collection('providers').get();
      this._providers = [];
      snap.forEach(doc => this._providers.push({ id: doc.id, ...doc.data() }));
    } catch (e) { this._providers = []; }

    this._roomPlan = this.tourData.roomPlan || [];

    // Show main UI
    document.getElementById('guide-login').style.display = 'none';
    document.getElementById('guide-main').style.display = 'block';
    document.getElementById('guide-header-tour-name').textContent = this.tourData.tourName || 'Tour';

    this.showSection('today');
  },

  logout() {
    if (this._messageListener) { this._messageListener(); this._messageListener = null; }
    sessionStorage.removeItem('guide_code');
    sessionStorage.removeItem('guide_tourId');
    this.tourId = null;
    this.tourData = null;
    document.getElementById('guide-main').style.display = 'none';
    document.getElementById('guide-login').style.display = 'flex';
    const input = document.getElementById('guide-code-input');
    if (input) { input.value = ''; input.disabled = false; }
  },

  // ── Navigation ──
  showSection(section) {
    // Unsubscribe message listener when leaving chat
    if (this.currentSection === 'chat' && section !== 'chat' && this._messageListener) {
      this._messageListener();
      this._messageListener = null;
    }

    this.currentSection = section;

    // Toggle active section
    document.querySelectorAll('.guide-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('section-' + section);
    if (el) el.classList.add('active');

    // Toggle active tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector(`.tab-btn[data-section="${section}"]`);
    if (tab) tab.classList.add('active');

    // Render section
    switch (section) {
      case 'today': this.renderToday(); break;
      case 'itinerary': this.renderItinerary(); break;
      case 'roomplan': this.renderRoomPlan(); break;
      case 'providers': this.renderProviders(); break;
      case 'flights': this.renderFlights(); break;
      case 'leader': this.renderLeader(); break;
      case 'expenses': this.renderExpenses(); break;
      case 'medical': this.renderMedical(); break;
      case 'headcount': this.renderHeadcount(); break;
      case 'notes': this.renderNotes(); break;
      case 'chat': this.renderChat(); break;
    }
  },

  toggleMoreMenu() {
    const menu = document.getElementById('more-menu');
    const overlay = document.getElementById('more-menu-overlay');
    const show = menu.style.display === 'none';
    menu.style.display = show ? 'block' : 'none';
    overlay.style.display = show ? 'block' : 'none';
  },

  closeMoreMenu() {
    document.getElementById('more-menu').style.display = 'none';
    document.getElementById('more-menu-overlay').style.display = 'none';
  },

  // ══════════════════════════════════════════════════════════
  //  1. TODAY DASHBOARD
  // ══════════════════════════════════════════════════════════
  renderToday() {
    const t = this.tourData;
    const container = document.getElementById('section-today');
    if (!t) { container.innerHTML = '<div class="empty-state">No tour data available.</div>'; return; }

    const now = new Date();
    const start = t.startDate ? new Date(t.startDate) : null;
    const end = t.endDate ? new Date(t.endDate) : null;
    let dayNumber = 0;
    let todayTitle = '';
    let todayItems = [];
    let currentHotel = '—';

    if (start) {
      const diffMs = now.setHours(0,0,0,0) - new Date(start).setHours(0,0,0,0);
      dayNumber = Math.floor(diffMs / 86400000) + 1;
      if (dayNumber < 1) dayNumber = 0;
      if (end && now > end) dayNumber = -1; // tour ended
    }

    // Find today's itinerary
    if (t.itinerary && t.itinerary.length && dayNumber > 0) {
      const todayItin = t.itinerary.find(d => Number(d.day) === dayNumber);
      if (todayItin) {
        todayTitle = todayItin.title || '';
        todayItems = todayItin.items || [];
      }
    }

    // Find current hotel
    if (t.hotels && t.hotels.length) {
      for (const h of t.hotels) {
        const hStart = h.checkIn ? new Date(h.checkIn) : null;
        const hEnd = h.checkOut ? new Date(h.checkOut) : null;
        if (hStart && hEnd && new Date() >= hStart && new Date() <= hEnd) {
          currentHotel = h.name || h.hotel || '—';
          break;
        }
      }
      if (currentHotel === '—' && t.hotels[0]) {
        currentHotel = t.hotels[0].name || t.hotels[0].hotel || '—';
      }
    }

    const groupSize = (Number(t.numStudents)||0) + (Number(t.numSiblings)||0) + (Number(t.numAdults)||0) + (Number(t.numFOC)||0);
    const dayLabel = dayNumber > 0 ? `Day ${dayNumber}` : dayNumber === 0 ? 'Not Started' : 'Tour Ended';

    container.innerHTML = `
      <div class="today-hero">
        <span class="today-day-badge">${dayLabel}</span>
        <h2>${this._escapeHtml(t.tourName || 'Tour')}</h2>
        <p>${this._escapeHtml(t.destination || '')} &bull; ${this._fmtDate(t.startDate)} — ${this._fmtDate(t.endDate)}</p>
        ${todayTitle ? `<p style="margin-top:0.4rem;color:rgba(255,255,255,0.9);font-weight:600">${this._escapeHtml(todayTitle)}</p>` : ''}
      </div>

      <div class="quick-actions">
        <button class="quick-action-btn" onclick="Guide.showSection('headcount')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Headcount
        </button>
        <button class="quick-action-btn" onclick="Guide.showSection('notes')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Log Incident
        </button>
        <button class="quick-action-btn" onclick="Guide.showSection('chat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Chat
        </button>
      </div>

      <div class="g-card">
        <div class="g-card-header">
          <span class="g-card-title">Today's Schedule</span>
        </div>
        ${todayItems.length ? todayItems.map(item => `
          <div class="itin-item${item.highlight ? ' itin-highlight' : ''}">
            ${item.time ? `<span class="itin-time">${this._escapeHtml(item.time)}</span>` : ''}
            <span class="itin-desc">${this._escapeHtml(item.description || '')}</span>
          </div>
        `).join('') : '<div class="empty-state" style="padding:0.8rem">No schedule items for today.</div>'}
      </div>

      <div class="g-card">
        <div class="g-card-header">
          <span class="g-card-title">Tour Info</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.85rem">
          <div><span style="color:var(--gray-400)">Group Size:</span> <strong>${groupSize} pax</strong></div>
          <div><span style="color:var(--gray-400)">Hotel:</span> <strong>${this._escapeHtml(currentHotel)}</strong></div>
          <div><span style="color:var(--gray-400)">Duration:</span> <strong>${t.nights || 0} nights</strong></div>
          <div><span style="color:var(--gray-400)">Destination:</span> <strong>${this._escapeHtml(t.destination || '—')}</strong></div>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  2. ITINERARY
  // ══════════════════════════════════════════════════════════
  renderItinerary() {
    const t = this.tourData;
    const container = document.getElementById('section-itinerary');
    if (!t || !t.itinerary || !t.itinerary.length) {
      container.innerHTML = '<h2 class="section-title">Itinerary</h2><div class="empty-state">No itinerary available.</div>';
      return;
    }

    const now = new Date();
    const start = t.startDate ? new Date(t.startDate) : null;
    let currentDay = 0;
    if (start) {
      const diffMs = new Date(now.toDateString()) - new Date(start.toDateString());
      currentDay = Math.floor(diffMs / 86400000) + 1;
    }

    container.innerHTML = `
      <h2 class="section-title">Itinerary</h2>
      ${t.itinerary.map(day => {
        const isToday = Number(day.day) === currentDay;
        return `
          <div class="itin-day${isToday ? ' is-today' : ''}">
            <div class="itin-day-header">
              <h4>Day ${day.day}${day.title ? ' — ' + this._escapeHtml(day.title) : ''}</h4>
              ${day.date ? `<span>${this._fmtDate(day.date)}</span>` : ''}
            </div>
            ${(day.items || []).map(item => `
              <div class="itin-item${item.highlight ? ' itin-highlight' : ''}">
                ${item.time ? `<span class="itin-time">${this._escapeHtml(item.time)}</span>` : ''}
                <span class="itin-desc">${this._escapeHtml(item.description || '')}</span>
              </div>
            `).join('')}
            ${(!day.items || !day.items.length) ? '<div class="itin-item" style="color:var(--gray-400)">No items scheduled</div>' : ''}
          </div>
        `;
      }).join('')}
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  3. ROOM PLAN
  // ══════════════════════════════════════════════════════════
  renderRoomPlan() {
    const container = document.getElementById('section-roomplan');
    const rooms = this._roomPlan;
    const passengers = this._passengers;

    // Get assigned passenger IDs
    const assignedIds = new Set();
    rooms.forEach(r => (r.passengers || []).forEach(id => assignedIds.add(id)));

    const unassigned = passengers.filter(p => !assignedIds.has(p.id));

    container.innerHTML = `
      <h2 class="section-title">Room Plan</h2>
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
        <button class="btn-primary" onclick="Guide.addRoom()">+ Add Room</button>
        <button class="btn-outline" onclick="Guide.autoAssignRooms()">Auto-Assign</button>
      </div>

      ${rooms.map((room, idx) => `
        <div class="room-card">
          <div class="room-header">
            <span contenteditable="true" onblur="Guide.updateRoomName(${idx},this.textContent)">${this._escapeHtml(room.name || 'Room ' + (idx + 1))}</span>
            <button onclick="Guide.removeRoom(${idx})" title="Remove room">&times;</button>
          </div>
          <div class="room-guests">
            ${(room.passengers || []).map(pId => {
              const p = passengers.find(x => x.id === pId);
              const name = p ? ((p.firstName || '') + ' ' + (p.lastName || '')).trim() : 'Unknown';
              return `<div class="room-guest">
                <span>${this._escapeHtml(name)}</span>
                <button class="room-guest-remove" onclick="Guide.removeFromRoom(${idx},'${pId}')">Remove</button>
              </div>`;
            }).join('')}
            ${(!room.passengers || !room.passengers.length) ? '<div style="color:var(--gray-400);font-size:0.82rem;padding:0.3rem 0">Empty room</div>' : ''}
          </div>
          ${unassigned.length ? `
            <div class="room-assign">
              <select onchange="Guide.assignToRoom(${idx},this.value);this.value=''">
                <option value="">+ Assign passenger...</option>
                ${unassigned.map(p => `<option value="${p.id}">${this._escapeHtml(((p.firstName||'')+ ' '+(p.lastName||'')).trim())}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      `).join('')}

      ${unassigned.length ? `
        <div class="unassigned-section">
          <h4>Unassigned (${unassigned.length})</h4>
          <div class="unassigned-list">
            ${unassigned.map(p => `<span class="unassigned-chip">${this._escapeHtml(((p.firstName||'')+ ' '+(p.lastName||'')).trim())}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  addRoom() {
    this._roomPlan.push({ name: 'Room ' + (this._roomPlan.length + 1), passengers: [] });
    this._saveRoomPlan();
    this.renderRoomPlan();
  },

  removeRoom(idx) {
    this._roomPlan.splice(idx, 1);
    this._saveRoomPlan();
    this.renderRoomPlan();
  },

  updateRoomName(idx, name) {
    if (this._roomPlan[idx]) {
      this._roomPlan[idx].name = name.trim();
      this._saveRoomPlan();
    }
  },

  assignToRoom(roomIdx, passengerId) {
    if (!passengerId || !this._roomPlan[roomIdx]) return;
    if (!this._roomPlan[roomIdx].passengers) this._roomPlan[roomIdx].passengers = [];
    this._roomPlan[roomIdx].passengers.push(passengerId);
    this._saveRoomPlan();
    this.renderRoomPlan();
  },

  removeFromRoom(roomIdx, passengerId) {
    if (!this._roomPlan[roomIdx]) return;
    this._roomPlan[roomIdx].passengers = (this._roomPlan[roomIdx].passengers || []).filter(id => id !== passengerId);
    this._saveRoomPlan();
    this.renderRoomPlan();
  },

  autoAssignRooms() {
    const passengers = this._passengers;
    if (!passengers.length) return;

    // Group by family
    const families = {};
    const solos = [];
    passengers.forEach(p => {
      if (p.family) {
        if (!families[p.family]) families[p.family] = [];
        families[p.family].push(p.id);
      } else {
        solos.push(p.id);
      }
    });

    const rooms = [];
    // Family rooms
    Object.entries(families).forEach(([name, ids]) => {
      rooms.push({ name: name, passengers: ids });
    });
    // Solo rooms (pairs)
    for (let i = 0; i < solos.length; i += 2) {
      const roomPax = [solos[i]];
      if (solos[i + 1]) roomPax.push(solos[i + 1]);
      rooms.push({ name: 'Room ' + (rooms.length + 1), passengers: roomPax });
    }

    this._roomPlan = rooms;
    this._saveRoomPlan();
    this.renderRoomPlan();
  },

  async _saveRoomPlan() {
    if (!this.tourId || !DB._firebaseReady) return;
    try {
      await DB.firestore.collection('tours').doc(this.tourId).update({ roomPlan: this._roomPlan });
      this.tourData.roomPlan = this._roomPlan;
    } catch (e) {
      console.warn('Save room plan failed:', e.message);
    }
  },

  // ══════════════════════════════════════════════════════════
  //  4. PROVIDER CONTACTS
  // ══════════════════════════════════════════════════════════
  renderProviders() {
    const t = this.tourData;
    const container = document.getElementById('section-providers');
    const contacts = [];

    // Hotels from tour data
    if (t.hotels && t.hotels.length) {
      t.hotels.forEach(h => {
        const name = h.name || h.hotel || '';
        // Try to enrich from providers collection
        const prov = this._providers.find(p => p.companyName && name && p.companyName.toLowerCase().includes(name.toLowerCase()));
        contacts.push({
          name: name,
          type: 'Hotel',
          phone: (prov && prov.phone) || h.phone || '',
          email: (prov && prov.email) || h.email || '',
          detail: h.checkIn ? `${this._fmtDate(h.checkIn)} — ${this._fmtDate(h.checkOut)}` : ''
        });
      });
    }

    // Providers from tour's providerExpenses
    if (t.providerExpenses && t.providerExpenses.length) {
      t.providerExpenses.forEach(pe => {
        const name = pe.provider || pe.companyName || '';
        if (contacts.find(c => c.name.toLowerCase() === name.toLowerCase())) return;
        const prov = this._providers.find(p => p.companyName && name && p.companyName.toLowerCase().includes(name.toLowerCase()));
        contacts.push({
          name: name,
          type: pe.category || (prov && prov.category) || 'Provider',
          phone: (prov && prov.phone) || '',
          email: (prov && prov.email) || '',
          detail: pe.service || ''
        });
      });
    }

    container.innerHTML = `
      <h2 class="section-title">Provider Contacts</h2>
      ${contacts.length ? contacts.map(c => `
        <div class="provider-card">
          <div class="provider-name">${this._escapeHtml(c.name)}</div>
          <div class="provider-type">${this._escapeHtml(c.type)}${c.detail ? ' — ' + this._escapeHtml(c.detail) : ''}</div>
          <div class="provider-actions">
            ${c.phone ? `<a href="tel:${this._escapeHtml(c.phone)}" class="call-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              ${this._escapeHtml(c.phone)}
            </a>` : ''}
            ${c.email ? `<a href="mailto:${this._escapeHtml(c.email)}" class="email-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </a>` : ''}
          </div>
        </div>
      `).join('') : '<div class="empty-state">No provider contacts available.</div>'}
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  5. FLIGHT DETAILS
  // ══════════════════════════════════════════════════════════
  renderFlights() {
    const t = this.tourData;
    const container = document.getElementById('section-flights');
    const flights = t.flights || [];
    const groupSize = (Number(t.numStudents)||0) + (Number(t.numSiblings)||0) + (Number(t.numAdults)||0) + (Number(t.numFOC)||0);

    container.innerHTML = `
      <h2 class="section-title">Flight Details</h2>
      <div class="g-card" style="margin-bottom:1rem">
        <div class="g-card-title" style="margin-bottom:0.3rem">Group Size</div>
        <div style="font-size:1.3rem;font-weight:700;color:var(--navy)">${groupSize} passengers</div>
      </div>
      ${flights.length ? flights.map(f => `
        <div class="flight-card">
          <div class="flight-route">
            <span class="flight-city">${this._escapeHtml(f.from || f.origin || '—')}</span>
            <span class="flight-arrow">→</span>
            <span class="flight-city">${this._escapeHtml(f.to || f.destination || '—')}</span>
          </div>
          ${f.airline ? `<div class="flight-detail"><span>Airline</span><strong>${this._escapeHtml(f.airline)}</strong></div>` : ''}
          ${f.flightNumber ? `<div class="flight-detail"><span>Flight</span><strong>${this._escapeHtml(f.flightNumber)}</strong></div>` : ''}
          ${f.date ? `<div class="flight-detail"><span>Date</span><strong>${this._fmtDate(f.date)}</strong></div>` : ''}
          ${f.departure ? `<div class="flight-detail"><span>Departure</span><strong>${this._escapeHtml(f.departure)}</strong></div>` : ''}
          ${f.arrival ? `<div class="flight-detail"><span>Arrival</span><strong>${this._escapeHtml(f.arrival)}</strong></div>` : ''}
          ${f.terminal ? `<div class="flight-detail"><span>Terminal</span><strong>${this._escapeHtml(f.terminal)}</strong></div>` : ''}
          ${f.booking || f.reference ? `<div class="flight-detail"><span>Booking Ref</span><strong>${this._escapeHtml(f.booking || f.reference)}</strong></div>` : ''}
        </div>
      `).join('') : '<div class="empty-state">No flight information available.</div>'}
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  6. GROUP LEADER CONTACT
  // ══════════════════════════════════════════════════════════
  renderLeader() {
    const t = this.tourData;
    const container = document.getElementById('section-leader');

    container.innerHTML = `
      <h2 class="section-title">Group Leader</h2>
      <div class="contact-card">
        <h3>${this._escapeHtml(t.clientName || 'Not specified')}</h3>
        ${t.clientEmail ? `<p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px;margin-right:0.3rem"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <a href="mailto:${this._escapeHtml(t.clientEmail)}">${this._escapeHtml(t.clientEmail)}</a>
        </p>` : ''}
        ${t.clientPhone ? `<p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px;margin-right:0.3rem"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <a href="tel:${this._escapeHtml(t.clientPhone)}">${this._escapeHtml(t.clientPhone)}</a>
        </p>` : ''}
        ${t.school || t.organization ? `<p style="margin-top:0.5rem;color:var(--gray-500);font-size:0.82rem">${this._escapeHtml(t.school || t.organization)}</p>` : ''}
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  7. EXPENSE TRACKER
  // ══════════════════════════════════════════════════════════
  async renderExpenses() {
    const container = document.getElementById('section-expenses');
    container.innerHTML = '<h2 class="section-title">Expenses</h2><div style="text-align:center;padding:1rem"><div class="spinner"></div></div>';

    const expenses = await DB.getGuideExpenses(this.tourId);

    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const currency = (expenses[0] && expenses[0].currency) || 'EUR';

    container.innerHTML = `
      <h2 class="section-title">Expenses</h2>

      <div class="expense-form" id="expense-form">
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="exp-category">
              <option value="Transport">Transport</option>
              <option value="Meals">Meals</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Activities">Activities</option>
              <option value="Tips">Tips</option>
              <option value="Emergency">Emergency</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Amount</label>
            <div style="display:flex;gap:0.3rem">
              <input type="number" id="exp-amount" placeholder="0.00" step="0.01" style="flex:1">
              <select id="exp-currency" style="width:70px">
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>Description</label>
            <input type="text" id="exp-desc" placeholder="What was this expense for?">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>Receipt Photo</label>
            <input type="file" id="exp-receipt" accept="image/*" capture="environment" style="font-size:0.82rem">
          </div>
        </div>
        <button class="btn-primary" onclick="Guide.saveExpense()" style="width:100%;margin-top:0.3rem">Add Expense</button>
      </div>

      <div class="expense-total">
        <span class="expense-total-label">Total Expenses</span>
        <span class="expense-total-amount">${this._fmtCurrency(total, currency)}</span>
      </div>

      <div id="expense-list">
        ${expenses.length ? expenses.map(e => `
          <div class="expense-item">
            <div class="expense-item-info">
              <div class="expense-item-cat">${this._escapeHtml(e.category || '')}</div>
              <div class="expense-item-desc">${this._escapeHtml(e.description || '')}</div>
              <div class="expense-item-date">${e.createdAt ? this._fmtTime(e.createdAt) : ''}</div>
            </div>
            <span class="expense-item-amount">${this._fmtCurrency(e.amount, e.currency)}</span>
            ${e.receiptPhoto ? `<img src="${e.receiptPhoto}" class="receipt-thumb" onclick="Guide.viewReceipt('${e.id}')" data-receipt-id="${e.id}">` : ''}
            <div class="expense-item-actions">
              <button onclick="Guide.deleteExpense('${e.id}')" title="Delete">&times;</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state">No expenses recorded yet.</div>'}
      </div>
    `;

    // Store expense data for receipt viewing
    this._expenseData = expenses;
  },

  async saveExpense() {
    const category = document.getElementById('exp-category').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const currency = document.getElementById('exp-currency').value;
    const description = document.getElementById('exp-desc').value.trim();
    const fileInput = document.getElementById('exp-receipt');

    if (!amount || amount <= 0) { alert('Please enter an amount.'); return; }

    let receiptPhoto = '';
    if (fileInput.files && fileInput.files[0]) {
      receiptPhoto = await this._compressImage(fileInput.files[0]);
    }

    const expense = { category, amount, currency, description, receiptPhoto };
    await DB.saveGuideExpense(this.tourId, expense);
    this.renderExpenses();
  },

  async deleteExpense(expenseId) {
    if (!confirm('Delete this expense?')) return;
    await DB.deleteGuideExpense(this.tourId, expenseId);
    this.renderExpenses();
  },

  viewReceipt(expenseId) {
    const expense = (this._expenseData || []).find(e => e.id === expenseId);
    if (!expense || !expense.receiptPhoto) return;
    const overlay = document.createElement('div');
    overlay.className = 'receipt-modal-overlay';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `<img src="${expense.receiptPhoto}" alt="Receipt">`;
    document.body.appendChild(overlay);
  },

  async _compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // ══════════════════════════════════════════════════════════
  //  8. MEDICAL & DIETARY SUMMARY
  // ══════════════════════════════════════════════════════════
  renderMedical() {
    const container = document.getElementById('section-medical');
    const passengers = this._passengers;

    const dietary = passengers.filter(p => p.dietary && p.dietary.trim());
    const medical = passengers.filter(p => p.medical && p.medical.trim());
    const emergencies = passengers.filter(p => p.emergencyContact && p.emergencyContact.trim());

    // Group dietary by type
    const dietGroups = {};
    dietary.forEach(p => {
      const key = (p.dietary || 'Other').trim();
      if (!dietGroups[key]) dietGroups[key] = [];
      dietGroups[key].push(p);
    });

    container.innerHTML = `
      <h2 class="section-title">Medical & Dietary</h2>

      <div class="medical-group">
        <h4>Dietary Requirements (${dietary.length})</h4>
        ${Object.keys(dietGroups).length ? Object.entries(dietGroups).map(([type, paxList]) => `
          ${paxList.map(p => `
            <div class="medical-item">
              <strong>${this._escapeHtml(((p.firstName||'')+ ' '+(p.lastName||'')).trim())}</strong>
              <span class="dietary-tag">${this._escapeHtml(type)}</span>
            </div>
          `).join('')}
        `).join('') : '<div class="empty-state" style="padding:0.5rem">No dietary requirements recorded.</div>'}
      </div>

      <div class="medical-group">
        <h4>Medical Conditions (${medical.length})</h4>
        ${medical.length ? medical.map(p => `
          <div class="medical-item medical-alert">
            <strong>${this._escapeHtml(((p.firstName||'')+ ' '+(p.lastName||'')).trim())}</strong>
            <div class="medical-detail">${this._escapeHtml(p.medical)}</div>
          </div>
        `).join('') : '<div class="empty-state" style="padding:0.5rem">No medical conditions recorded.</div>'}
      </div>

      <div class="medical-group">
        <h4>Emergency Contacts (${emergencies.length})</h4>
        ${emergencies.length ? emergencies.map(p => `
          <div class="medical-item">
            <strong>${this._escapeHtml(((p.firstName||'')+ ' '+(p.lastName||'')).trim())}</strong>
            <div class="medical-detail">${this._escapeHtml(p.emergencyContact)}</div>
          </div>
        `).join('') : '<div class="empty-state" style="padding:0.5rem">No emergency contacts recorded.</div>'}
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════
  //  9. HEADCOUNT TOOL
  // ══════════════════════════════════════════════════════════
  renderHeadcount() {
    const container = document.getElementById('section-headcount');
    const t = this.tourData;
    const expected = (Number(t.numStudents)||0) + (Number(t.numSiblings)||0) + (Number(t.numAdults)||0) + (Number(t.numFOC)||0);
    const current = this._headcount;

    let statusClass = 'mismatch';
    let statusText = `Missing ${expected - current}`;
    if (current === expected) { statusClass = 'match'; statusText = 'All present'; }
    else if (Math.abs(current - expected) <= 2) { statusClass = 'close'; statusText = current > expected ? `${current - expected} extra` : `${expected - current} missing`; }
    else if (current > expected) { statusText = `${current - expected} extra`; }

    container.innerHTML = `
      <h2 class="section-title">Headcount</h2>
      <div class="g-card">
        <div class="headcount-display">
          <div class="headcount-expected">Expected: <strong>${expected}</strong> passengers</div>
          <div class="headcount-counter">
            <button class="headcount-btn minus" onclick="Guide.adjustHeadcount(-1)">−</button>
            <div class="headcount-number ${statusClass}">${current}</div>
            <button class="headcount-btn plus" onclick="Guide.adjustHeadcount(1)">+</button>
          </div>
          <div class="headcount-status ${statusClass}">${statusText}</div>
          <br>
          <button class="headcount-reset" onclick="Guide.resetHeadcount()">Reset to 0</button>
        </div>
      </div>
    `;
  },

  adjustHeadcount(delta) {
    this._headcount = Math.max(0, this._headcount + delta);
    this.renderHeadcount();
  },

  resetHeadcount() {
    this._headcount = 0;
    this.renderHeadcount();
  },

  // ══════════════════════════════════════════════════════════
  //  10. INCIDENT/NOTES LOG
  // ══════════════════════════════════════════════════════════
  async renderNotes() {
    const container = document.getElementById('section-notes');
    container.innerHTML = '<h2 class="section-title">Incident Notes</h2><div style="text-align:center;padding:1rem"><div class="spinner"></div></div>';

    const notes = await DB.getGuideNotes(this.tourId);

    container.innerHTML = `
      <h2 class="section-title">Incident Notes</h2>

      <div class="note-form">
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="note-type">
              <option value="note">General Note</option>
              <option value="incident">Incident</option>
              <option value="delay">Delay</option>
              <option value="issue">Issue</option>
            </select>
          </div>
          <div class="form-group">
            <label>Severity</label>
            <select id="note-severity">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>Title</label>
            <input type="text" id="note-title" placeholder="Brief title">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>Description</label>
            <textarea id="note-description" rows="3" placeholder="Describe what happened..."></textarea>
          </div>
        </div>
        <button class="btn-primary" onclick="Guide.saveNote()" style="width:100%;margin-top:0.3rem">Add Note</button>
      </div>

      <div id="notes-list">
        ${notes.length ? notes.map(n => `
          <div class="note-item">
            <div class="note-item-header">
              <div>
                <span class="note-type-badge ${n.type || 'note'}">${this._escapeHtml(n.type || 'note')}</span>
                <span class="severity-dot ${n.severity || 'low'}"></span>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="note-item-time">${n.createdAt ? this._fmtTime(n.createdAt) : ''}</span>
                <button class="note-delete" onclick="Guide.deleteNote('${n.id}')">&times;</button>
              </div>
            </div>
            <div class="note-item-title">${this._escapeHtml(n.title || '')}</div>
            ${n.description ? `<div class="note-item-desc">${this._escapeHtml(n.description)}</div>` : ''}
          </div>
        `).join('') : '<div class="empty-state">No notes recorded yet.</div>'}
      </div>
    `;
  },

  async saveNote() {
    const type = document.getElementById('note-type').value;
    const severity = document.getElementById('note-severity').value;
    const title = document.getElementById('note-title').value.trim();
    const description = document.getElementById('note-description').value.trim();

    if (!title) { alert('Please enter a title.'); return; }

    const note = { type, severity, title, description };
    await DB.saveGuideNote(this.tourId, note);
    this.renderNotes();
  },

  async deleteNote(noteId) {
    if (!confirm('Delete this note?')) return;
    await DB.deleteGuideNote(this.tourId, noteId);
    this.renderNotes();
  },

  // ══════════════════════════════════════════════════════════
  //  11. CHAT WITH OFFICE
  // ══════════════════════════════════════════════════════════
  renderChat() {
    const container = document.getElementById('section-chat');
    container.innerHTML = `
      <h2 class="section-title">Chat with Office</h2>
      <div class="chat-container">
        <div class="chat-messages" id="guide-chat-messages">
          <div style="text-align:center;padding:1rem"><div class="spinner"></div></div>
        </div>
        <form class="chat-input-bar" onsubmit="Guide.sendMessage(event)">
          <input type="text" class="chat-input" id="guide-chat-input" placeholder="Type a message..." autocomplete="off">
          <button type="submit" class="chat-send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    `;

    // Set up real-time listener
    if (this._messageListener) { this._messageListener(); this._messageListener = null; }
    this._messageListener = DB.listenToTourMessages(this.tourId, (messages) => {
      this._renderMessages(messages);
    });
  },

  _renderMessages(messages) {
    const el = document.getElementById('guide-chat-messages');
    if (!el) return;

    if (!messages.length) {
      el.innerHTML = '<div class="empty-state">No messages yet. Start the conversation!</div>';
      return;
    }

    el.innerHTML = messages.map(m => {
      let bubbleClass = 'admin';
      let senderLabel = m.senderName || 'Office';
      if (m.sender === 'guide') { bubbleClass = 'guide'; senderLabel = 'You (Guide)'; }
      else if (m.sender === 'client') { bubbleClass = 'client'; senderLabel = m.senderName || 'Client'; }

      return `
        <div class="chat-bubble ${bubbleClass}">
          <div>${this._escapeHtml(m.text || '')}</div>
          <div class="chat-meta">${senderLabel} &bull; ${m.timestamp ? new Date(m.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</div>
        </div>
      `;
    }).join('');

    el.scrollTop = el.scrollHeight;
  },

  async sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('guide-chat-input');
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';

    await DB.sendTourMessage(this.tourId, {
      text: text,
      sender: 'guide',
      senderName: 'Tour Guide'
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => Guide.init());
