/* === DASHBOARD MODULE === */
const Dashboard = {
  init() { this.render(); },

  render() {
    let quotes = DB.getQuotes();
    let tours = DB.getTours();
    let invoices = DB.getInvoices();
    const clients = DB.getClients();

    // Date range filter
    const period = document.getElementById('dash-period')?.value || 'all';
    const fromEl = document.getElementById('dash-date-from');
    const toEl = document.getElementById('dash-date-to');
    if (fromEl && toEl) {
      fromEl.style.display = period === 'custom' ? '' : 'none';
      toEl.style.display = period === 'custom' ? '' : 'none';
    }
    let dateFrom = null, dateTo = null;
    const now = new Date();
    if (period === 'year') { dateFrom = new Date(now.getFullYear(), 0, 1); }
    else if (period === 'quarter') { const q = Math.floor(now.getMonth() / 3); dateFrom = new Date(now.getFullYear(), q * 3, 1); }
    else if (period === 'month') { dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (period === 'custom') { dateFrom = fromEl?.value ? new Date(fromEl.value) : null; dateTo = toEl?.value ? new Date(toEl.value + 'T23:59:59') : null; }

    // Apply date filter to tours (by startDate) and invoices (by createdAt)
    if (dateFrom || dateTo) {
      tours = tours.filter(t => {
        const d = new Date(t.startDate);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
      invoices = invoices.filter(i => {
        const d = new Date(i.createdAt);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
      quotes = quotes.filter(q => {
        const d = new Date(q.createdAt);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    // Multi-currency normalization
    const dashCurrency = document.getElementById('dash-currency')?.value || '';
    const rates = this._liveRates || { EUR: 1, USD: 1.08, GBP: 0.86 };
    const normalize = (amount, fromCurrency) => {
      if (!dashCurrency || !fromCurrency || fromCurrency === dashCurrency) return amount;
      const inEUR = amount / (rates[fromCurrency] || 1);
      return inEUR * (rates[dashCurrency] || 1);
    };
    const dashFmt = (amount, originalCurrency) => {
      const cur = dashCurrency || originalCurrency || 'EUR';
      const normalized = normalize(amount, originalCurrency);
      return fmt(normalized, cur);
    };

    // Invoice metrics
    const pendingPayments = invoices.filter(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      return paid < Number(i.amount);
    });
    const totalInvoiced = invoices.reduce((s, i) => s + normalize(Number(i.amount || 0), i.currency), 0);
    const totalCollected = invoices.reduce((s, i) => s + normalize((i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), i.currency), 0);
    const outstanding = totalInvoiced - totalCollected;

    // Expected profit: all confirmed tours
    let totalRevenue = 0, totalCosts = 0, expectedProfit = 0;
    tours.forEach(t => {
      if (t.costs) {
        totalRevenue += normalize(t.costs.totalRevenue || 0, t.currency);
        totalCosts += normalize(t.costs.grand || 0, t.currency);
        expectedProfit += normalize(t.costs.profit || 0, t.currency);
      }
    });

    // Final profit: only completed tours (actual provider costs if available)
    const completedTours = tours.filter(t => t.status === 'Completed');
    let finalRevenue = 0, finalCosts = 0, finalProfit = 0;
    completedTours.forEach(t => {
      const rev = t.costs ? (t.costs.totalRevenue || 0) : 0;
      const actualProvCosts = (t.providerExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const estimatedCosts = t.costs ? (t.costs.grand || 0) : 0;
      // Use actual provider costs if tracked, otherwise estimated
      const costs = actualProvCosts > 0 ? actualProvCosts : estimatedCosts;
      finalRevenue += normalize(rev, t.currency);
      finalCosts += normalize(costs, t.currency);
      finalProfit += normalize(rev - costs, t.currency);
    });

    // Pipeline profit: quotes in Follow-up status
    const followUpQuotes = quotes.filter(q => q.status === 'Follow-up');
    let pipelineProfit = 0, pipelineRevenue = 0;
    followUpQuotes.forEach(q => {
      const rev = ((q.priceStudent||0)*(q.numStudents||0)) + ((q.priceSibling||0)*(q.numSiblings||0)) + ((q.priceAdult||0)*(q.numAdults||0));
      const cost = q.costs ? (q.costs.grand || 0) : 0;
      pipelineRevenue += normalize(rev, q.currency);
      pipelineProfit += normalize(rev - cost, q.currency);
    });

    // Traveler counts
    let totalTravelers = 0, totalStudents = 0, totalSiblings = 0, totalAdults = 0, totalFOC = 0;
    tours.forEach(t => {
      totalStudents += (t.numStudents || 0);
      totalSiblings += (t.numSiblings || 0);
      totalAdults += (t.numAdults || 0);
      totalFOC += (t.numFOC || 0);
    });
    totalTravelers = totalStudents + totalSiblings + totalAdults + totalFOC;

    // Quote pipeline
    const quoteDraft = quotes.filter(q => q.status === 'Draft').length;
    const quoteSent = quotes.filter(q => q.status === 'Sent').length;
    const quoteFollowUp = quotes.filter(q => q.status === 'Follow-up').length;
    const quoteConfirmed = quotes.filter(q => q.status === 'Confirmed').length;
    const quoteLost = quotes.filter(q => q.status === 'Lost').length;
    const conversionRate = quotes.length > 0 ? ((quoteConfirmed / quotes.length) * 100).toFixed(0) : 0;

    // Tour status
    const toursPreparing = tours.filter(t => t.status === 'Preparing').length;
    const toursInProgress = tours.filter(t => t.status === 'In Progress').length;
    const toursCompleted = tours.filter(t => t.status === 'Completed').length;

    // Provider expenses totals
    let providerOwed = 0, providerPaid = 0;
    tours.forEach(t => {
      (t.providerExpenses || []).forEach(e => {
        providerOwed += normalize(e.amount || 0, t.currency);
        providerPaid += normalize(e.paidAmount || 0, t.currency);
      });
    });
    const displayCur = dashCurrency || 'EUR';

    // Stats cards — 3 rows
    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card amber"><div class="stat-label">Total Quotes</div><div class="stat-value">${quotes.length}</div><div class="stat-sub">${quoteDraft} draft, ${quoteSent} sent, ${quoteFollowUp} follow-up</div></div>
      <div class="stat-card green"><div class="stat-label">Confirmed Tours</div><div class="stat-value">${tours.length}</div><div class="stat-sub">${toursPreparing} preparing, ${toursInProgress} active, ${toursCompleted} done</div></div>
      <div class="stat-card blue"><div class="stat-label">Total Travelers</div><div class="stat-value">${totalTravelers}</div><div class="stat-sub">${totalStudents} students, ${totalSiblings} siblings, ${totalAdults} adults, ${totalFOC} FOC</div></div>
      <div class="stat-card amber"><div class="stat-label">Conversion Rate</div><div class="stat-value">${conversionRate}%</div><div class="stat-sub">${quoteConfirmed} confirmed / ${quotes.length} quotes${quoteLost ? ', ' + quoteLost + ' lost' : ''}</div></div>
      <div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">${fmt(totalRevenue, displayCur)}</div><div class="stat-sub">From ${tours.length} confirmed tour${tours.length!==1?'s':''}</div></div>
      <div class="stat-card red"><div class="stat-label">Total Costs</div><div class="stat-value">${fmt(totalCosts, displayCur)}</div><div class="stat-sub">Providers owed: ${fmt(providerOwed, displayCur)} (${fmt(providerPaid, displayCur)} paid)</div></div>
      <div class="stat-card" style="border-left-color:var(--amber)"><div class="stat-label">Pipeline Profit</div><div class="stat-value" style="color:var(--amber)">${fmt(pipelineProfit, displayCur)}</div><div class="stat-sub">${followUpQuotes.length} follow-up quote${followUpQuotes.length!==1?'s':''} — rev: ${fmt(pipelineRevenue, displayCur)}</div></div>
      <div class="stat-card" style="border-left-color:${expectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}"><div class="stat-label">Expected Profit</div><div class="stat-value" style="color:${expectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(expectedProfit, displayCur)}</div><div class="stat-sub">All ${tours.length} confirmed tours — margin: ${totalRevenue > 0 ? (expectedProfit / totalRevenue * 100).toFixed(1) + '%' : '—'}</div></div>
      <div class="stat-card" style="border-left-color:${finalProfit >= 0 ? 'var(--green)' : 'var(--red)'}"><div class="stat-label">Final Profit</div><div class="stat-value" style="color:${finalProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(finalProfit, displayCur)}</div><div class="stat-sub">${completedTours.length} completed tour${completedTours.length!==1?'s':''} — margin: ${finalRevenue > 0 ? (finalProfit / finalRevenue * 100).toFixed(1) + '%' : '—'}</div></div>
      <div class="stat-card blue"><div class="stat-label">Cash Flow</div><div class="stat-value" style="color:${outstanding > 0 ? 'var(--red)' : 'var(--green)'}">${fmt(outstanding, displayCur)}</div><div class="stat-sub">outstanding of ${fmt(totalInvoiced, displayCur)} invoiced (${fmt(totalCollected, displayCur)} collected)</div></div>
      <div class="stat-card amber"><div class="stat-label">Clients</div><div class="stat-value">${clients.length}</div><div class="stat-sub">${pendingPayments.length} pending payment${pendingPayments.length!==1?'s':''}</div></div>
    `;

    // Recent quotes
    const recent = [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    document.getElementById('dashboard-recent-quotes').innerHTML = recent.length
      ? recent.map(q => `<div class="list-item"><div><div class="li-title">${q.tourName || 'Untitled'}</div><div class="li-sub">${q.clientName || 'No client'} — ${q.destination || ''}</div></div><span class="badge ${badgeClass(q.status)}">${q.status || 'Draft'}</span></div>`).join('')
      : '<div class="empty-state">No quotes yet. Create your first quote!</div>';

    // Upcoming tours
    const upcoming = tours.filter(t => t.status === 'Preparing' || t.status === 'In Progress')
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    document.getElementById('dashboard-upcoming-tours').innerHTML = upcoming.length
      ? upcoming.map(t => `<div class="list-item"><div><div class="li-title">${t.tourName}</div><div class="li-sub">${t.destination} — ${fmtDate(t.startDate)}</div></div><span class="badge ${badgeClass(t.status)}">${t.status}</span></div>`).join('')
      : '<div class="empty-state">No upcoming tours</div>';

    // Overdue payments
    const overdue = invoices.filter(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      return paid < Number(i.amount) && isOverdue(i.dueDate);
    });
    document.getElementById('dashboard-overdue').innerHTML = overdue.length
      ? overdue.map(i => {
          const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          const bal = Number(i.amount) - paid;
          const daysPast = Math.floor((new Date() - new Date(i.dueDate)) / 86400000);
          return `<div class="list-item" style="flex-wrap:wrap">
            <div><div class="li-title">${i.number} — ${i.clientName}</div><div class="li-sub overdue">Due: ${fmtDate(i.dueDate)} (${daysPast} days overdue)</div></div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <div class="li-amount">${fmt(bal, i.currency)}</div>
              <button class="btn btn-sm btn-outline" style="border-color:var(--amber);color:var(--amber);font-size:0.75rem" onclick="Dashboard.sendReminder(${i.id})">Send Reminder</button>
            </div>
          </div>`;
        }).join('')
      : '<div class="empty-state">No overdue payments</div>';

    // Automated action queue
    this._renderActionQueue(quotes, tours, invoices);

    // Confirmed groups profit summary table
    this._renderConfirmedGroups(tours);

    // Profit margin alerts
    this._renderProfitAlerts(tours);

    // Provider payment alerts
    this._renderProviderAlerts(tours);

    // Portal notification badges (async, non-blocking)
    this._renderPortalBadges(tours);

    // Feedback summary (async, non-blocking)
    this._renderFeedbackSummary(tours);

    // Weather widget (async, non-blocking)
    this._renderWeatherWidget(tours);

    // Fetch live rates and re-render currency display
    if (!this._ratesFetched) {
      this._ratesFetched = true;
      this._fetchLiveRates().then(liveRates => {
        this._liveRates = liveRates;
        this._ratesFetched = false;
        // Update the rate display
        const rateDisplay = document.getElementById('dashboard-live-rates');
        if (rateDisplay) {
          const lastUpdated = localStorage.getItem('odisea_exchange_rates_time');
          const timeStr = lastUpdated ? new Date(Number(lastUpdated)).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'N/A';
          rateDisplay.innerHTML = '<span style="font-size:0.78rem;color:var(--gray-400)">Live rates: 1 EUR = ' + liveRates.USD.toFixed(4) + ' USD | ' + liveRates.GBP.toFixed(4) + ' GBP | Updated: ' + timeStr + '</span>';
        }
      });
    }
  },

  async _fetchLiveRates() {
    const cacheKey = 'odisea_exchange_rates';
    const cacheTimeKey = 'odisea_exchange_rates_time';
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const fourHours = 4 * 60 * 60 * 1000;

    if (cached && cachedTime && (Date.now() - Number(cachedTime)) < fourHours) {
      return JSON.parse(cached);
    }

    try {
      const resp = await fetch('https://open.er-exchangerate-api.com/v6/latest/EUR');
      const data = await resp.json();
      if (data && data.rates) {
        const rates = { EUR: 1, USD: data.rates.USD || 1.08, GBP: data.rates.GBP || 0.86 };
        localStorage.setItem(cacheKey, JSON.stringify(rates));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
        return rates;
      }
    } catch (e) {
      console.warn('Exchange rate fetch failed:', e.message);
    }

    if (cached) return JSON.parse(cached);
    return { EUR: 1, USD: 1.08, GBP: 0.86 };
  },

  sendReminder(invoiceId) {
    const i = DB.getInvoices().find(x => x.id === invoiceId);
    if (!i) return;
    const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Number(i.amount) - paid;
    const email = i.clientEmail || '';
    if (!email) { alert('No email on this invoice. Add one in the invoice view first.'); return; }
    const subject = 'Payment Reminder — ' + (i.number || '');
    const body = `Dear ${i.clientName || 'Client'},\n\nThis is a friendly reminder that invoice ${i.number} has an outstanding balance of ${fmt(balance, i.currency)}.\n\nInvoice: ${i.number}\nTotal: ${fmt(i.amount, i.currency)}\nPaid: ${fmt(paid, i.currency)}\nBalance Due: ${fmt(balance, i.currency)}\nDue Date: ${fmtDate(i.dueDate)}\n${i.paymentLinkCard ? '\nPay by card: ' + i.paymentLinkCard : ''}${i.paymentLinkWise ? '\nPay by Wise: ' + i.paymentLinkWise : ''}\n\nPlease arrange payment at your earliest convenience.\n\nKind regards,\nJuan\nOdisea Tours\njuan@odisea-tours.com`;
    Email.sendEmail(email, subject, body);
  },

  async _renderPortalBadges(tours) {
    const container = document.getElementById('dashboard-portal-activity');
    if (!DB._firebaseReady || !tours.length) {
      if (container) container.innerHTML = '<div class="empty-state">Firebase not connected or no tours yet.</div>';
      return;
    }
    if (container) container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.85rem">Loading portal data...</div>';
    try {
      let totalMessages = 0, totalPassengers = 0;
      const tourData = [];
      for (const t of tours) {
        const tid = String(t.id);
        const [paxSnap, msgSnap] = await Promise.all([
          DB.firestore.collection('tours').doc(tid).collection('passengers').get(),
          DB.firestore.collection('tours').doc(tid).collection('messages').get()
        ]);
        const paxCount = paxSnap.size;
        const completeCount = paxSnap.docs.filter(d => {
          const p = d.data();
          return p.firstName && p.lastName && p.dateOfBirth && p.nationality && p.passportNumber;
        }).length;
        const clientMsgCount = msgSnap.docs.filter(d => d.data().sender !== 'admin').length;
        const totalMsgCount = msgSnap.size;
        totalPassengers += paxCount;
        totalMessages += clientMsgCount;
        const expected = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
        tourData.push({ tour: t, paxCount, completeCount, clientMsgCount, totalMsgCount, expected });
        // Update badges in tour view if visible
        const msgBadge = document.getElementById('msg-badge-' + t.id);
        if (msgBadge && clientMsgCount > 0) {
          msgBadge.textContent = clientMsgCount;
          msgBadge.style.display = 'inline-block';
        }
        const paxBadge = document.getElementById('pax-badge-' + t.id);
        if (paxBadge && paxCount > 0) {
          paxBadge.textContent = paxCount;
          paxBadge.style.display = 'inline-block';
        }
      }

      // Render portal activity table
      if (container) {
        const hasActivity = tourData.some(d => d.paxCount > 0 || d.totalMsgCount > 0 || d.tour.accessCode);
        if (!hasActivity) {
          container.innerHTML = '<div class="empty-state">No portal activity yet. Generate access codes from tour details to enable the client portal.</div>';
        } else {
          container.innerHTML = `
            <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
              <div style="background:linear-gradient(135deg,var(--blue),#2471a3);color:white;padding:0.8rem 1.2rem;border-radius:var(--radius-lg);flex:1;min-width:140px">
                <div style="font-size:0.75rem;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em">Total Registrations</div>
                <div style="font-size:1.5rem;font-weight:700;margin-top:0.2rem">${totalPassengers}</div>
              </div>
              <div style="background:linear-gradient(135deg,var(--amber),var(--amber-dark));color:white;padding:0.8rem 1.2rem;border-radius:var(--radius-lg);flex:1;min-width:140px">
                <div style="font-size:0.75rem;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em">Client Messages</div>
                <div style="font-size:1.5rem;font-weight:700;margin-top:0.2rem">${totalMessages}</div>
              </div>
              <div style="background:linear-gradient(135deg,var(--green),#1e8449);color:white;padding:0.8rem 1.2rem;border-radius:var(--radius-lg);flex:1;min-width:140px">
                <div style="font-size:0.75rem;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em">Active Portals</div>
                <div style="font-size:1.5rem;font-weight:700;margin-top:0.2rem">${tourData.filter(d => d.tour.accessCode).length}</div>
              </div>
            </div>
            <table class="data-table" style="font-size:0.85rem">
              <thead><tr>
                <th>Tour</th><th>Access Code</th><th>Registrations</th><th>Progress</th><th>Data Complete</th><th>Messages</th><th></th>
              </tr></thead>
              <tbody>${tourData.filter(d => d.tour.accessCode || d.paxCount > 0).map(d => {
                const pct = d.expected > 0 ? Math.min(100, Math.round(d.paxCount / d.expected * 100)) : 0;
                const barColor = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
                return `<tr class="row-clickable" ondblclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${d.tour.id}),100)">
                  <td><strong>${d.tour.tourName || '—'}</strong></td>
                  <td>${d.tour.accessCode ? '<code style="font-family:monospace;font-size:0.82rem;font-weight:600;background:var(--gray-50);padding:0.15rem 0.4rem;border-radius:4px">' + d.tour.accessCode + '</code>' : '<span style="color:var(--gray-300)">—</span>'}</td>
                  <td><strong>${d.paxCount}</strong>${d.expected ? ' / ' + d.expected : ''}</td>
                  <td style="min-width:100px">${d.expected ? '<div style="background:var(--gray-100);border-radius:10px;height:8px;overflow:hidden"><div style="background:' + barColor + ';height:100%;width:' + pct + '%;border-radius:10px;transition:width 0.5s"></div></div><span style="font-size:0.72rem;color:var(--gray-400)">' + pct + '%</span>' : '<span style="color:var(--gray-300)">—</span>'}</td>
                  <td style="min-width:90px">${d.paxCount > 0 ? (() => { const cPct = Math.round(d.completeCount / d.paxCount * 100); const cColor = cPct >= 100 ? 'var(--green)' : cPct >= 50 ? 'var(--amber)' : 'var(--red)'; return '<strong>' + d.completeCount + '</strong> / ' + d.paxCount + '<div style="background:var(--gray-100);border-radius:10px;height:6px;overflow:hidden;margin-top:2px"><div style="background:' + cColor + ';height:100%;width:' + cPct + '%;border-radius:10px;transition:width 0.5s"></div></div><span style="font-size:0.72rem;color:var(--gray-400)">' + cPct + '% complete</span>'; })() : '<span style="color:var(--gray-300)">—</span>'}</td>
                  <td>${d.totalMsgCount > 0 ? '<span style="font-weight:600">' + d.totalMsgCount + '</span>' + (d.clientMsgCount > 0 ? ' <span style="background:var(--red);color:white;font-size:0.68rem;font-weight:700;padding:0.1rem 0.35rem;border-radius:8px">' + d.clientMsgCount + ' from client</span>' : '') : '<span style="color:var(--gray-300)">0</span>'}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${d.tour.id}),100)">View</button></td>
                </tr>`;
              }).join('')}</tbody>
            </table>`;
        }
      }
    } catch (e) {
      if (container) container.innerHTML = '<div class="empty-state">Could not load portal data.</div>';
    }
  },

  _renderConfirmedGroups(tours) {
    const container = document.getElementById('dashboard-confirmed-groups');
    if (!tours.length) {
      container.innerHTML = '<div class="empty-state">No confirmed tours yet.</div>';
      return;
    }

    const sorted = [...tours].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    container.innerHTML = `
      <table class="data-table" style="font-size:0.85rem">
        <thead><tr>
          <th>Tour</th><th>Client</th><th>Dates</th><th>Pax</th><th>Cost</th><th>Revenue</th><th>Profit</th><th>Margin</th>
        </tr></thead>
        <tbody>${sorted.map(t => {
          const c = t.costs || {};
          const students = t.numStudents || 0;
          const siblings = t.numSiblings || 0;
          const adults = t.numAdults || 0;
          const foc = t.numFOC || 0;
          const groupSize = students + siblings + adults + foc;
          const profit = c.profit || 0;
          const margin = c.margin || 0;
          return `<tr class="row-clickable" ondblclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)">
            <td><strong>${t.tourName || '—'}</strong></td>
            <td>${t.clientName || '—'}</td>
            <td>${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</td>
            <td title="${students} students, ${siblings} siblings, ${adults} adults, ${foc} FOC">${groupSize}</td>
            <td>${fmt(c.grand || 0, t.currency)}</td>
            <td>${fmt(c.totalRevenue || 0, t.currency)}</td>
            <td style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fmt(profit, t.currency)}</td>
            <td style="color:${margin >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${margin.toFixed(1)}%</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr style="font-weight:700;border-top:2px solid var(--gray-200)">
          <td colspan="4">TOTALS</td>
          <td>${fmt(tours.reduce((s, t) => s + ((t.costs && t.costs.grand) || 0), 0))}</td>
          <td>${fmt(tours.reduce((s, t) => s + ((t.costs && t.costs.totalRevenue) || 0), 0))}</td>
          <td style="color:${tours.reduce((s, t) => s + ((t.costs && t.costs.profit) || 0), 0) >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(tours.reduce((s, t) => s + ((t.costs && t.costs.profit) || 0), 0))}</td>
          <td>${(() => { const rev = tours.reduce((s, t) => s + ((t.costs && t.costs.totalRevenue) || 0), 0); const prof = tours.reduce((s, t) => s + ((t.costs && t.costs.profit) || 0), 0); return rev > 0 ? (prof / rev * 100).toFixed(1) + '%' : '—'; })()}</td>
        </tr></tfoot>
      </table>`;
  },

  _renderProviderAlerts(tours) {
    const container = document.getElementById('dashboard-provider-alerts');
    const alerts = [];

    tours.forEach(t => {
      const expenses = t.providerExpenses || [];
      if (!expenses.length) return;
      const unpaid = expenses.filter(e => !e.paid);
      const pendingInvoices = expenses.filter(e => !e.invoiceReceived);
      const unpaidTotal = unpaid.reduce((s, e) => s + (e.amount || 0), 0);
      if (unpaid.length || pendingInvoices.length) {
        alerts.push({
          tour: t,
          unpaidCount: unpaid.length,
          unpaidTotal,
          pendingInvoiceCount: pendingInvoices.length,
          totalExpenses: expenses.length
        });
      }
    });

    if (!alerts.length) {
      container.innerHTML = '<div class="empty-state">All provider payments up to date — or no provider expenses tracked yet.</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table" style="font-size:0.85rem">
        <thead><tr>
          <th>Tour</th><th>Providers</th><th>Unpaid</th><th>Amount Due</th><th>Invoices Pending</th><th></th>
        </tr></thead>
        <tbody>${alerts.map(a => `<tr class="row-clickable" ondblclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${a.tour.id}),100)">
          <td><strong>${a.tour.tourName}</strong></td>
          <td>${a.totalExpenses}</td>
          <td><span style="color:var(--red);font-weight:600">${a.unpaidCount}</span> / ${a.totalExpenses}</td>
          <td style="font-weight:600;color:var(--red)">${fmt(a.unpaidTotal, a.tour.currency)}</td>
          <td>${a.pendingInvoiceCount > 0 ? `<span style="color:var(--amber);font-weight:600">${a.pendingInvoiceCount} pending</span>` : '<span style="color:var(--green)">All received</span>'}</td>
          <td><button class="btn btn-sm btn-outline" onclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${a.tour.id}),100)">View</button></td>
        </tr>`).join('')}</tbody>
      </table>`;
  },

  _renderActionQueue(quotes, tours, invoices) {
    const container = document.getElementById('dashboard-actions');
    if (!container) return;

    const actions = [];
    const now = new Date();
    const completedActions = JSON.parse(localStorage.getItem('odisea_completed_actions') || '{}');

    // Quotes sent 3+ days ago without follow-up
    quotes.filter(q => q.status === 'Sent').forEach(q => {
      const sent = new Date(q.updatedAt || q.createdAt);
      const daysSince = Math.floor((now - sent) / 86400000);
      if (daysSince >= 3 && !completedActions['followup-' + q.id]) {
        actions.push({
          id: 'followup-' + q.id,
          type: 'follow-up',
          icon: '\u{1F4E7}',
          label: 'Follow up on quote: ' + (q.tourName || 'Q-' + q.id),
          sub: q.clientName + ' \u2014 sent ' + daysSince + ' days ago',
          action: 'email',
          data: { to: q.clientEmail, subject: 'Following up \u2014 ' + q.tourName, body: 'Dear ' + (q.clientName||'') + ',\\n\\nI wanted to follow up on the quote we sent for "' + (q.tourName||'') + '". Please let us know if you have any questions.\\n\\nKind regards,\\nOdisea Tours' },
          waData: { phone: q.clientPhone, text: 'Hi ' + (q.clientName||'') + ', just following up on the quote for "' + (q.tourName||'') + '". Any questions? - Odisea Tours' }
        });
      }
    });

    // Overdue invoices
    invoices.forEach(i => {
      const paid = (i.payments||[]).reduce((s,p)=>s+Number(p.amount),0);
      if (paid < Number(i.amount) && i.dueDate && new Date(i.dueDate) < now && !completedActions['reminder-' + i.id]) {
        const balance = Number(i.amount) - paid;
        actions.push({
          id: 'reminder-' + i.id,
          type: 'payment',
          icon: '\u{1F4B3}',
          label: 'Payment reminder: ' + (i.number || ''),
          sub: (i.clientName || '') + ' \u2014 ' + fmt(balance, i.currency) + ' overdue',
          action: 'email',
          data: { to: '', subject: 'Payment Reminder \u2014 ' + i.number, body: 'Dear ' + (i.clientName||'') + ',\\n\\nFriendly reminder that invoice ' + i.number + ' has an outstanding balance of ' + fmt(balance, i.currency) + '.\\n\\nKind regards,\\nOdisea Tours' }
        });
      }
    });

    // Tours departing within 14 days
    tours.filter(t => t.status === 'Preparing').forEach(t => {
      const start = new Date(t.startDate);
      const daysUntil = Math.ceil((start - now) / 86400000);
      if (daysUntil > 0 && daysUntil <= 14 && !completedActions['predep-' + t.id]) {
        actions.push({
          id: 'predep-' + t.id,
          type: 'departure',
          icon: '\u2708\uFE0F',
          label: 'Send pre-departure info: ' + t.tourName,
          sub: t.clientName + ' \u2014 departing in ' + daysUntil + ' days',
          action: 'email',
          data: { to: t.clientEmail, subject: 'Pre-Departure Info \u2014 ' + t.tourName, body: 'Dear ' + (t.clientName||'') + ',\\n\\nYour tour "' + t.tourName + '" departs on ' + fmtDate(t.startDate) + '. Please ensure all passengers are registered.\\n\\nKind regards,\\nOdisea Tours' },
          waData: { phone: t.clientPhone, text: 'Hi ' + (t.clientName||'') + '! Your tour "' + t.tourName + '" departs on ' + fmtDate(t.startDate) + '. Please ensure all passengers are registered. - Odisea Tours' }
        });
      }
    });

    // New bookings (tours created in last 7 days)
    tours.forEach(t => {
      const created = new Date(t.createdAt || t.confirmedAt || '');
      const daysSince = Math.floor((now - created) / 86400000);
      if (daysSince <= 7 && !completedActions['welcome-' + t.id]) {
        actions.push({
          id: 'welcome-' + t.id,
          type: 'welcome',
          icon: '\u{1F389}',
          label: 'Send welcome pack: ' + t.tourName,
          sub: t.clientName + ' \u2014 booked ' + daysSince + ' days ago',
          action: 'email',
          data: { to: t.clientEmail, subject: 'Welcome! ' + t.tourName + ' Confirmed', body: 'Dear ' + (t.clientName||'') + ',\\n\\nWelcome! Your tour "' + t.tourName + '" to ' + (t.destination||'') + ' is confirmed.\\n\\nDates: ' + fmtDate(t.startDate) + ' - ' + fmtDate(t.endDate) + '\\n\\nWe will be sharing more details soon.\\n\\nKind regards,\\nOdisea Tours' },
          waData: t.clientPhone ? { phone: t.clientPhone, text: 'Hi ' + (t.clientName||'') + '! Welcome aboard! Your tour "' + t.tourName + '" to ' + (t.destination||'') + ' is confirmed for ' + fmtDate(t.startDate) + '. - Odisea Tours' } : null
        });
      }
    });

    if (!actions.length) {
      container.innerHTML = '<div class="empty-state">No pending actions \u2014 you\'re all caught up!</div>';
      return;
    }

    container.innerHTML = actions.map(a => `
      <div class="list-item" style="flex-wrap:wrap;gap:0.5rem">
        <div style="display:flex;align-items:center;gap:0.5rem;flex:1;min-width:200px">
          <span style="font-size:1.3rem">${a.icon}</span>
          <div>
            <div class="li-title">${a.label}</div>
            <div class="li-sub">${a.sub}</div>
          </div>
        </div>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" style="font-size:0.75rem;border-color:var(--amber);color:var(--amber)" onclick="Dashboard.executeAction('${a.id}','email')">Email</button>
          ${a.waData ? '<button class="btn btn-sm" style="font-size:0.75rem;background:#25D366;color:white;border:none" onclick="Dashboard.executeAction(\'' + a.id + '\',\'whatsapp\')">WhatsApp</button>' : ''}
          <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:var(--gray-400);border-color:var(--gray-200)" onclick="Dashboard.dismissAction('${a.id}')">Done</button>
        </div>
      </div>
    `).join('');

    // Store actions for executeAction
    this._pendingActions = actions;
  },

  executeAction(actionId, method) {
    const action = (this._pendingActions || []).find(a => a.id === actionId);
    if (!action) return;

    if (method === 'email' && action.data) {
      Email.sendEmail(action.data.to || '', action.data.subject || '', action.data.body || '');
    } else if (method === 'whatsapp' && action.waData) {
      WhatsApp.sendCustom(action.waData.phone, action.waData.text);
    }

    this.dismissAction(actionId);
  },

  dismissAction(actionId) {
    const completed = JSON.parse(localStorage.getItem('odisea_completed_actions') || '{}');
    completed[actionId] = Date.now();
    // Clean old entries (older than 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    Object.keys(completed).forEach(k => { if (completed[k] < thirtyDaysAgo) delete completed[k]; });
    localStorage.setItem('odisea_completed_actions', JSON.stringify(completed));
    this.render();
  },

  async _renderWeatherWidget(tours) {
    const container = document.getElementById('dashboard-weather');
    if (!container) return;

    const upcoming = tours.filter(t => {
      const start = new Date(t.startDate);
      const now = new Date();
      const diff = (start - now) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30 && (t.status === 'Preparing' || t.status === 'In Progress');
    });

    if (!upcoming.length) {
      container.innerHTML = '<div class="empty-state">No upcoming tours in the next 30 days.</div>';
      return;
    }

    container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.85rem">Loading weather data...</div>';

    const cacheKey = 'odisea_weather_cache';
    const cacheTimeKey = 'odisea_weather_cache_time';
    const sixHours = 6 * 60 * 60 * 1000;
    let cache = {};
    try {
      const cached = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(cacheTimeKey);
      if (cached && cachedTime && (Date.now() - Number(cachedTime)) < sixHours) {
        cache = JSON.parse(cached);
      }
    } catch (e) {}

    const results = [];
    for (const t of upcoming) {
      const dest = (t.destination || '').split('\u2192')[0].trim().split(',')[0].trim();
      if (!dest) continue;

      let weather = cache[dest];
      if (!weather) {
        try {
          const resp = await fetch('https://wttr.in/' + encodeURIComponent(dest) + '?format=j1');
          const data = await resp.json();
          if (data && data.current_condition && data.current_condition[0]) {
            const cc = data.current_condition[0];
            weather = {
              temp: cc.temp_C,
              feelsLike: cc.FeelsLikeC,
              desc: (cc.weatherDesc && cc.weatherDesc[0]) ? cc.weatherDesc[0].value : '',
              humidity: cc.humidity,
              icon: Dashboard._weatherIcon(cc.weatherCode)
            };
            // Also get forecast for tour dates
            if (data.weather && data.weather.length) {
              weather.forecast = data.weather.slice(0, 3).map(d => ({
                date: d.date,
                maxTemp: d.maxtempC,
                minTemp: d.mintempC,
                rain: d.hourly ? Math.max(...d.hourly.map(h => Number(h.chanceofrain || 0))) : 0,
                desc: (d.hourly && d.hourly[4] && d.hourly[4].weatherDesc && d.hourly[4].weatherDesc[0]) ? d.hourly[4].weatherDesc[0].value : ''
              }));
            }
            cache[dest] = weather;
          }
        } catch (e) {
          weather = null;
        }
      }

      if (weather) results.push({ tour: t, dest, weather });
    }

    // Save cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      localStorage.setItem(cacheTimeKey, String(Date.now()));
    } catch (e) {}

    if (!results.length) {
      container.innerHTML = '<div class="empty-state">Could not load weather data.</div>';
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
        ${results.map(r => {
          const w = r.weather;
          const daysUntil = Math.ceil((new Date(r.tour.startDate) - new Date()) / (1000*60*60*24));
          return `<div style="background:white;border-radius:var(--radius-lg);padding:1rem;border:1.5px solid var(--gray-100)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem">
              <div>
                <div style="font-weight:700;font-size:0.92rem">${r.dest}</div>
                <div style="font-size:0.78rem;color:var(--gray-400)">${r.tour.tourName} - ${daysUntil} days</div>
              </div>
              <div style="font-size:2rem">${w.icon}</div>
            </div>
            <div style="display:flex;gap:1rem;margin-bottom:0.5rem">
              <div><div style="font-size:1.5rem;font-weight:700">${w.temp}\u00B0C</div><div style="font-size:0.75rem;color:var(--gray-400)">Feels ${w.feelsLike}\u00B0C</div></div>
              <div style="font-size:0.82rem;color:var(--gray-500)">${w.desc}<br>Humidity: ${w.humidity}%</div>
            </div>
            ${w.forecast ? `<div style="display:flex;gap:0.5rem;font-size:0.75rem;border-top:1px solid var(--gray-100);padding-top:0.5rem">
              ${w.forecast.map(f => `<div style="flex:1;text-align:center"><div style="color:var(--gray-400)">${f.date ? new Date(f.date).toLocaleDateString('en-GB',{weekday:'short'}) : ''}</div><div style="font-weight:600">${f.maxTemp}\u00B0/${f.minTemp}\u00B0</div><div style="color:${Number(f.rain) > 50 ? 'var(--blue)' : 'var(--gray-400)'}">${f.rain}% rain</div></div>`).join('')}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:0.72rem;color:var(--gray-300);margin-top:0.5rem;text-align:right">Weather data from wttr.in \u2022 ${new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>`;
  },

  _weatherIcon(code) {
    const c = Number(code);
    if (c === 113) return '\u2600\uFE0F';
    if (c === 116) return '\u26C5';
    if (c === 119 || c === 122) return '\u2601\uFE0F';
    if ([176,263,266,293,296,299,302,305,308,353,356,359].includes(c)) return '\u{1F327}\uFE0F';
    if ([200,386,389,392,395].includes(c)) return '\u26C8\uFE0F';
    if ([227,230,323,326,329,332,335,338,368,371,374,377].includes(c)) return '\u{1F328}\uFE0F';
    if ([143,248,260].includes(c)) return '\u{1F32B}\uFE0F';
    return '\u{1F324}\uFE0F';
  },

  async _renderFeedbackSummary(tours) {
    const container = document.getElementById('dashboard-feedback');
    if (!container || !DB._firebaseReady) return;

    const results = [];
    for (const t of tours.filter(t => t.status === 'Completed' && t.accessCode)) {
      try {
        const snap = await DB.firestore.collection('tours').doc(String(t.id)).collection('feedback').get();
        if (snap.size > 0) {
          const ratings = snap.docs.map(d => d.data());
          const avg = ratings.reduce((s, r) => s + (r.overall || 0), 0) / ratings.length;
          results.push({ tour: t, count: ratings.length, avgRating: avg.toFixed(1) });
        }
      } catch (e) {}
    }

    if (!results.length) {
      container.innerHTML = '<div class="empty-state">No feedback collected yet.</div>';
      return;
    }

    container.innerHTML = results.map(r => `
      <div class="list-item">
        <div>
          <div class="li-title">${r.tour.tourName}</div>
          <div class="li-sub">${r.count} review${r.count!==1?'s':''}</div>
        </div>
        <div style="color:var(--amber);font-weight:600;font-size:1.1rem">${'\u2605'.repeat(Math.round(r.avgRating))} <span style="font-size:0.82rem;color:var(--gray-400)">${r.avgRating}/5</span></div>
      </div>
    `).join('');
  },

  _renderProfitAlerts(tours) {
    const card = document.getElementById('dashboard-profit-alerts-card');
    const container = document.getElementById('dashboard-profit-alerts');
    if (!card || !container) return;

    const alerts = tours.filter(t => {
      const c = t.costs || {};
      const margin = c.margin || 0;
      const rev = c.totalRevenue || 0;
      return rev > 0 && margin < 15;
    });

    if (!alerts.length) {
      card.style.display = 'none';
      return;
    }

    card.style.display = '';
    container.innerHTML = `
      <p style="font-size:0.85rem;color:var(--red);margin-bottom:0.8rem;font-weight:600">The following tours have profit margins below 15%:</p>
      <table class="data-table" style="font-size:0.85rem">
        <thead><tr>
          <th>Tour</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th><th></th>
        </tr></thead>
        <tbody>${alerts.map(t => {
          const c = t.costs || {};
          const margin = c.margin || 0;
          const profit = c.profit || 0;
          const color = margin < 0 ? 'var(--red)' : 'var(--amber)';
          return `<tr style="border-left:3px solid ${color}">
            <td><strong>${t.tourName || '—'}</strong></td>
            <td>${fmt(c.totalRevenue || 0, t.currency)}</td>
            <td>${fmt(c.grand || 0, t.currency)}</td>
            <td style="color:${profit >= 0 ? 'var(--amber)' : 'var(--red)'};font-weight:600">${fmt(profit, t.currency)}</td>
            <td style="color:${color};font-weight:700">${margin.toFixed(1)}%</td>
            <td><button class="btn btn-sm btn-outline" onclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)">View</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }
};
