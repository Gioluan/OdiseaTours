/* === MORNING BRIEFING MODULE === */
const Briefing = {
  init() { this.render(); },

  render() {
    const container = document.getElementById('briefing-content');
    if (!container) return;

    const quotes = DB.getQuotes();
    const tours = DB.getTours();
    const invoices = DB.getInvoices();
    const clients = DB.getClients();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Greeting based on time of day
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // === URGENT ITEMS ===
    const urgent = [];

    // Overdue invoices
    invoices.forEach(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const balance = Number(i.amount) - paid;
      if (balance > 0 && i.dueDate && new Date(i.dueDate) < today) {
        const daysPast = Math.floor((today - new Date(i.dueDate)) / 86400000);
        urgent.push({
          icon: '\u{1F6A8}',
          title: `Overdue payment: ${i.number}`,
          detail: `${i.clientName || 'Unknown'} owes ${fmt(balance, i.currency)} — ${daysPast} days overdue`,
          action: `App.switchTab('invoicing')`,
          severity: daysPast > 14 ? 'critical' : 'high'
        });
      }
    });

    // Tours departing within 3 days
    tours.filter(t => t.status === 'Preparing').forEach(t => {
      const start = new Date(t.startDate);
      const daysUntil = Math.ceil((start - today) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 3) {
        const expected = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0);
        urgent.push({
          icon: '\u26A0\uFE0F',
          title: `Tour departing ${daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : 'in ' + daysUntil + ' days'}: ${t.tourName}`,
          detail: `${t.destination || ''} — ${expected} travelers expected`,
          action: `App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)`,
          severity: daysUntil === 0 ? 'critical' : 'high'
        });
      }
    });

    // Quotes sent 5+ days ago with no follow-up
    quotes.filter(q => q.status === 'Sent').forEach(q => {
      const sent = new Date(q.updatedAt || q.createdAt);
      const daysSince = Math.floor((today - sent) / 86400000);
      if (daysSince >= 5) {
        urgent.push({
          icon: '\u{1F525}',
          title: `Lead going cold: ${q.tourName || 'Q-' + q.id}`,
          detail: `${q.clientName || 'Unknown'} — quote sent ${daysSince} days ago, no response`,
          action: `App.switchTab('crm')`,
          severity: daysSince > 10 ? 'critical' : 'high'
        });
      }
    });

    // === TODAY'S ACTIONS ===
    const todayActions = [];

    // Follow-ups due (sent 3+ days ago)
    quotes.filter(q => q.status === 'Sent').forEach(q => {
      const sent = new Date(q.updatedAt || q.createdAt);
      const daysSince = Math.floor((today - sent) / 86400000);
      if (daysSince >= 3 && daysSince < 5) {
        todayActions.push({
          icon: '\u{1F4E7}',
          title: `Follow up: ${q.tourName || 'Quote'}`,
          detail: `${q.clientName || ''} — sent ${daysSince} days ago`,
          action: `App.switchTab('crm')`,
          type: 'follow-up'
        });
      }
    });

    // Invoices due within 3 days
    invoices.forEach(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const balance = Number(i.amount) - paid;
      if (balance > 0 && i.dueDate) {
        const due = new Date(i.dueDate);
        const daysUntil = Math.ceil((due - today) / 86400000);
        if (daysUntil > 0 && daysUntil <= 3) {
          todayActions.push({
            icon: '\u{1F4B0}',
            title: `Payment due ${daysUntil === 1 ? 'tomorrow' : 'in ' + daysUntil + ' days'}: ${i.number}`,
            detail: `${i.clientName || ''} — ${fmt(balance, i.currency)} outstanding`,
            action: `App.switchTab('invoicing')`,
            type: 'payment'
          });
        }
      }
    });

    // Provider RFQs awaiting response
    const providers = DB.getProviders();
    providers.forEach(p => {
      if (p.rfqStatus === 'Awaiting') {
        todayActions.push({
          icon: '\u{1F4DE}',
          title: `Chase provider RFQ: ${p.companyName}`,
          detail: `${p.category} — ${p.city}`,
          action: `App.switchTab('providers')`,
          type: 'provider'
        });
      }
    });

    // Tours departing 4-14 days — preparation reminders
    tours.filter(t => t.status === 'Preparing').forEach(t => {
      const start = new Date(t.startDate);
      const daysUntil = Math.ceil((start - today) / 86400000);
      if (daysUntil > 3 && daysUntil <= 14) {
        todayActions.push({
          icon: '\u2708\uFE0F',
          title: `Prepare: ${t.tourName} (${daysUntil} days)`,
          detail: `${t.destination || ''} — ${t.clientName || ''}`,
          action: `App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)`,
          type: 'preparation'
        });
      }
    });

    // Portal checklist notifications (loaded async, injected after render)
    const portalChecklistTours = tours.filter(t => {
      if (!t.accessCode || t.status === 'Completed') return false;
      const start = new Date(t.startDate);
      const daysUntil = Math.ceil((start - today) / 86400000);
      return daysUntil >= -7; // include all upcoming + recently departed (within 7 days)
    });

    // === THIS WEEK OVERVIEW ===
    const weekEnd = new Date(today.getTime() + 7 * 86400000);
    const toursThisWeek = tours.filter(t => {
      const d = new Date(t.startDate);
      return d >= today && d <= weekEnd;
    });
    const quotesActive = quotes.filter(q => q.status === 'Sent' || q.status === 'Follow-up');
    const invoicesDueThisWeek = invoices.filter(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      if (paid >= Number(i.amount)) return false;
      const due = new Date(i.dueDate);
      return due >= today && due <= weekEnd;
    });

    // === PIPELINE SUMMARY ===
    const pipelineByStatus = {
      draft: quotes.filter(q => q.status === 'Draft'),
      sent: quotes.filter(q => q.status === 'Sent'),
      followUp: quotes.filter(q => q.status === 'Follow-up'),
      confirmed: quotes.filter(q => q.status === 'Confirmed'),
      lost: quotes.filter(q => q.status === 'Lost')
    };
    const pipelineValue = quotesActive.reduce((s, q) => {
      return s + ((q.priceStudent || 0) * (q.numStudents || 0)) +
        ((q.priceSibling || 0) * (q.numSiblings || 0)) +
        ((q.priceAdult || 0) * (q.numAdults || 0));
    }, 0);
    const totalConfirmedRevenue = tours.reduce((s, t) => s + ((t.costs && t.costs.totalRevenue) || 0), 0);
    const totalConfirmedProfit = tours.reduce((s, t) => s + ((t.costs && t.costs.profit) || 0), 0);
    const totalOutstanding = invoices.reduce((s, i) => {
      const paid = (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0);
      return s + Math.max(0, Number(i.amount) - paid);
    }, 0);

    // === RENDER ===
    container.innerHTML = `
      <!-- Header -->
      <div class="briefing-header">
        <div>
          <h1 class="briefing-greeting">${greeting}, Juan</h1>
          <p class="briefing-date">${dateStr}</p>
        </div>
        <div class="briefing-quick-stats">
          <div class="bqs-item">
            <span class="bqs-value">${urgent.length}</span>
            <span class="bqs-label">Urgent</span>
          </div>
          <div class="bqs-item">
            <span class="bqs-value">${todayActions.length}</span>
            <span class="bqs-label">Actions</span>
          </div>
          <div class="bqs-item">
            <span class="bqs-value">${quotesActive.length}</span>
            <span class="bqs-label">Open Quotes</span>
          </div>
          <div class="bqs-item">
            <span class="bqs-value">${tours.filter(t => t.status !== 'Completed').length}</span>
            <span class="bqs-label">Active Tours</span>
          </div>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="briefing-kpi-row">
        <div class="briefing-kpi green">
          <div class="bkpi-label">Confirmed Revenue</div>
          <div class="bkpi-value">${fmt(totalConfirmedRevenue)}</div>
          <div class="bkpi-sub">${tours.length} tour${tours.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="briefing-kpi ${totalConfirmedProfit >= 0 ? 'green' : 'red'}">
          <div class="bkpi-label">Expected Profit</div>
          <div class="bkpi-value">${fmt(totalConfirmedProfit)}</div>
          <div class="bkpi-sub">${totalConfirmedRevenue > 0 ? (totalConfirmedProfit / totalConfirmedRevenue * 100).toFixed(1) + '% margin' : '—'}</div>
        </div>
        <div class="briefing-kpi amber">
          <div class="bkpi-label">Pipeline Value</div>
          <div class="bkpi-value">${fmt(pipelineValue)}</div>
          <div class="bkpi-sub">${quotesActive.length} active quote${quotesActive.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="briefing-kpi ${totalOutstanding > 0 ? 'red' : 'green'}">
          <div class="bkpi-label">Outstanding</div>
          <div class="bkpi-value">${fmt(totalOutstanding)}</div>
          <div class="bkpi-sub">${invoices.filter(i => { const p = (i.payments||[]).reduce((s,x)=>s+Number(x.amount),0); return p < Number(i.amount); }).length} unpaid invoices</div>
        </div>
      </div>

      <!-- Urgent Section -->
      ${urgent.length ? `
        <div class="briefing-section urgent">
          <div class="bs-header">
            <h2>URGENT</h2>
            <span class="bs-count">${urgent.length}</span>
          </div>
          <div class="bs-items">
            ${urgent.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)).map(u => `
              <div class="bs-item ${u.severity}" onclick="${u.action}">
                <span class="bs-icon">${u.icon}</span>
                <div class="bs-text">
                  <div class="bs-title">${u.title}</div>
                  <div class="bs-detail">${u.detail}</div>
                </div>
                <svg class="bs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="briefing-section all-clear">
          <div class="bs-header"><h2>ALL CLEAR</h2></div>
          <p class="all-clear-msg">No urgent items today. Great work!</p>
        </div>
      `}

      <!-- Today's Actions -->
      ${todayActions.length ? `
        <div class="briefing-section today">
          <div class="bs-header">
            <h2>TODAY</h2>
            <span class="bs-count">${todayActions.length}</span>
          </div>
          <div class="bs-items">
            ${todayActions.map(a => `
              <div class="bs-item" onclick="${a.action}">
                <span class="bs-icon">${a.icon}</span>
                <div class="bs-text">
                  <div class="bs-title">${a.title}</div>
                  <div class="bs-detail">${a.detail}</div>
                </div>
                <svg class="bs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Portal Checklist Alerts -->
      <div id="briefing-portal-alerts"></div>

      <!-- This Week -->
      <div class="briefing-section week">
        <div class="bs-header"><h2>THIS WEEK</h2></div>
        <div class="briefing-week-grid">
          <div class="bw-card" onclick="App.switchTab('tours')">
            <div class="bw-icon">\u{1F30D}</div>
            <div class="bw-value">${toursThisWeek.length}</div>
            <div class="bw-label">Tours departing</div>
            ${toursThisWeek.length ? '<div class="bw-detail">' + toursThisWeek.map(t => t.tourName).join(', ') + '</div>' : ''}
          </div>
          <div class="bw-card" onclick="App.switchTab('crm')">
            <div class="bw-icon">\u{1F4CB}</div>
            <div class="bw-value">${quotesActive.length}</div>
            <div class="bw-label">Quotes to chase</div>
            <div class="bw-detail">${pipelineByStatus.sent.length} sent, ${pipelineByStatus.followUp.length} follow-up</div>
          </div>
          <div class="bw-card" onclick="App.switchTab('invoicing')">
            <div class="bw-icon">\u{1F4B3}</div>
            <div class="bw-value">${invoicesDueThisWeek.length}</div>
            <div class="bw-label">Payments due</div>
            <div class="bw-detail">${fmt(invoicesDueThisWeek.reduce((s, i) => { const p = (i.payments||[]).reduce((ps,x)=>ps+Number(x.amount),0); return s + Number(i.amount) - p; }, 0))} total</div>
          </div>
          <div class="bw-card" onclick="App.switchTab('clients')">
            <div class="bw-icon">\u{1F465}</div>
            <div class="bw-value">${clients.length}</div>
            <div class="bw-label">Total clients</div>
            <div class="bw-detail">${quotes.filter(q => { const d = new Date(q.createdAt); return (today - d) < 7 * 86400000; }).length} new quotes this week</div>
          </div>
        </div>
      </div>

      <!-- Pipeline Breakdown -->
      <div class="briefing-section pipeline">
        <div class="bs-header"><h2>PIPELINE</h2></div>
        <div class="briefing-pipeline">
          <div class="bp-stage" onclick="App.switchTab('crm')">
            <div class="bp-bar" style="--pct:${quotes.length ? (pipelineByStatus.draft.length / quotes.length * 100) : 0}%;--color:var(--gray-400)"></div>
            <div class="bp-info">
              <span class="bp-count">${pipelineByStatus.draft.length}</span>
              <span class="bp-label">Draft</span>
            </div>
          </div>
          <div class="bp-stage" onclick="App.switchTab('crm')">
            <div class="bp-bar" style="--pct:${quotes.length ? (pipelineByStatus.sent.length / quotes.length * 100) : 0}%;--color:var(--blue)"></div>
            <div class="bp-info">
              <span class="bp-count">${pipelineByStatus.sent.length}</span>
              <span class="bp-label">Sent</span>
            </div>
          </div>
          <div class="bp-stage" onclick="App.switchTab('crm')">
            <div class="bp-bar" style="--pct:${quotes.length ? (pipelineByStatus.followUp.length / quotes.length * 100) : 0}%;--color:var(--amber)"></div>
            <div class="bp-info">
              <span class="bp-count">${pipelineByStatus.followUp.length}</span>
              <span class="bp-label">Follow-up</span>
            </div>
          </div>
          <div class="bp-stage" onclick="App.switchTab('crm')">
            <div class="bp-bar" style="--pct:${quotes.length ? (pipelineByStatus.confirmed.length / quotes.length * 100) : 0}%;--color:var(--green)"></div>
            <div class="bp-info">
              <span class="bp-count">${pipelineByStatus.confirmed.length}</span>
              <span class="bp-label">Confirmed</span>
            </div>
          </div>
          <div class="bp-stage" onclick="App.switchTab('crm')">
            <div class="bp-bar" style="--pct:${quotes.length ? (pipelineByStatus.lost.length / quotes.length * 100) : 0}%;--color:var(--red)"></div>
            <div class="bp-info">
              <span class="bp-count">${pipelineByStatus.lost.length}</span>
              <span class="bp-label">Lost</span>
            </div>
          </div>
        </div>
        ${quotes.length ? `<div class="bp-conversion">Conversion rate: <strong>${(pipelineByStatus.confirmed.length / quotes.length * 100).toFixed(0)}%</strong></div>` : ''}
      </div>

      <!-- Suggested Priority Order -->
      <div class="briefing-section priorities">
        <div class="bs-header"><h2>SUGGESTED PRIORITIES</h2></div>
        <div class="briefing-priorities">
          ${this._buildPriorities(urgent, todayActions, toursThisWeek, invoicesDueThisWeek, quotesActive)}
        </div>
      </div>
    `;

    // Load portal checklist progress asynchronously
    if (portalChecklistTours.length && DB._firebaseReady) {
      this._loadPortalAlerts(portalChecklistTours, today);
    }
  },

  async _loadPortalAlerts(portalTours, today) {
    const el = document.getElementById('briefing-portal-alerts');
    if (!el) return;

    const alerts = [];
    for (const t of portalTours) {
      try {
        const tourIdStr = String(t.id);
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
        const sigEntries = Object.keys(sigs);
        let formsSigned = 0, formsExpected = 0;
        if (sigEntries.length > 0) {
          sigEntries.forEach(code => {
            const ms = sigs[code] || {};
            formsExpected += requiredForms.length;
            formsSigned += requiredForms.filter(f => ms[f]).length;
          });
        }
        const formsOk = sigEntries.length > 0 && formsSigned >= formsExpected;

        const items = [
          { done: paxOk, label: 'Passengers', short: expectedPax ? `${paxCount}/${expectedPax}` : `${paxCount}` },
          { done: !!flightsOk, label: 'Flights' },
          { done: roomOk, label: 'Rooms' },
          { done: formsOk, label: 'Forms', short: sigEntries.length > 0 ? `${formsSigned}/${formsExpected}` : '0' }
        ];
        const doneCount = items.filter(i => i.done).length;
        if (doneCount < items.length) {
          const start = new Date(t.startDate);
          const daysUntil = Math.ceil((start - today) / 86400000);
          const missing = items.filter(i => !i.done).map(i => i.short ? `${i.label} (${i.short})` : i.label).join(', ');
          alerts.push({
            tourId: t.id,
            tourName: t.tourName,
            daysUntil,
            doneCount,
            total: items.length,
            missing,
            severity: daysUntil <= 7 ? 'critical' : daysUntil <= 30 ? 'high' : 'medium'
          });
        }
      } catch (e) {}
    }

    if (!alerts.length) return;
    alerts.sort((a, b) => a.daysUntil - b.daysUntil);

    el.innerHTML = `
      <div class="briefing-section" style="border-left:4px solid var(--amber)">
        <div class="bs-header">
          <h2>PORTAL CHECKLIST ALERTS</h2>
          <span class="bs-count">${alerts.length}</span>
        </div>
        <div class="bs-items">
          ${alerts.map(a => {
            const pct = Math.round(a.doneCount / a.total * 100);
            const sevColor = a.severity === 'critical' ? 'var(--red)' : a.severity === 'high' ? 'var(--amber)' : 'var(--blue)';
            return `
            <div class="bs-item ${a.severity}" onclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${a.tourId}),100)" style="cursor:pointer">
              <span class="bs-icon">\u{1F4CB}</span>
              <div class="bs-text">
                <div class="bs-title">${a.tourName} — ${a.daysUntil} day${a.daysUntil !== 1 ? 's' : ''} to departure</div>
                <div class="bs-detail">Portal ${a.doneCount}/${a.total} complete (${pct}%). Missing: ${a.missing}</div>
              </div>
              <svg class="bs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  _buildPriorities(urgent, todayActions, toursThisWeek, invoicesDueThisWeek, quotesActive) {
    const priorities = [];
    let rank = 1;

    // 1. Critical urgent items first
    urgent.filter(u => u.severity === 'critical').forEach(u => {
      priorities.push({ rank: rank++, text: u.title, detail: u.detail, action: u.action, tag: 'URGENT', tagColor: 'var(--red)' });
    });

    // 2. Remaining urgent
    urgent.filter(u => u.severity !== 'critical').forEach(u => {
      priorities.push({ rank: rank++, text: u.title, detail: u.detail, action: u.action, tag: 'URGENT', tagColor: 'var(--red)' });
    });

    // 3. Today's follow-ups
    todayActions.filter(a => a.type === 'follow-up').forEach(a => {
      priorities.push({ rank: rank++, text: a.title, detail: a.detail, action: a.action, tag: 'FOLLOW UP', tagColor: 'var(--amber)' });
    });

    // 4. Payment actions
    todayActions.filter(a => a.type === 'payment').forEach(a => {
      priorities.push({ rank: rank++, text: a.title, detail: a.detail, action: a.action, tag: 'PAYMENT', tagColor: 'var(--blue)' });
    });

    // 5. Tour prep
    todayActions.filter(a => a.type === 'preparation').forEach(a => {
      priorities.push({ rank: rank++, text: a.title, detail: a.detail, action: a.action, tag: 'PREPARE', tagColor: 'var(--green)' });
    });

    // 6. Provider chasing
    todayActions.filter(a => a.type === 'provider').forEach(a => {
      priorities.push({ rank: rank++, text: a.title, detail: a.detail, action: a.action, tag: 'PROVIDER', tagColor: 'var(--navy)' });
    });

    if (!priorities.length) {
      return '<div class="all-clear-msg">No pending priorities. You\'re all caught up! Consider working on new quotes or marketing.</div>';
    }

    return priorities.slice(0, 10).map(p => `
      <div class="bp-item" onclick="${p.action}">
        <span class="bp-rank">${p.rank}</span>
        <div class="bp-text">
          <div class="bp-text-title">${p.text}</div>
          <div class="bp-text-detail">${p.detail}</div>
        </div>
        <span class="bp-tag" style="--tag-color:${p.tagColor}">${p.tag}</span>
        <svg class="bs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    `).join('');
  }
};
