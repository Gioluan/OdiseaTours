/* === CLIENT PORTAL MODULE === */
const Portal = {
  tourId: null,
  tourData: null,
  currentSection: 'overview',
  _messageListener: null,

  async init() {
    // Initialize Firebase
    try {
      if (typeof firebase !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        DB.firestore = firebase.firestore();
        DB.storage = firebase.storage();
        DB._firebaseReady = true;
        DB.firestore.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Portal Firebase init failed:', e.message);
    }

    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // Check sessionStorage for existing session
    const savedCode = sessionStorage.getItem('portal_code');
    const savedTourId = sessionStorage.getItem('portal_tourId');

    if (savedCode && savedTourId) {
      await this.loadTour(savedCode, savedTourId);
    } else if (code) {
      document.getElementById('portal-code-input').value = code;
      await this.handleLogin();
    }
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    const code = document.getElementById('portal-code-input').value.trim().toUpperCase();
    const errorEl = document.getElementById('portal-login-error');
    errorEl.style.display = 'none';

    if (!code) {
      errorEl.textContent = 'Please enter an access code.';
      errorEl.style.display = 'block';
      return;
    }

    if (!DB._firebaseReady) {
      errorEl.textContent = 'Firebase not configured. Contact your tour operator.';
      errorEl.style.display = 'block';
      return;
    }

    // Query Firestore for tour by access code
    const tour = await DB.getTourByAccessCode(code);
    if (!tour) {
      errorEl.textContent = 'Invalid access code. Please check and try again.';
      errorEl.style.display = 'block';
      return;
    }

    await this.loadTour(code, tour.id);
  },

  async loadTour(code, tourId) {
    this.tourId = String(tourId);
    sessionStorage.setItem('portal_code', code);
    sessionStorage.setItem('portal_tourId', this.tourId);

    // Fetch tour document
    try {
      const doc = await DB.firestore.collection('tours').doc(this.tourId).get();
      if (!doc.exists) {
        this.logout();
        return;
      }
      this.tourData = { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn('Load tour failed:', e.message);
      this.logout();
      return;
    }

    // Switch from login to main portal
    document.getElementById('portal-login').style.display = 'none';
    document.getElementById('portal-main').style.display = 'block';

    // Update drawer header
    document.getElementById('drawer-tour-name').textContent = this.tourData.tourName || 'Tour';
    document.getElementById('drawer-tour-dest').textContent = this.tourData.destination || '';

    this.showSection('overview');
  },

  logout() {
    sessionStorage.removeItem('portal_code');
    sessionStorage.removeItem('portal_tourId');
    if (this._messageListener) this._messageListener();
    this.tourId = null;
    this.tourData = null;
    document.getElementById('portal-login').style.display = 'flex';
    document.getElementById('portal-main').style.display = 'none';
  },

  toggleDrawer() {
    document.getElementById('nav-drawer').classList.toggle('open');
    document.getElementById('nav-drawer-overlay').classList.toggle('open');
  },

  showSection(name) {
    this.currentSection = name;
    // Toggle active nav items
    document.querySelectorAll('.nav-drawer-links li').forEach(li => {
      li.classList.toggle('active', li.dataset.section === name);
    });
    // Toggle sections
    document.querySelectorAll('.portal-section').forEach(s => {
      s.classList.toggle('active', s.id === 'section-' + name);
    });
    // Close drawer
    document.getElementById('nav-drawer').classList.remove('open');
    document.getElementById('nav-drawer-overlay').classList.remove('open');

    // Render the section
    switch (name) {
      case 'overview': this.renderOverview(); break;
      case 'itinerary': this.renderItinerary(); break;
      case 'documents': this.renderDocuments(); break;
      case 'passengers': this.renderPassengers(); break;
      case 'roomplan': this.renderRoomPlan(); break;
      case 'messages': this.renderMessages(); break;
      case 'forms': this.renderForms(); break;
      case 'feedback': this.renderFeedback(); break;
      case 'payments': this.renderPaymentStatus(); break;
    }
  },

  renderOverview() {
    const t = this.tourData;
    if (!t) return;
    const container = document.getElementById('section-overview');

    // Calculate countdown
    const start = new Date(t.startDate);
    const now = new Date();
    const diff = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    let countdownText = '';
    if (diff > 0) countdownText = diff + ' day' + (diff !== 1 ? 's' : '') + ' to go';
    else if (diff === 0) countdownText = 'Departing today!';
    else countdownText = 'Tour in progress';

    const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0);

    container.innerHTML = `
      <div class="hero-card">
        <h1>${t.tourName || 'Your Tour'}</h1>
        <div class="hero-dest">${t.destination || ''}</div>
        <div class="countdown-badge">${countdownText}</div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="ic-label">Dates</div>
          <div class="ic-value">${Portal._fmtDate(t.startDate)} — ${Portal._fmtDate(t.endDate)}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">Duration</div>
          <div class="ic-value">${t.nights || 0} night${(t.nights||0)!==1?'s':''}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">Group</div>
          <div class="ic-value">${t.groupName || '—'}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">Group Size</div>
          <div class="ic-value">${groupSize} travelers</div>
        </div>
      </div>

      <div class="action-grid">
        <button class="action-btn" onclick="Portal.showSection('itinerary')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Itinerary</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('documents')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Documents</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('passengers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>Passengers</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('roomplan')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          <span>Room Plan</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('messages')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>Messages</span>
        </button>
      </div>

      ${(t.portalPaymentCard || t.portalPaymentWise) ? `
      <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-top:1rem;box-shadow:var(--shadow)">
        <h4 style="font-family:var(--font-display);color:var(--navy);margin-bottom:0.8rem;font-size:1.05rem">Payment</h4>
        <p style="font-size:0.88rem;color:var(--gray-400);margin-bottom:0.8rem">Use the links below to make a payment for this tour.</p>
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap">
          ${t.portalPaymentCard ? `<a href="${Portal._escapeAttr(t.portalPaymentCard)}" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem 1.2rem;background:var(--navy);color:white;border-radius:var(--radius-lg);text-decoration:none;font-weight:600;font-size:0.92rem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pay by Card
          </a>` : ''}
          ${t.portalPaymentWise ? `<a href="${Portal._escapeAttr(t.portalPaymentWise)}" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem 1.2rem;background:#9FE870;color:#163300;border-radius:var(--radius-lg);text-decoration:none;font-weight:600;font-size:0.92rem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Pay via Wise
          </a>` : ''}
        </div>
      </div>` : ''}

      <div class="contact-card">
        <h4>Tour Operator</h4>
        <p><strong>Odisea Tours</strong></p>
        <p>For any questions, use the Messages section or contact us directly.</p>
      </div>`;
  },

  renderItinerary() {
    const t = this.tourData;
    if (!t) return;
    const container = document.getElementById('section-itinerary');
    const days = t.itinerary || [];

    if (!days.length) {
      container.innerHTML = `
        <div class="section-header">
          <h2>Itinerary</h2>
          <p>Your day-by-day schedule</p>
        </div>
        <div class="empty-state">
          <p>The itinerary is being prepared. Check back soon!</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2>Itinerary</h2>
        <p>${days.length} day${days.length!==1?'s':''} planned</p>
      </div>
      ${days.map(day => `
        <div class="itin-day">
          <div class="itin-day-header">
            <div class="itin-day-num">${day.day}</div>
            <div class="itin-day-title">${day.title || 'Day ' + day.day}</div>
            <div class="itin-day-date">${Portal._fmtDate(day.date)}</div>
          </div>
          <div class="itin-day-items">
            ${(day.items || []).filter(item => item.description || item.time).map(item => `
              <div class="itin-item">
                <div class="itin-time">${item.time || ''}</div>
                <div class="itin-desc ${item.highlight ? 'highlight' : ''}">${item.description || ''}</div>
              </div>
            `).join('') || '<div class="itin-item"><div class="itin-desc" style="color:var(--gray-300)">Details coming soon</div></div>'}
          </div>
        </div>
      `).join('')}

      ${(t.inclusions && t.inclusions.length) ? `
        <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-top:1rem;box-shadow:var(--shadow)">
          <h3 style="font-family:var(--font-display);color:var(--navy);margin-bottom:0.8rem;font-size:1.05rem">What's Included</h3>
          ${t.inclusions.map(item => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;font-size:0.88rem;color:var(--gray-600)">
              <span style="color:var(--green);font-weight:700">&#10003;</span> ${item}
            </div>
          `).join('')}
        </div>` : ''}

      <div id="portal-itinerary-map" style="margin-top:1.2rem">
        <h3 style="font-family:var(--font-display);color:var(--navy);margin-bottom:0.8rem;font-size:1.05rem">Tour Map</h3>
        <div id="portal-map" style="height:350px;border-radius:var(--radius-lg);overflow:hidden;border:1.5px solid var(--gray-200)">
          <div style="padding:2rem;text-align:center;color:var(--gray-300)">Loading map...</div>
        </div>
      </div>`;
    setTimeout(() => this._initItineraryMap(), 100);
  },

  _initItineraryMap() {
    if (typeof L === 'undefined') {
      if (!this._mapRetries) this._mapRetries = 0;
      if (this._mapRetries < 10) {
        this._mapRetries++;
        setTimeout(() => this._initItineraryMap(), 500);
        return;
      }
      const el = document.getElementById('portal-map');
      if (el) el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-300)">Map unavailable</div>';
      return;
    }
    this._mapRetries = 0;

    const t = this.tourData;
    if (!t) return;
    const mapEl = document.getElementById('portal-map');
    if (!mapEl || mapEl._leaflet_id) return;

    // Collect locations
    const locations = [];
    const dest = (t.destination || '').split('\u2192').map(d => d.trim()).filter(Boolean);
    dest.forEach(d => locations.push({ name: d, type: 'destination' }));
    (t.hotels || []).forEach(h => { if (h.hotelName) locations.push({ name: h.hotelName + ', ' + (h.city || ''), type: 'hotel', label: h.hotelName }); });
    (t.activities || []).forEach(a => { if (a.name && a.destination) locations.push({ name: a.name + ', ' + a.destination, type: 'activity', label: a.name }); });

    if (!locations.length) {
      mapEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-300)">No locations to display</div>';
      return;
    }

    const map = L.map(mapEl).setView([40.4168, -3.7038], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);
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
        if (coords.length > 1) L.polyline(coords, { color: '#ffb400', weight: 3, dashArray: '10,10', opacity: 0.7 }).addTo(map);
        if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
        return;
      }
      const loc = locations[idx];
      fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(loc.name) + '&limit=1&email=info@odisea-tours.com')
        .then(r => r.json())
        .then(data => {
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
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

  async renderDocuments() {
    const container = document.getElementById('section-documents');
    container.innerHTML = `
      <div class="section-header">
        <h2>Documents</h2>
        <p>Download tour documents and files</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    const docs = await DB.getTourDocuments(this.tourId);

    if (!docs.length) {
      container.innerHTML = `
        <div class="section-header">
          <h2>Documents</h2>
          <p>Download tour documents and files</p>
        </div>
        <div class="empty-state">
          <p>No documents uploaded yet. Check back later!</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2>Documents</h2>
        <p>${docs.length} file${docs.length!==1?'s':''} available</p>
      </div>
      ${docs.map(doc => {
        const ext = (doc.name || '').split('.').pop().toLowerCase();
        const icon = { pdf: '\uD83D\uDCC4', doc: '\uD83D\uDCC3', docx: '\uD83D\uDCC3', xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA', jpg: '\uD83D\uDDBC', jpeg: '\uD83D\uDDBC', png: '\uD83D\uDDBC' }[ext] || '\uD83D\uDCC1';
        const size = doc.size ? (doc.size < 1024*1024 ? Math.round(doc.size/1024) + ' KB' : (doc.size/(1024*1024)).toFixed(1) + ' MB') : '';
        return `
          <div class="doc-item">
            <div class="doc-icon">${icon}</div>
            <div class="doc-info">
              <div class="doc-name">${doc.name}</div>
              <div class="doc-meta">${size}${doc.uploadedAt ? ' \u2022 ' + Portal._fmtDate(doc.uploadedAt) : ''}</div>
            </div>
            <a href="${doc.url}" target="_blank" class="doc-download" rel="noopener">Download</a>
          </div>`;
      }).join('')}`;
  },

  _passengers: [],
  _invoices: [],

  async renderPassengers() {
    const container = document.getElementById('section-passengers');
    container.innerHTML = `
      <div class="section-header">
        <h2>Passengers</h2>
        <p>Register travelers for this tour</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    // Load passengers and invoices in parallel
    const [passengers, invoices] = await Promise.all([
      DB.getTourPassengers(this.tourId),
      DB.getTourInvoices(this.tourId)
    ]);
    this._passengers = passengers;
    this._invoices = invoices;

    const t = this.tourData;
    const totalExpected = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0);

    let html = `
      <div class="section-header">
        <h2>Passengers</h2>
        <p>${passengers.length} registered${totalExpected ? ' of ' + totalExpected + ' expected' : ''}</p>
      </div>

      ${totalExpected ? `<div class="pax-progress-bar">
        <div class="pax-progress-fill" style="width:${Math.min(100, Math.round(passengers.length / totalExpected * 100))}%"></div>
        <span class="pax-progress-label">${Math.round(passengers.length / totalExpected * 100)}%</span>
      </div>` : ''}

      <button class="add-pax-btn" onclick="Portal.showPassengerForm()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:2px"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        Add Passenger
      </button>
      <div id="pax-form-container"></div>`;

    if (passengers.length) {
      html += `<div class="pax-list">`;
      html += passengers.map(p => {
        const initials = ((p.firstName || '')[0] || '') + ((p.lastName || '')[0] || '');
        const fullName = (p.firstName || '') + ' ' + (p.lastName || '');

        // Try to match passenger to an individual client invoice by name
        const paymentStatus = this._getPaymentStatus(fullName);

        // Passport status
        let passportTag = '';
        if (p.passportNumber) {
          if (p.passportExpiry) {
            const exp = new Date(p.passportExpiry);
            const monthsLeft = (exp - new Date()) / (1000*60*60*24*30);
            if (monthsLeft < 0) passportTag = '<span class="pax-tag pax-tag-red">Expired</span>';
            else if (monthsLeft < 6) passportTag = '<span class="pax-tag pax-tag-amber">Expiring Soon</span>';
            else passportTag = '<span class="pax-tag pax-tag-green">Valid</span>';
          } else {
            passportTag = '<span class="pax-tag pax-tag-gray">No Expiry</span>';
          }
        } else {
          passportTag = '<span class="pax-tag pax-tag-red">No Passport</span>';
        }

        return `
          <div class="pax-card-detail" onclick="Portal.togglePaxDetail('pax-${p.id}')">
            <div class="pax-card-main">
              <div class="pax-avatar">${initials.toUpperCase() || '?'}</div>
              <div class="pax-info">
                <div class="pax-name">${fullName}</div>
                <div class="pax-detail">
                  ${p.nationality || 'No nationality'}${p.dateOfBirth ? ' &bull; ' + Portal._fmtDate(p.dateOfBirth) : ''}
                </div>
                <div class="pax-tags">
                  ${p.role ? '<span class="pax-tag pax-tag-role-' + p.role.toLowerCase() + '">' + Portal._escapeHtml(p.role) + '</span>' : ''}
                  ${p.family ? '<span class="pax-tag pax-tag-family">' + Portal._escapeHtml(p.family) + '</span>' : ''}
                  ${paymentStatus}
                  ${passportTag}
                  ${p.dietary ? '<span class="pax-tag pax-tag-blue">' + Portal._escapeHtml(p.dietary) + '</span>' : ''}
                  ${p.medical ? '<span class="pax-tag pax-tag-amber">Medical Note</span>' : ''}
                </div>
              </div>
              <div class="pax-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div class="pax-detail-panel" id="pax-${p.id}" style="display:none" onclick="event.stopPropagation()">
              <div class="pax-detail-grid">
                <div class="pax-field"><span class="pax-field-label">Full Name</span><span class="pax-field-value">${fullName}</span></div>
                <div class="pax-field"><span class="pax-field-label">Role</span><span class="pax-field-value">${p.role || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Family / Group</span><span class="pax-field-value">${p.family || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Date of Birth</span><span class="pax-field-value">${p.dateOfBirth ? Portal._fmtDate(p.dateOfBirth) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Nationality</span><span class="pax-field-value">${p.nationality || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport</span><span class="pax-field-value">${p.passportNumber || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport Expiry</span><span class="pax-field-value">${p.passportExpiry ? Portal._fmtDate(p.passportExpiry) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Dietary</span><span class="pax-field-value">${p.dietary || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Medical Info</span><span class="pax-field-value">${p.medical || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Emergency Contact</span><span class="pax-field-value">${p.emergencyContact || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Room</span><span class="pax-field-value">${p.room || 'Unassigned'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Registered</span><span class="pax-field-value">${p.createdAt ? Portal._fmtDate(p.createdAt) : '\u2014'}</span></div>
              </div>
              <div class="pax-detail-actions">
                <button class="btn-primary btn-sm" onclick="Portal.showPassengerForm('${p.id}')">Edit</button>
                <button class="btn-outline btn-sm btn-danger-outline" onclick="Portal.deletePassenger('${p.id}')">Remove</button>
              </div>
            </div>
          </div>`;
      }).join('');
      html += `</div>`;
    } else {
      html += '<div class="empty-state"><p>No passengers registered yet. Be the first to register!</p></div>';
    }

    container.innerHTML = html;
  },

  _getPaymentStatus(fullName) {
    const t = this.tourData;
    if (!t || !t.individualClients) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    // Try to match by name (fuzzy: check if passenger name contains individual client name or vice versa)
    const nameLower = fullName.toLowerCase().trim();
    const ic = t.individualClients.find(c => {
      const icName = (c.name || '').toLowerCase().trim();
      return icName && (nameLower.includes(icName) || icName.includes(nameLower));
    });

    if (!ic) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    // Find matching invoice
    const inv = this._invoices.find(i => i.individualClientRef === ic.id && i.tourId === t.id);
    if (!inv) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const amount = Number(inv.amount) || 0;
    if (paid >= amount) return '<span class="pax-tag pax-tag-green">Paid</span>';
    if (paid > 0) return '<span class="pax-tag pax-tag-amber">Partial (' + Math.round(paid/amount*100) + '%)</span>';
    return '<span class="pax-tag pax-tag-red">Unpaid</span>';
  },

  togglePaxDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    // Close all others
    document.querySelectorAll('.pax-detail-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.pax-card-detail').forEach(c => c.classList.remove('expanded'));
    if (!isOpen) {
      el.style.display = 'block';
      el.closest('.pax-card-detail').classList.add('expanded');
    }
  },

  showPassengerForm(editId) {
    const formContainer = document.getElementById('pax-form-container');
    if (!formContainer) return;

    // If editing, find existing passenger data
    let p = {};
    if (editId) {
      p = this._passengers.find(x => x.id === editId) || {};
    }

    const isEdit = !!editId;

    // Get unique family names for datalist
    const families = [...new Set(this._passengers.map(x => x.family).filter(Boolean))];

    formContainer.innerHTML = `
      <form class="pax-form" onsubmit="Portal.savePassenger(event, '${editId || ''}')">
        <h3>${isEdit ? 'Edit Passenger' : 'Register Passenger'}</h3>
        <div class="form-row form-row-2">
          <div class="form-group"><label>First Name *</label><input id="pf-first" required value="${Portal._escapeAttr(p.firstName || '')}"></div>
          <div class="form-group"><label>Last Name *</label><input id="pf-last" required value="${Portal._escapeAttr(p.lastName || '')}"></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label>Role *</label>
            <select id="pf-role">
              <option value="Player" ${(p.role||'')==='Player'?'selected':''}>Player</option>
              <option value="Sibling" ${(p.role||'')==='Sibling'?'selected':''}>Sibling</option>
              <option value="Adult" ${(p.role||'')==='Adult'?'selected':''}>Adult</option>
              <option value="Coach" ${(p.role||'')==='Coach'?'selected':''}>Coach</option>
            </select>
          </div>
          <div class="form-group">
            <label>Family / Group</label>
            <input id="pf-family" list="family-list" placeholder="e.g. Smith Family" value="${Portal._escapeAttr(p.family || '')}">
            <datalist id="family-list">${families.map(f => '<option value="' + Portal._escapeAttr(f) + '">').join('')}</datalist>
          </div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Date of Birth</label><input id="pf-dob" type="date" value="${p.dateOfBirth || ''}"></div>
          <div class="form-group"><label>Nationality</label><input id="pf-nationality" placeholder="e.g. British" value="${Portal._escapeAttr(p.nationality || '')}"></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Passport Number</label><input id="pf-passport" value="${Portal._escapeAttr(p.passportNumber || '')}"></div>
          <div class="form-group"><label>Passport Expiry</label><input id="pf-passport-exp" type="date" value="${p.passportExpiry || ''}"></div>
        </div>
        <div class="form-group"><label>Dietary Requirements</label><input id="pf-dietary" placeholder="e.g. Vegetarian, Gluten-free" value="${Portal._escapeAttr(p.dietary || '')}"></div>
        <div class="form-group"><label>Medical Information</label><textarea id="pf-medical" rows="2" placeholder="Allergies, medications, conditions...">${Portal._escapeHtml(p.medical || '')}</textarea></div>
        <div class="form-group"><label>Emergency Contact</label><input id="pf-emergency" placeholder="Name and phone number" value="${Portal._escapeAttr(p.emergencyContact || '')}"></div>
        <div class="pax-form-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Update Passenger' : 'Save Passenger'}</button>
          <button type="button" class="btn-outline" onclick="document.getElementById('pax-form-container').innerHTML=''">Cancel</button>
        </div>
      </form>`;
    formContainer.scrollIntoView({ behavior: 'smooth' });
  },

  async savePassenger(event, editId) {
    event.preventDefault();
    const passenger = {
      firstName: document.getElementById('pf-first').value.trim(),
      lastName: document.getElementById('pf-last').value.trim(),
      role: document.getElementById('pf-role').value,
      family: document.getElementById('pf-family').value.trim(),
      dateOfBirth: document.getElementById('pf-dob').value,
      nationality: document.getElementById('pf-nationality').value.trim(),
      passportNumber: document.getElementById('pf-passport').value.trim(),
      passportExpiry: document.getElementById('pf-passport-exp').value,
      dietary: document.getElementById('pf-dietary').value.trim(),
      medical: document.getElementById('pf-medical').value.trim(),
      emergencyContact: document.getElementById('pf-emergency').value.trim(),
      source: 'portal'
    };

    if (!passenger.firstName || !passenger.lastName) {
      alert('First and last name are required.');
      return;
    }

    let result;
    if (editId) {
      result = await DB.updateTourPassenger(this.tourId, editId, passenger);
    } else {
      result = await DB.saveTourPassenger(this.tourId, passenger);
    }

    if (result) {
      this.renderPassengers();
    } else {
      alert('Failed to save passenger. Please try again.');
    }
  },

  async deletePassenger(passengerId) {
    if (!confirm('Remove this passenger?')) return;
    const result = await DB.deleteTourPassenger(this.tourId, passengerId);
    if (result) {
      this.renderPassengers();
    } else {
      alert('Failed to remove passenger. Please try again.');
    }
  },

  /* ============================================================
     ROOM PLAN — assign passengers to rooms + download
     ============================================================ */
  _roomPlan: [],

  _roomTypeLabel(count) {
    if (count === 1) return 'Single Room';
    if (count === 2) return 'Twin Room';
    if (count === 3) return 'Triple Room';
    if (count === 4) return 'Quadruple Room';
    return count + '-Person Room';
  },

  async renderRoomPlan() {
    const container = document.getElementById('section-roomplan');
    container.innerHTML = `
      <div class="section-header">
        <h2>Room Plan</h2>
        <p>Assign passengers to rooms for hotel bookings</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    // Load passengers if not loaded
    if (!this._passengers.length) {
      this._passengers = await DB.getTourPassengers(this.tourId);
    }

    // Load room plan from tour doc
    this._roomPlan = this.tourData.roomPlan || [];

    const passengers = this._passengers;
    const assigned = new Set();
    this._roomPlan.forEach(room => (room.passengers || []).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));

    // Group unassigned by family
    const familyGroups = {};
    const noFamily = [];
    unassigned.forEach(p => {
      if (p.family) {
        if (!familyGroups[p.family]) familyGroups[p.family] = [];
        familyGroups[p.family].push(p);
      } else {
        noFamily.push(p);
      }
    });

    container.innerHTML = `
      <div class="section-header">
        <h2>Room Plan</h2>
        <p>${this._roomPlan.length} room${this._roomPlan.length!==1?'s':''} &bull; ${passengers.length - unassigned.length} assigned &bull; ${unassigned.length} unassigned</p>
      </div>

      <div class="rp-actions">
        <button class="btn-primary btn-sm" onclick="Portal.addRoom()">+ Add Room</button>
        <button class="btn-outline btn-sm" onclick="Portal.autoAssignRooms()">Auto-Assign</button>
        ${this._roomPlan.length ? '<button class="btn-outline btn-sm" onclick="Portal.downloadRoomPlan()">Download PDF</button><button class="btn-outline btn-sm" onclick="Portal.downloadRoomPlanExcel()">Download CSV</button>' : ''}
      </div>

      ${this._roomPlan.length ? `<div class="rp-rooms">
        ${this._roomPlan.map((room, ri) => {
          const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
          return `
            <div class="rp-room">
              <div class="rp-room-header">
                <div class="rp-room-num">
                  <input value="${Portal._escapeAttr(room.name || 'Room ' + (ri+1))}" class="rp-room-name-input" onchange="Portal.updateRoomName(${ri},this.value)" onclick="event.stopPropagation()">
                </div>
                <span class="rp-room-type">${Portal._roomTypeLabel(roomPax.length)}</span>
                <span class="rp-room-count">${roomPax.length} guest${roomPax.length!==1?'s':''}</span>
                <button class="rp-room-delete" onclick="Portal.removeRoom(${ri})" title="Remove room">&times;</button>
              </div>
              <div class="rp-room-guests">
                ${roomPax.length ? roomPax.map(p => `
                  <div class="rp-guest">
                    <div class="rp-guest-avatar">${((p.firstName||'')[0]||'')+((p.lastName||'')[0]||'')}</div>
                    <div class="rp-guest-info">
                      <div class="rp-guest-name">${p.firstName||''} ${p.lastName||''}</div>
                      <div class="rp-guest-meta">${p.role||''}${p.family?' &bull; '+Portal._escapeHtml(p.family):''}</div>
                    </div>
                    <button class="rp-guest-remove" onclick="Portal.removeFromRoom(${ri},'${p.id}')" title="Remove from room">&times;</button>
                  </div>
                `).join('') : '<div class="rp-empty">No guests assigned</div>'}
              </div>
              <div class="rp-room-add">
                <select onchange="Portal.assignToRoom(${ri},this.value);this.value=''" class="rp-assign-select">
                  <option value="">+ Add guest...</option>
                  ${unassigned.map(p => '<option value="' + p.id + '">' + Portal._escapeAttr((p.firstName||'')+' '+(p.lastName||'')) + (p.family?' ('+Portal._escapeAttr(p.family)+')':'') + (p.role?' - '+p.role:'') + '</option>').join('')}
                </select>
              </div>
            </div>`;
        }).join('')}
      </div>` : ''}

      ${unassigned.length ? `
        <div class="rp-unassigned">
          <h3 class="rp-unassigned-title">Unassigned Passengers (${unassigned.length})</h3>
          ${Object.keys(familyGroups).length ? Object.entries(familyGroups).map(([family, members]) => `
            <div class="rp-family-group">
              <div class="rp-family-label">${Portal._escapeHtml(family)} (${members.length})</div>
              <div class="rp-family-members">
                ${members.map(p => `
                  <div class="rp-unassigned-pax">
                    <span class="rp-ua-name">${p.firstName||''} ${p.lastName||''}</span>
                    <span class="pax-tag pax-tag-role-${(p.role||'player').toLowerCase()}">${p.role||'Player'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('') : ''}
          ${noFamily.length ? `
            <div class="rp-family-group">
              <div class="rp-family-label">No Family Group (${noFamily.length})</div>
              <div class="rp-family-members">
                ${noFamily.map(p => `
                  <div class="rp-unassigned-pax">
                    <span class="rp-ua-name">${p.firstName||''} ${p.lastName||''}</span>
                    <span class="pax-tag pax-tag-role-${(p.role||'player').toLowerCase()}">${p.role||'Player'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}`;
  },

  addRoom() {
    this._roomPlan.push({ name: 'Room ' + (this._roomPlan.length + 1), passengers: [] });
    this._saveRoomPlan();
  },

  removeRoom(idx) {
    if (!confirm('Remove this room? Guests will become unassigned.')) return;
    this._roomPlan.splice(idx, 1);
    this._saveRoomPlan();
  },

  updateRoomName(idx, name) {
    if (this._roomPlan[idx]) this._roomPlan[idx].name = name;
    this._saveRoomPlan(false);
  },

  assignToRoom(roomIdx, passengerId) {
    if (!passengerId || !this._roomPlan[roomIdx]) return;
    // Remove from any other room first
    this._roomPlan.forEach(r => { r.passengers = (r.passengers || []).filter(id => id !== passengerId); });
    this._roomPlan[roomIdx].passengers.push(passengerId);
    this._saveRoomPlan();
  },

  removeFromRoom(roomIdx, passengerId) {
    if (!this._roomPlan[roomIdx]) return;
    this._roomPlan[roomIdx].passengers = (this._roomPlan[roomIdx].passengers || []).filter(id => id !== passengerId);
    this._saveRoomPlan();
  },

  autoAssignRooms() {
    const passengers = this._passengers;
    if (!passengers.length) return;

    // Group by family first, then solo passengers
    const familyGroups = {};
    const solos = [];
    passengers.forEach(p => {
      if (p.family) {
        if (!familyGroups[p.family]) familyGroups[p.family] = [];
        familyGroups[p.family].push(p.id);
      } else {
        solos.push(p.id);
      }
    });

    this._roomPlan = [];
    let roomNum = 1;

    // Each family gets a room
    Object.entries(familyGroups).forEach(([family, ids]) => {
      this._roomPlan.push({ name: family, passengers: ids });
      roomNum++;
    });

    // Solo passengers: group by role, 2-3 per room
    const roleGroups = {};
    solos.forEach(id => {
      const p = passengers.find(x => x.id === id);
      const role = (p && p.role) || 'Player';
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(id);
    });

    Object.entries(roleGroups).forEach(([role, ids]) => {
      for (let i = 0; i < ids.length; i += 2) {
        const chunk = ids.slice(i, i + 2);
        this._roomPlan.push({ name: 'Room ' + roomNum, passengers: chunk });
        roomNum++;
      }
    });

    this._saveRoomPlan();
  },

  async _saveRoomPlan(rerender) {
    this.tourData.roomPlan = this._roomPlan;
    if (DB._firebaseReady) {
      try {
        await DB.firestore.collection('tours').doc(this.tourId).update({ roomPlan: this._roomPlan });
      } catch (e) {
        console.warn('Save room plan failed:', e.message);
      }
    }
    if (rerender !== false) this.renderRoomPlan();
  },

  downloadRoomPlan() {
    const t = this.tourData;
    const passengers = this._passengers;
    const rooms = this._roomPlan;

    // Build HTML document for printing/saving
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Room Plan - ${Portal._escapeHtml(t.tourName || 'Tour')}</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;margin:2rem;color:#333;font-size:14px}
        h1{color:#111111;border-bottom:3px solid #ffb400;padding-bottom:0.5rem;margin-bottom:0.3rem;font-size:1.5rem}
        .subtitle{color:#888;margin-bottom:1.5rem;font-size:0.9rem}
        .room{border:1px solid #ddd;border-radius:8px;margin-bottom:1rem;overflow:hidden;page-break-inside:avoid}
        .room-header{background:#111111;color:white;padding:0.6rem 1rem;font-weight:600;display:flex;justify-content:space-between}
        .room-body{padding:0.8rem 1rem}
        .guest{display:flex;align-items:center;gap:0.8rem;padding:0.4rem 0;border-bottom:1px solid #f0f0f0}
        .guest:last-child{border-bottom:none}
        .guest-name{font-weight:600;min-width:180px}
        .guest-detail{color:#888;font-size:0.85rem}
        .tag{display:inline-block;padding:0.1rem 0.5rem;border-radius:10px;font-size:0.75rem;font-weight:600}
        .tag-player{background:#e8f5e9;color:#2e7d32}
        .tag-sibling{background:#e3f2fd;color:#1565c0}
        .tag-adult{background:#fce4ec;color:#c62828}
        .tag-coach{background:#f3e5f5;color:#6a1b9a}
        .summary{margin-top:2rem;background:#f8f9fa;border-radius:8px;padding:1rem;font-size:0.9rem}
        .summary td{padding:0.3rem 1rem 0.3rem 0}
        @media print{body{margin:1rem}.room{break-inside:avoid}}
      </style></head><body>
      <h1>Room Plan</h1>
      <div class="subtitle">${Portal._escapeHtml(t.tourName||'')} &mdash; ${Portal._escapeHtml(t.destination||'')} &mdash; ${Portal._fmtDate(t.startDate)} to ${Portal._fmtDate(t.endDate)}</div>`;

    rooms.forEach(room => {
      const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
      html += `<div class="room">
        <div class="room-header"><span>${Portal._escapeHtml(room.name || 'Room')} <span style="opacity:0.7;font-weight:400;font-size:0.85em">&mdash; ${Portal._roomTypeLabel(roomPax.length)}</span></span><span>${roomPax.length} guest${roomPax.length!==1?'s':''}</span></div>
        <div class="room-body">`;
      if (roomPax.length) {
        roomPax.forEach(p => {
          html += `<div class="guest">
            <span class="guest-name">${Portal._escapeHtml((p.firstName||'')+' '+(p.lastName||''))}</span>
            <span class="tag tag-${(p.role||'player').toLowerCase()}">${Portal._escapeHtml(p.role||'Player')}</span>
            ${p.family ? '<span class="guest-detail">'+Portal._escapeHtml(p.family)+'</span>' : ''}
            ${p.dietary ? '<span class="guest-detail">Diet: '+Portal._escapeHtml(p.dietary)+'</span>' : ''}
            ${p.medical ? '<span class="guest-detail">Medical: Yes</span>' : ''}
          </div>`;
        });
      } else {
        html += '<div style="color:#aaa;padding:0.5rem 0">Empty room</div>';
      }
      html += `</div></div>`;
    });

    // Summary
    const assigned = new Set();
    rooms.forEach(r => (r.passengers||[]).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));
    const players = passengers.filter(p => (p.role||'Player')==='Player').length;
    const siblings = passengers.filter(p => p.role==='Sibling').length;
    const adults = passengers.filter(p => p.role==='Adult').length;
    const coaches = passengers.filter(p => p.role==='Coach').length;

    const singles = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 1).length;
    const twins = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 2).length;
    const triples = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 3).length;
    const quads = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length >= 4).length;

    html += `<div class="summary"><table>
      <tr><td><strong>Total Passengers:</strong></td><td>${passengers.length}</td></tr>
      <tr><td><strong>Players:</strong></td><td>${players}</td></tr>
      <tr><td><strong>Siblings:</strong></td><td>${siblings}</td></tr>
      <tr><td><strong>Adults:</strong></td><td>${adults}</td></tr>
      <tr><td><strong>Coaches:</strong></td><td>${coaches}</td></tr>
      <tr><td><strong>Total Rooms:</strong></td><td>${rooms.length}</td></tr>
      ${singles ? '<tr><td><strong>Single Rooms:</strong></td><td>' + singles + '</td></tr>' : ''}
      ${twins ? '<tr><td><strong>Twin Rooms:</strong></td><td>' + twins + '</td></tr>' : ''}
      ${triples ? '<tr><td><strong>Triple Rooms:</strong></td><td>' + triples + '</td></tr>' : ''}
      ${quads ? '<tr><td><strong>Quadruple Rooms:</strong></td><td>' + quads + '</td></tr>' : ''}
      <tr><td><strong>Assigned:</strong></td><td>${assigned.size}</td></tr>
      ${unassigned.length ? '<tr><td><strong>Unassigned:</strong></td><td style="color:red">' + unassigned.length + ' (' + unassigned.map(p=>(p.firstName||'')+' '+(p.lastName||'')).join(', ') + ')</td></tr>' : ''}
    </table></div>
    <div style="margin-top:2rem;text-align:center;color:#aaa;font-size:0.8rem">
      Generated by Odisea Tours &mdash; ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
    </div></body></html>`;

    // Open as printable page
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  },

  downloadRoomPlanExcel() {
    const t = this.tourData;
    const passengers = this._passengers;
    const rooms = this._roomPlan;
    const assigned = new Set();
    rooms.forEach(r => (r.passengers || []).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));

    const esc = v => {
      const s = String(v || '').replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s + '"' : s;
    };

    const lines = [];
    // Header
    lines.push(['Room', 'Room Type', 'Guest Name', 'Role', 'Family', 'Nationality', 'Date of Birth', 'Dietary', 'Medical', 'Passport'].map(esc).join(','));

    // Room rows
    rooms.forEach(room => {
      const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
      const roomType = Portal._roomTypeLabel(roomPax.length);
      if (roomPax.length) {
        roomPax.forEach((p, i) => {
          lines.push([
            room.name || 'Room',
            i === 0 ? roomType : '',
            (p.firstName || '') + ' ' + (p.lastName || ''),
            p.role || '', p.family || '', p.nationality || '',
            p.dateOfBirth || '', p.dietary || '', p.medical || '',
            p.passportNumber || ''
          ].map(esc).join(','));
        });
      } else {
        lines.push([room.name || 'Room', 'Empty', '(empty)', '', '', '', '', '', '', ''].map(esc).join(','));
      }
    });

    // Unassigned
    if (unassigned.length) {
      lines.push('');
      lines.push('UNASSIGNED');
      unassigned.forEach(p => {
        lines.push([
          '', '',
          (p.firstName || '') + ' ' + (p.lastName || ''),
          p.role || '', p.family || '', p.nationality || '',
          p.dateOfBirth || '', p.dietary || '', p.medical || '',
          p.passportNumber || ''
        ].map(esc).join(','));
      });
    }

    // Summary with room type breakdown
    const csvSingles = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 1).length;
    const csvTwins = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 2).length;
    const csvTriples = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 3).length;
    const csvQuads = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length >= 4).length;

    lines.push('');
    lines.push('SUMMARY');
    lines.push('Total Passengers,' + passengers.length);
    lines.push('Total Rooms,' + rooms.length);
    if (csvSingles) lines.push('Single Rooms,' + csvSingles);
    if (csvTwins) lines.push('Twin Rooms,' + csvTwins);
    if (csvTriples) lines.push('Triple Rooms,' + csvTriples);
    if (csvQuads) lines.push('Quadruple Rooms,' + csvQuads);
    lines.push('Assigned,' + assigned.size);
    lines.push('Unassigned,' + unassigned.length);

    // BOM + CSV content — BOM ensures Excel reads UTF-8 correctly
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Room_Plan_' + (t.tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async renderMessages() {
    const container = document.getElementById('section-messages');
    container.innerHTML = `
      <div class="section-header">
        <h2>Messages</h2>
        <p>Chat with your tour operator</p>
      </div>
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>
        </div>
        <form class="chat-input" onsubmit="Portal.sendMessage(event)">
          <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
          <button type="submit" class="chat-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>`;

    this.listenToMessages();
  },

  listenToMessages() {
    if (this._messageListener) this._messageListener();
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    this._messageListener = DB.listenToTourMessages(this.tourId, messages => {
      if (!messages.length) {
        messagesEl.innerHTML = '<div class="empty-state"><p>No messages yet. Start the conversation!</p></div>';
        return;
      }

      messagesEl.innerHTML = messages.map(m => `
        <div class="chat-bubble ${m.sender === 'admin' ? 'admin' : 'client'}">
          <div>${Portal._escapeHtml(m.text || '')}</div>
          <div class="bubble-meta">${m.sender === 'admin' ? 'Odisea Tours' : (m.senderName || 'You')} \u2022 ${Portal._fmtTime(m.timestamp)}</div>
        </div>
      `).join('');

      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  },

  async sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    await DB.sendTourMessage(this.tourId, {
      text: text,
      sender: 'client',
      senderName: this.tourData.groupName || 'Client'
    });
  },

  // ── Forms & Consent ──
  async renderForms() {
    const container = document.getElementById('section-forms');
    const t = this.tourData;
    if (!t) return;

    const requiredForms = t.requiredForms || ['terms', 'medical', 'photo'];

    // Load existing signatures from Firestore
    let signatures = {};
    try {
      const sigDoc = await DB.firestore.collection('tours').doc(this.tourId).collection('consent').doc('signatures').get();
      if (sigDoc.exists) signatures = sigDoc.data() || {};
    } catch (e) {}

    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    const mySignatures = signatures[sessionCode] || {};

    const formDefs = {
      terms: { title: 'Terms & Conditions', desc: 'I accept the tour terms and conditions, including cancellation policy and travel insurance requirements.' },
      medical: { title: 'Medical Declaration', desc: 'I confirm that all medical conditions have been disclosed in the passenger registration forms and that all travelers are fit to travel.' },
      photo: { title: 'Photo Consent', desc: 'I consent to photographs and videos being taken during the tour for promotional and record-keeping purposes.' }
    };

    container.innerHTML = `
      <div class="section-header">
        <h2>Forms & Consent</h2>
        <p>Please review and sign the required forms below</p>
      </div>
      ${requiredForms.map(formId => {
        const def = formDefs[formId] || { title: formId, desc: '' };
        const signed = mySignatures[formId];
        return `
          <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem;box-shadow:var(--shadow);border-left:4px solid ${signed ? 'var(--green)' : 'var(--amber)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <h3 style="font-size:1rem;color:var(--navy)">${def.title}</h3>
              ${signed ? '<span style="background:var(--green);color:white;padding:0.2rem 0.8rem;border-radius:12px;font-size:0.78rem;font-weight:600">Signed</span>' : '<span style="background:var(--amber);color:white;padding:0.2rem 0.8rem;border-radius:12px;font-size:0.78rem;font-weight:600">Pending</span>'}
            </div>
            <p style="font-size:0.88rem;color:var(--gray-500);margin-bottom:1rem">${def.desc}</p>
            ${signed ? `
              <div style="background:var(--gray-50);padding:0.8rem;border-radius:var(--radius)">
                <p style="font-size:0.82rem;color:var(--gray-400)">Signed on: ${Portal._fmtDate(signed.date)}</p>
                <img src="${signed.signature}" style="max-width:200px;max-height:60px;border:1px solid var(--gray-200);border-radius:var(--radius);margin-top:0.3rem" alt="Signature">
              </div>
            ` : `
              <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;font-size:0.88rem;cursor:pointer">
                <input type="checkbox" id="consent-check-${formId}"> I agree to the above
              </label>
              <div style="margin-bottom:0.5rem">
                <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Sign below:</label>
                <canvas id="sig-canvas-${formId}" width="300" height="100" style="border:1.5px solid var(--gray-200);border-radius:var(--radius);cursor:crosshair;touch-action:none;background:white"></canvas>
                <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
                  <button class="btn-outline btn-sm" onclick="Portal.clearSignature('${formId}')">Clear</button>
                  <button class="btn-primary btn-sm" onclick="Portal.submitConsent('${formId}')">Submit</button>
                </div>
              </div>
            `}
          </div>`;
      }).join('')}`;

    // Initialize signature canvases
    setTimeout(() => {
      requiredForms.forEach(formId => {
        if (!mySignatures[formId]) Portal._initSignatureCanvas(formId);
      });
    }, 100);
  },

  _signatureCanvases: {},

  _initSignatureCanvas(formId) {
    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { e.preventDefault(); drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
    const move = (e) => { if (!drawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);

    this._signatureCanvases[formId] = canvas;
  },

  clearSignature(formId) {
    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },

  async submitConsent(formId) {
    const checkbox = document.getElementById('consent-check-' + formId);
    if (!checkbox || !checkbox.checked) { alert('Please check the agreement box first.'); return; }

    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;

    // Check if canvas has any content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
    if (!hasContent) { alert('Please sign in the signature area.'); return; }

    const signatureData = canvas.toDataURL('image/png');
    const sessionCode = sessionStorage.getItem('portal_code') || 'client';

    try {
      const ref = DB.firestore.collection('tours').doc(this.tourId).collection('consent').doc('signatures');
      const doc = await ref.get();
      const existing = doc.exists ? doc.data() : {};
      if (!existing[sessionCode]) existing[sessionCode] = {};
      existing[sessionCode][formId] = { signature: signatureData, date: new Date().toISOString(), agreed: true };
      await ref.set(existing);
      this.renderForms();
    } catch (e) {
      alert('Failed to save consent. Please try again.');
    }
  },

  // ── Feedback Survey ──
  async renderFeedback() {
    const container = document.getElementById('section-feedback');
    const t = this.tourData;
    if (!t) return;

    // Check if tour has ended
    const tourEnd = new Date(t.endDate);
    const now = new Date();
    if (now < tourEnd) {
      container.innerHTML = `
        <div class="section-header"><h2>Feedback</h2><p>Share your experience</p></div>
        <div class="empty-state"><p>Feedback will be available after the tour ends on ${Portal._fmtDate(t.endDate)}.</p></div>`;
      return;
    }

    // Check if already submitted
    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    let existingFeedback = null;
    try {
      const fbDoc = await DB.firestore.collection('tours').doc(this.tourId).collection('feedback').doc(sessionCode).get();
      if (fbDoc.exists) existingFeedback = fbDoc.data();
    } catch (e) {}

    if (existingFeedback) {
      container.innerHTML = `
        <div class="section-header"><h2>Feedback</h2><p>Thank you for your feedback!</p></div>
        <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow)">
          <div style="text-align:center;margin-bottom:1rem">
            <div style="font-size:2rem;color:var(--amber)">${'\u2605'.repeat(existingFeedback.overall)}${'\u2606'.repeat(5 - existingFeedback.overall)}</div>
            <p style="font-weight:600;margin-top:0.3rem">Overall Rating: ${existingFeedback.overall}/5</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:1rem">
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Accommodation</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.accommodation||0)}</div></div>
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Activities</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.activities||0)}</div></div>
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Guide</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.guide||0)}</div></div>
          </div>
          ${existingFeedback.comments ? `<div style="background:var(--gray-50);padding:0.8rem;border-radius:var(--radius);font-size:0.88rem">"${Portal._escapeHtml(existingFeedback.comments)}"</div>` : ''}
          <p style="font-size:0.78rem;color:var(--gray-400);margin-top:0.8rem;text-align:center">Submitted ${Portal._fmtDate(existingFeedback.submittedAt)}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header"><h2>Feedback</h2><p>Tell us about your experience</p></div>
      <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow)">
        <form onsubmit="Portal.submitFeedback(event)">
          ${['overall', 'accommodation', 'activities', 'guide'].map(cat => `
            <div style="margin-bottom:1.2rem">
              <label style="font-weight:600;font-size:0.92rem;display:block;margin-bottom:0.3rem">${cat.charAt(0).toUpperCase() + cat.slice(1)} Rating</label>
              <div style="display:flex;gap:0.3rem" id="fb-${cat}">
                ${[1,2,3,4,5].map(n => `<button type="button" class="fb-star" data-cat="${cat}" data-val="${n}" onclick="Portal.setRating('${cat}',${n})" style="background:none;border:none;font-size:1.8rem;cursor:pointer;color:var(--gray-200);transition:color 0.2s">\u2605</button>`).join('')}
              </div>
            </div>
          `).join('')}
          <div style="margin-bottom:1rem">
            <label style="font-weight:600;font-size:0.92rem;display:block;margin-bottom:0.3rem">Comments</label>
            <textarea id="fb-comments" rows="4" placeholder="Share your thoughts about the tour..." style="width:100%;padding:0.6rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit;font-size:0.88rem;resize:vertical"></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;padding:0.8rem;font-size:1rem">Submit Feedback</button>
        </form>
      </div>`;
  },

  _feedbackRatings: {},

  setRating(category, value) {
    this._feedbackRatings[category] = value;
    const container = document.getElementById('fb-' + category);
    if (!container) return;
    container.querySelectorAll('.fb-star').forEach(btn => {
      const v = Number(btn.dataset.val);
      btn.style.color = v <= value ? 'var(--amber)' : 'var(--gray-200)';
    });
  },

  async submitFeedback(event) {
    event.preventDefault();
    const ratings = this._feedbackRatings;
    if (!ratings.overall) { alert('Please rate your overall experience.'); return; }

    const feedback = {
      overall: ratings.overall || 0,
      accommodation: ratings.accommodation || 0,
      activities: ratings.activities || 0,
      guide: ratings.guide || 0,
      comments: document.getElementById('fb-comments').value.trim(),
      submittedAt: new Date().toISOString()
    };

    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    try {
      await DB.firestore.collection('tours').doc(this.tourId).collection('feedback').doc(sessionCode).set(feedback);
      this._feedbackRatings = {};
      this.renderFeedback();
    } catch (e) {
      alert('Failed to submit feedback. Please try again.');
    }
  },

  // ── Payment Status ──
  async renderPaymentStatus() {
    const container = document.getElementById('section-payments');
    const t = this.tourData;
    if (!t) return;

    // Load invoices for this tour
    let invoices = [];
    try {
      invoices = await DB.getTourInvoices(this.tourId);
    } catch (e) {}

    if (!invoices.length) {
      container.innerHTML = `
        <div class="section-header"><h2>Payments</h2><p>Your payment status</p></div>
        <div class="empty-state"><p>No invoices available yet. Contact your tour operator for payment details.</p></div>`;
      return;
    }

    const totalDue = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const balance = totalDue - totalPaid;
    const pctPaid = totalDue > 0 ? Math.min(100, Math.round(totalPaid / totalDue * 100)) : 0;
    const cur = invoices[0].currency || t.currency || 'EUR';

    container.innerHTML = `
      <div class="section-header"><h2>Payments</h2><p>Track your payment progress</p></div>
      <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow);margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.2rem;text-align:center">
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Total Due</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--navy)">${Portal._fmtCurrency(totalDue, cur)}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Paid</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--green)">${Portal._fmtCurrency(totalPaid, cur)}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Balance</div>
            <div style="font-size:1.3rem;font-weight:700;color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">${Portal._fmtCurrency(balance, cur)}</div>
          </div>
        </div>
        <div style="background:var(--gray-100);border-radius:10px;height:12px;overflow:hidden;margin-bottom:0.5rem">
          <div style="background:${pctPaid >= 100 ? 'var(--green)' : 'var(--amber)'};height:100%;width:${pctPaid}%;border-radius:10px;transition:width 0.5s"></div>
        </div>
        <p style="text-align:center;font-size:0.82rem;color:var(--gray-400)">${pctPaid}% paid</p>
      </div>

      ${invoices.map(inv => {
        const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const invBalance = Number(inv.amount) - paid;
        const schedule = inv.paymentSchedule || [];
        return `
          <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem;box-shadow:var(--shadow)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
              <h3 style="font-size:0.95rem;color:var(--navy)">${inv.number || 'Invoice'}</h3>
              <span style="font-weight:700;color:${invBalance <= 0 ? 'var(--green)' : 'var(--red)'}">${Portal._fmtCurrency(invBalance, inv.currency || cur)} ${invBalance <= 0 ? 'PAID' : 'due'}</span>
            </div>
            ${schedule.length ? `
              <div style="margin-bottom:0.8rem">
                <div style="font-size:0.82rem;font-weight:600;color:var(--gray-500);margin-bottom:0.5rem">Payment Schedule</div>
                ${schedule.map(ms => {
                  const msAmount = ms.amount || (ms.percentage ? Number(inv.amount) * ms.percentage / 100 : 0);
                  const msPaid = paid >= msAmount;
                  return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--gray-50)">
                    <span style="color:${msPaid ? 'var(--green)' : 'var(--gray-300)'};font-size:1.1rem">${msPaid ? '\u2713' : '\u25CB'}</span>
                    <span style="flex:1;font-size:0.85rem;${msPaid ? 'text-decoration:line-through;color:var(--gray-400)' : ''}">${ms.label || 'Payment'}</span>
                    <span style="font-weight:600;font-size:0.85rem">${Portal._fmtCurrency(msAmount, inv.currency || cur)}</span>
                    ${ms.dueDate ? '<span style="font-size:0.78rem;color:var(--gray-400)">' + Portal._fmtDate(ms.dueDate) + '</span>' : ''}
                  </div>`;
                }).join('')}
              </div>
            ` : ''}
            ${(inv.payments || []).length ? `
              <div style="font-size:0.82rem;font-weight:600;color:var(--gray-500);margin-bottom:0.3rem">Payment History</div>
              ${(inv.payments || []).map(p => `
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.82rem;border-bottom:1px solid var(--gray-50)">
                  <span>${Portal._fmtDate(p.date)}</span>
                  <span style="font-weight:600;color:var(--green)">+${Portal._fmtCurrency(Number(p.amount), inv.currency || cur)}</span>
                </div>
              `).join('')}
            ` : ''}
          </div>`;
      }).join('')}

      ${(t.portalPaymentCard || t.portalPaymentWise) ? `
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:1rem">
          ${t.portalPaymentCard ? '<a href="' + Portal._escapeAttr(t.portalPaymentCard) + '" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem;background:var(--navy);color:white;border-radius:var(--radius-lg);text-decoration:none;font-weight:600">Pay by Card</a>' : ''}
          ${t.portalPaymentWise ? '<a href="' + Portal._escapeAttr(t.portalPaymentWise) + '" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem;background:#9FE870;color:#163300;border-radius:var(--radius-lg);text-decoration:none;font-weight:600">Pay via Wise</a>' : ''}
        </div>` : ''}`;
  },

  _fmtCurrency(amount, currency) {
    const symbols = { EUR: '\u20AC', USD: '$', GBP: '\u00A3' };
    const sym = symbols[currency] || currency || '\u20AC';
    return sym + (Number(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // ── Utility helpers ──
  _fmtDate(d) {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  _fmtTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
           dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};

// Boot portal
document.addEventListener('DOMContentLoaded', () => Portal.init());
