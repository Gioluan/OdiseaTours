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
      case 'messages': this.renderMessages(); break;
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
        <button class="action-btn" onclick="Portal.showSection('messages')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>Messages</span>
        </button>
      </div>

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
        </div>` : ''}`;
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
                <div class="pax-field"><span class="pax-field-label">Date of Birth</span><span class="pax-field-value">${p.dateOfBirth ? Portal._fmtDate(p.dateOfBirth) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Nationality</span><span class="pax-field-value">${p.nationality || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport</span><span class="pax-field-value">${p.passportNumber || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport Expiry</span><span class="pax-field-value">${p.passportExpiry ? Portal._fmtDate(p.passportExpiry) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Dietary</span><span class="pax-field-value">${p.dietary || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Medical Info</span><span class="pax-field-value">${p.medical || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Emergency Contact</span><span class="pax-field-value">${p.emergencyContact || '\u2014'}</span></div>
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

    formContainer.innerHTML = `
      <form class="pax-form" onsubmit="Portal.savePassenger(event, '${editId || ''}')">
        <h3>${isEdit ? 'Edit Passenger' : 'Register Passenger'}</h3>
        <div class="form-row form-row-2">
          <div class="form-group"><label>First Name *</label><input id="pf-first" required value="${Portal._escapeAttr(p.firstName || '')}"></div>
          <div class="form-group"><label>Last Name *</label><input id="pf-last" required value="${Portal._escapeAttr(p.lastName || '')}"></div>
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
