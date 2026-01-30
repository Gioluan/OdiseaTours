/* === DASHBOARD MODULE === */
const Dashboard = {
  init() { this.render(); },

  render() {
    const quotes = DB.getQuotes();
    const tours = DB.getTours();
    const invoices = DB.getInvoices();

    const pendingPayments = invoices.filter(i => {
      const paid = (i.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      return paid < Number(i.amount);
    });
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

    // Profit metrics across all confirmed tours
    let totalRevenue = 0, totalCosts = 0, totalProfit = 0;
    tours.forEach(t => {
      if (t.costs) {
        totalRevenue += (t.costs.totalRevenue || 0);
        totalCosts += (t.costs.grand || 0);
        totalProfit += (t.costs.profit || 0);
      }
    });

    // Stats — 2 rows of 4 cards
    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card amber"><div class="stat-label">Total Quotes</div><div class="stat-value">${quotes.length}</div></div>
      <div class="stat-card green"><div class="stat-label">Confirmed Tours</div><div class="stat-value">${tours.length}</div></div>
      <div class="stat-card red"><div class="stat-label">Pending Payments</div><div class="stat-value">${pendingPayments.length}</div></div>
      <div class="stat-card blue"><div class="stat-label">Total Invoiced</div><div class="stat-value">${fmt(totalInvoiced)}</div></div>
      <div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">${fmt(totalRevenue)}</div></div>
      <div class="stat-card amber"><div class="stat-label">Total Costs</div><div class="stat-value">${fmt(totalCosts)}</div></div>
      <div class="stat-card" style="border-left-color:${totalProfit >= 0 ? 'var(--green)' : 'var(--red)'}"><div class="stat-label">Total Profit</div><div class="stat-value" style="color:${totalProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(totalProfit)}</div></div>
      <div class="stat-card blue"><div class="stat-label">Avg Margin</div><div class="stat-value">${totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) + '%' : '—'}</div></div>
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
          const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0);
          const profit = c.profit || 0;
          const margin = c.margin || 0;
          return `<tr class="row-clickable" ondblclick="App.switchTab('tours');setTimeout(()=>Tours.viewTour(${t.id}),100)">
            <td><strong>${t.tourName || '—'}</strong></td>
            <td>${t.clientName || '—'}</td>
            <td>${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</td>
            <td>${groupSize}</td>
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
