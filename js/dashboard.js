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
    if (!DB._firebaseReady || !tours.length) return;
    try {
      let totalMessages = 0, totalPassengers = 0;
      for (const t of tours) {
        const doc = await DB.firestore.collection('tours').doc(String(t.id)).get();
        if (doc.exists) {
          const data = doc.data();
          totalMessages += (data.unreadMessagesCount || 0);
          totalPassengers += (data.unreadPassengersCount || 0);
          // Update badges in tour view if visible
          const msgBadge = document.getElementById('msg-badge-' + t.id);
          if (msgBadge && data.unreadMessagesCount > 0) {
            msgBadge.textContent = data.unreadMessagesCount;
            msgBadge.style.display = 'inline-block';
          }
          const paxBadge = document.getElementById('pax-badge-' + t.id);
          if (paxBadge && data.unreadPassengersCount > 0) {
            paxBadge.textContent = data.unreadPassengersCount;
            paxBadge.style.display = 'inline-block';
          }
        }
      }
      // Add summary to dashboard if there are notifications
      if (totalMessages > 0 || totalPassengers > 0) {
        let alertHTML = '';
        if (totalMessages > 0) alertHTML += `<span style="background:var(--red);color:white;padding:0.2rem 0.6rem;border-radius:10px;font-size:0.8rem;font-weight:600;margin-right:0.5rem">${totalMessages} unread message${totalMessages!==1?'s':''}</span>`;
        if (totalPassengers > 0) alertHTML += `<span style="background:var(--blue);color:white;padding:0.2rem 0.6rem;border-radius:10px;font-size:0.8rem;font-weight:600">${totalPassengers} new registration${totalPassengers!==1?'s':''}</span>`;
        // Insert portal alerts before stats
        const statsEl = document.getElementById('dashboard-stats');
        if (statsEl && !document.getElementById('portal-alerts-bar')) {
          const bar = document.createElement('div');
          bar.id = 'portal-alerts-bar';
          bar.style.cssText = 'background:white;border-radius:8px;padding:0.6rem 1rem;margin-bottom:0.8rem;display:flex;align-items:center;gap:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.05)';
          bar.innerHTML = `<strong style="font-size:0.82rem;color:var(--gray-500);margin-right:0.3rem">Portal:</strong> ${alertHTML}`;
          statsEl.parentNode.insertBefore(bar, statsEl);
        }
      }
    } catch (e) {
      // Non-critical, silently fail
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
