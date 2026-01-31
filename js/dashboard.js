/* === DASHBOARD MODULE === */
const Dashboard = {
  init() { this.render(); },

  render() {
    const quotes = DB.getQuotes();
    const tours = DB.getTours();
    const invoices = DB.getInvoices();
    const clients = DB.getClients();

    // Invoice metrics
    const pendingPayments = invoices.filter(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      return paid < Number(i.amount);
    });
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalCollected = invoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const outstanding = totalInvoiced - totalCollected;

    // Expected profit: all confirmed tours
    let totalRevenue = 0, totalCosts = 0, expectedProfit = 0;
    tours.forEach(t => {
      if (t.costs) {
        totalRevenue += (t.costs.totalRevenue || 0);
        totalCosts += (t.costs.grand || 0);
        expectedProfit += (t.costs.profit || 0);
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
      finalRevenue += rev;
      finalCosts += costs;
      finalProfit += (rev - costs);
    });

    // Pipeline profit: quotes in Follow-up status
    const followUpQuotes = quotes.filter(q => q.status === 'Follow-up');
    let pipelineProfit = 0, pipelineRevenue = 0;
    followUpQuotes.forEach(q => {
      const rev = ((q.priceStudent||0)*(q.numStudents||0)) + ((q.priceSibling||0)*(q.numSiblings||0)) + ((q.priceAdult||0)*(q.numAdults||0));
      const cost = q.costs ? (q.costs.grand || 0) : 0;
      pipelineRevenue += rev;
      pipelineProfit += (rev - cost);
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
        providerOwed += (e.amount || 0);
        providerPaid += (e.paidAmount || 0);
      });
    });

    // Stats cards — 3 rows
    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card amber"><div class="stat-label">Total Quotes</div><div class="stat-value">${quotes.length}</div><div class="stat-sub">${quoteDraft} draft, ${quoteSent} sent, ${quoteFollowUp} follow-up</div></div>
      <div class="stat-card green"><div class="stat-label">Confirmed Tours</div><div class="stat-value">${tours.length}</div><div class="stat-sub">${toursPreparing} preparing, ${toursInProgress} active, ${toursCompleted} done</div></div>
      <div class="stat-card blue"><div class="stat-label">Total Travelers</div><div class="stat-value">${totalTravelers}</div><div class="stat-sub">${totalStudents} students, ${totalSiblings} siblings, ${totalAdults} adults, ${totalFOC} FOC</div></div>
      <div class="stat-card amber"><div class="stat-label">Conversion Rate</div><div class="stat-value">${conversionRate}%</div><div class="stat-sub">${quoteConfirmed} confirmed / ${quotes.length} quotes${quoteLost ? ', ' + quoteLost + ' lost' : ''}</div></div>
      <div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">${fmt(totalRevenue)}</div><div class="stat-sub">From ${tours.length} confirmed tour${tours.length!==1?'s':''}</div></div>
      <div class="stat-card red"><div class="stat-label">Total Costs</div><div class="stat-value">${fmt(totalCosts)}</div><div class="stat-sub">Providers owed: ${fmt(providerOwed)} (${fmt(providerPaid)} paid)</div></div>
      <div class="stat-card" style="border-left-color:var(--amber)"><div class="stat-label">Pipeline Profit</div><div class="stat-value" style="color:var(--amber)">${fmt(pipelineProfit)}</div><div class="stat-sub">${followUpQuotes.length} follow-up quote${followUpQuotes.length!==1?'s':''} — rev: ${fmt(pipelineRevenue)}</div></div>
      <div class="stat-card" style="border-left-color:${expectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}"><div class="stat-label">Expected Profit</div><div class="stat-value" style="color:${expectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(expectedProfit)}</div><div class="stat-sub">All ${tours.length} confirmed tours — margin: ${totalRevenue > 0 ? (expectedProfit / totalRevenue * 100).toFixed(1) + '%' : '—'}</div></div>
      <div class="stat-card" style="border-left-color:${finalProfit >= 0 ? 'var(--green)' : 'var(--red)'}"><div class="stat-label">Final Profit</div><div class="stat-value" style="color:${finalProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(finalProfit)}</div><div class="stat-sub">${completedTours.length} completed tour${completedTours.length!==1?'s':''} — margin: ${finalRevenue > 0 ? (finalProfit / finalRevenue * 100).toFixed(1) + '%' : '—'}</div></div>
      <div class="stat-card blue"><div class="stat-label">Cash Flow</div><div class="stat-value" style="color:${outstanding > 0 ? 'var(--red)' : 'var(--green)'}">${fmt(outstanding)}</div><div class="stat-sub">outstanding of ${fmt(totalInvoiced)} invoiced (${fmt(totalCollected)} collected)</div></div>
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
          return `<div class="list-item"><div><div class="li-title">${i.number} — ${i.clientName}</div><div class="li-sub overdue">Due: ${fmtDate(i.dueDate)}</div></div><div class="li-amount">${fmt(bal, i.currency)}</div></div>`;
        }).join('')
      : '<div class="empty-state">No overdue payments</div>';

    // Confirmed groups profit summary table
    this._renderConfirmedGroups(tours);

    // Provider payment alerts
    this._renderProviderAlerts(tours);

    // Portal notification badges (async, non-blocking)
    this._renderPortalBadges(tours);
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
        const clientMsgCount = msgSnap.docs.filter(d => d.data().sender !== 'admin').length;
        const totalMsgCount = msgSnap.size;
        totalPassengers += paxCount;
        totalMessages += clientMsgCount;
        const expected = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);
        tourData.push({ tour: t, paxCount, clientMsgCount, totalMsgCount, expected });
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
                <th>Tour</th><th>Access Code</th><th>Registrations</th><th>Progress</th><th>Messages</th><th></th>
              </tr></thead>
              <tbody>${tourData.filter(d => d.tour.accessCode || d.paxCount > 0).map(d => {
                const pct = d.expected > 0 ? Math.min(100, Math.round(d.paxCount / d.expected * 100)) : 0;
                const barColor = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
                return `<tr class="row-clickable" ondblclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${d.tour.id}),100)">
                  <td><strong>${d.tour.tourName || '—'}</strong></td>
                  <td>${d.tour.accessCode ? '<code style="font-family:monospace;font-size:0.82rem;font-weight:600;background:var(--gray-50);padding:0.15rem 0.4rem;border-radius:4px">' + d.tour.accessCode + '</code>' : '<span style="color:var(--gray-300)">—</span>'}</td>
                  <td><strong>${d.paxCount}</strong>${d.expected ? ' / ' + d.expected : ''}</td>
                  <td style="min-width:100px">${d.expected ? '<div style="background:var(--gray-100);border-radius:10px;height:8px;overflow:hidden"><div style="background:' + barColor + ';height:100%;width:' + pct + '%;border-radius:10px;transition:width 0.5s"></div></div><span style="font-size:0.72rem;color:var(--gray-400)">' + pct + '%</span>' : '<span style="color:var(--gray-300)">—</span>'}</td>
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
  }
};
