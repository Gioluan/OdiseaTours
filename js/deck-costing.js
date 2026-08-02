/* === ODISEA · cost sheet =====================================================
 *
 * Replaces the _make_costing_xlsx.py scripts hand-written per tour. Those had
 * the rates typed INSIDE the script (65 EUR half board, 82 EUR net for
 * Castelldefels, 750 EUR/day for the coach), copied by eye from the cost book.
 * When a rate changed, it changed in one script and in none of the others.
 *
 * Here the numbers come from the quote already in the CRM (t.hotels,
 * t.activities, t.coachHire...), that is, from the same place the client's
 * price comes from. There are no two versions of the truth.
 *
 * Two sheets:
 *   "Quote"        what was estimated when quoting, line by line, with margin
 *   "Actual cost"  t.providerExpenses: what has been invoiced and paid
 *
 * Every line carries its source, which is what separates a defensible quote
 * from a list of numbers:
 *   VERIFIED    a supplier invoice exists (invoiceReceived)
 *   RATE CARD   comes from a written supplier rate
 *   ESTIMATE    market price, must be confirmed before closing
 *
 * The block names (ACCOMMODATION, TRANSPORT...) are not decorative: they have
 * to line up across VAT_DEFAULT, origin() and quoteLines(), or the VAT and the
 * source flag stop being applied.
 *
 * DeckCosting.export(ref)   ref: a tour id, 'tour:3' or 'quote:12'
 *
 * Depends on js/deck.js (Deck.resolve). index.html and sw.js load it first; if
 * the <script> order is ever changed, this breaks with "Deck is not defined".
 */
const DeckCosting = {

  /* VAT per block. Can be overridden per record in t.costing.vat.
   * Zero by default: CRM amounts are taken exactly as they were entered, and
   * the sheet says so. Inventing VAT on top of a figure that already included
   * it is worse than leaving it out. */
  VAT_DEFAULT: { ACCOMMODATION: 0, MEALS: 0, TRANSPORT: 0, ACTIVITIES: 0, GUIDE: 0, COMMISSION: 0 },

  /* ref accepts a tour id, 'tour:3' or 'quote:12': the cost sheet is needed
   * before confirming, which is when the price is decided. */
  export(ref) {
    if (typeof XLSX === 'undefined') {
      alert('The Excel library (SheetJS) has not loaded yet. Wait a second and try again.');
      return;
    }
    const r = Deck.resolve(ref);
    const t = r.rec;
    if (!t) { alert((r.kind === 'quote' ? 'Quote' : 'Tour') + ' not found.'); return; }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, this.sheetQuote(t), 'Quote');

    const actual = t.providerExpenses || [];
    if (actual.length) {
      XLSX.utils.book_append_sheet(wb, this.sheetActual(t), 'Actual cost');
    }

    const safe = String(t.tourName || 'Tour').replace(/[\\\/:*?"<>|]/g, '-').slice(0, 60);
    XLSX.writeFile(wb, safe + ' - Costs.xlsx');
  },

  /* -- Helpers --------------------------------------------------------------- */

  num(v) { const n = +v; return isNaN(n) ? 0 : n; },

  pax(t) {
    return {
      students: this.num(t.numStudents), siblings: this.num(t.numSiblings),
      adults: this.num(t.numAdults), foc: this.num(t.numFOC),
      get paying() { return this.students + this.siblings + this.adults; },
      get total() { return this.paying + this.foc; }
    };
  },

  vat(t, block) {
    const cfg = (t.costing && t.costing.vat) || {};
    return cfg[block] != null ? this.num(cfg[block]) : (this.VAT_DEFAULT[block] || 0);
  },

  /* Source of a line. If the record already has an actual expense in the same
   * block with an invoice received, that part is verified. */
  origin(t, block, hint) {
    if (hint) return hint;
    const cat = { ACCOMMODATION: 'Hotel', TRANSPORT: 'Transport', ACTIVITIES: 'Activity', GUIDE: 'Guide' }[block];
    const has = (t.providerExpenses || []).some(e => e.category === cat && e.invoiceReceived);
    return has ? 'VERIFIED' : 'ESTIMATE';
  },

  /* -- Sheet 1 · quote ------------------------------------------------------- */

  sheetQuote(t) {
    const p = this.pax(t);
    const ccy = t.currency || 'EUR';
    const nights = this.num(t.nights);
    const days = nights + 1;
    const rows = [];
    const push = (...cells) => rows.push(cells);

    push('ODISEA TOURS · COST SHEET');
    push(t.tourName || '');
    push('Client', t.clientName || '');
    push('Dates', (t.startDate || '') + ' to ' + (t.endDate || ''), '', nights + ' nights', days + ' days');
    push('Group', p.total + ' pax', p.students + ' players', p.siblings + ' siblings',
         p.adults + ' adults', p.foc + ' free places');
    push('Currency', ccy);
    push('');
    push('NOT A FIRM QUOTE. Every line carries its source: VERIFIED = a supplier invoice exists;');
    push('RATE CARD = written supplier rate; ESTIMATE = market price, must be confirmed before closing.');
    push('Amounts are taken as they stand from the CRM quote. If a rate is NET with VAT on top,');
    push('set the percentage in the VAT column.');
    push('');

    const HEAD = ['BLOCK', 'ITEM', 'DETAIL', 'QTY', 'UNIT PRICE', 'NET', 'VAT %', 'VAT', 'TOTAL', 'SOURCE'];
    push.apply(null, HEAD);
    const headRow = rows.length - 1;

    const lines = this.quoteLines(t, p, nights, days);
    const firstLine = rows.length;

    let base = 0, ivaTotal = 0;
    lines.forEach(l => {
      const b = l.units * l.unitPrice;
      const iv = b * l.vat;
      base += b; ivaTotal += iv;
      push(l.block, l.concept, l.detail, l.units, l.unitPrice, b, l.vat, iv, b + iv,
           this.origin(t, l.block, l.origin));
    });
    const lastLine = rows.length - 1;

    push('');
    push('', '', '', '', 'Subtotal', base, '', ivaTotal, base + ivaTotal);

    const contingency = t.costing && t.costing.contingency != null
      ? this.num(t.costing.contingency) : 0.03;
    const cont = (base + ivaTotal) * contingency;
    push('', '', 'Contingency and rate movement', '', Math.round(contingency * 100) + '%', '', '', '', cont);

    const totalCost = base + ivaTotal + cont;
    push('', '', '', '', 'TOTAL COST', '', '', '', totalCost);
    push('', '', '', '', 'Cost per paying person', '', '', '',
         p.paying ? totalCost / p.paying : 0);
    push('');

    // -- Revenue and margin --------------------------------------------------
    push('SELLING PRICE AND MARGIN');
    push('Item', 'Pax', 'Price', 'Revenue');
    const tiers = [
      { label: 'Player', n: p.students, price: this.num(t.priceStudent) },
      { label: 'Sibling', n: p.siblings, price: this.num(t.priceSibling) },
      { label: 'Adult', n: p.adults, price: this.num(t.priceAdult) },
      { label: 'Free places', n: p.foc, price: 0 }
    ];
    let revenue = 0;
    tiers.forEach(x => {
      const r = x.n * x.price;
      revenue += r;
      push(x.label, x.n, x.price, r);
    });
    push('', '', 'REVENUE', revenue);
    push('', '', 'COST', totalCost);
    push('', '', 'PROFIT', revenue - totalCost);
    push('', '', 'MARGIN', revenue ? (revenue - totalCost) / revenue : 0);
    const marginRow = rows.length - 1;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 15 }, { wch: 34 }, { wch: 46 }, { wch: 7 },
                   { wch: 12 }, { wch: 13 }, { wch: 7 }, { wch: 11 },
                   { wch: 13 }, { wch: 12 }];

    // Number formats: amounts to two decimals, VAT and margin as percentages.
    const money = '#,##0.00';
    for (let r = firstLine; r <= lastLine + 6; r++) {
      ['E', 'F', 'H', 'I'].forEach(col => {
        const c = ws[col + (r + 1)];
        if (c && typeof c.v === 'number') c.z = money;
      });
      const g = ws['G' + (r + 1)];
      if (g && typeof g.v === 'number') g.z = '0%';
    }
    const mc = ws['D' + (marginRow + 1)];
    if (mc && typeof mc.v === 'number') mc.z = '0.0%';

    return ws;
  },

  /* Turns the CRM quote into cost lines with their detail. Same arithmetic as
   * Quote.calculateCosts(), broken out so the sheet explains where every euro
   * comes from instead of handing over a total. */
  quoteLines(t, p, nights, days) {
    const L = [];

    (t.hotels || []).forEach(h => {
      const hn = this.num(h.nights) || nights;
      (h.rooms || []).forEach(r => {
        const qty = this.num(r.qty), rate = this.num(r.costPerNight);
        if (!qty || !rate) return;
        L.push({
          block: 'ACCOMMODATION',
          concept: (h.hotelName || h.city || 'Hotel') + (h.starRating ? ' ' + h.starRating + '★' : ''),
          detail: qty + ' x ' + (r.type || 'room') + ' · ' + hn + ' nights · ' + (h.mealPlan || ''),
          units: qty * hn, unitPrice: rate, vat: this.vat(t, 'ACCOMMODATION')
        });
      });
      const meal = this.num(h.mealCostPerPersonPerDay);
      if (meal) {
        L.push({
          block: 'MEALS',
          concept: 'Meals · ' + (h.city || h.hotelName || ''),
          detail: p.total + ' pax x ' + hn + ' days x ' + meal,
          units: p.total * hn, unitPrice: meal, vat: this.vat(t, 'MEALS')
        });
      }
    });

    const flight = this.num(t.flightCostPerPerson);
    if (flight) L.push({
      block: 'TRANSPORT', concept: 'Flights', detail: p.total + ' pax',
      units: p.total, unitPrice: flight, vat: this.vat(t, 'TRANSPORT')
    });

    [['airportTransfers', 'Airport transfers'],
     ['coachHire', 'Private coach'],
     ['internalTransport', 'Internal transport']].forEach(([k, label]) => {
      const v = this.num(t[k]);
      if (v) L.push({
        block: 'TRANSPORT', concept: label, detail: '',
        units: 1, unitPrice: v, vat: this.vat(t, 'TRANSPORT')
      });
    });

    (t.activities || []).forEach(a => {
      if (a.isFree) return;
      const cost = this.num(a.costPerPerson);
      if (!cost) return;
      const n = a.playersOnly ? p.students : p.total;
      L.push({
        block: 'ACTIVITIES', concept: a.name || 'Activity',
        detail: (a.city ? a.city + ' · ' : '') + n + ' pax' + (a.playersOnly ? ' (players only)' : ''),
        units: n, unitPrice: cost, vat: this.vat(t, 'ACTIVITIES')
      });
    });

    if (!t.noGuide) {
      const ng = this.num(t.numGuides), rate = this.num(t.guideDailyRate);
      if (ng && rate) L.push({
        block: 'GUIDE', concept: 'Guide / tour director',
        detail: ng + ' x ' + days + ' days x ' + rate,
        units: ng * days, unitPrice: rate, vat: this.vat(t, 'GUIDE')
      });
      [['guideFlights', 'Guide flights'],
       ['guideAccommodation', 'Guide accommodation'],
       ['guideMeals', 'Guide meals']].forEach(([k, label]) => {
        const v = this.num(t[k]);
        if (v) L.push({
          block: 'GUIDE', concept: label, detail: '',
          units: 1, unitPrice: v, vat: this.vat(t, 'GUIDE')
        });
      });
    }

    if (t.agentCommission && this.num(t.agentCommissionAmount) > 0) {
      const amt = this.num(t.agentCommissionAmount);
      if (t.agentCommissionType === 'per_person') {
        L.push({
          block: 'COMMISSION', concept: 'Agency commission',
          detail: p.total + ' pax x ' + amt,
          units: p.total, unitPrice: amt, vat: this.vat(t, 'COMMISSION'), origin: 'RATE CARD'
        });
      } else {
        const subtotal = L.reduce((s, l) => s + l.units * l.unitPrice, 0);
        L.push({
          block: 'COMMISSION', concept: 'Agency commission',
          detail: amt + '% of ' + Math.round(subtotal),
          units: 1, unitPrice: subtotal * (amt / 100), vat: this.vat(t, 'COMMISSION'), origin: 'RATE CARD'
        });
      }
    }

    return L;
  },

  /* -- Sheet 2 · actual cost -------------------------------------------------- */

  sheetActual(t) {
    const rows = [];
    const push = (...c) => rows.push(c);

    push('ACTUAL COST · ' + (t.tourName || ''));
    push('What has actually been invoiced and paid. This is what makes the tour margin defensible');
    push('and what feeds 00-business/tour-ledger.csv at close-out.');
    push('');
    push('SUPPLIER', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'INVOICE', 'REF.', 'PAID', 'PAID DATE', 'NOTES');

    let total = 0, paid = 0;
    (t.providerExpenses || []).forEach(e => {
      const amt = this.num(e.amount);
      total += amt;
      if (e.paid) paid += this.num(e.paidAmount) || amt;
      push(e.providerName || '', e.category || '', e.description || '', amt,
           e.invoiceReceived ? 'Yes' : 'No', e.invoiceRef || '',
           e.paid ? 'Yes' : 'No', e.paidDate || '', e.notes || '');
    });

    push('');
    push('', '', 'TOTAL INVOICED', total);
    push('', '', 'TOTAL PAID', paid);
    push('', '', 'OUTSTANDING', total - paid);

    const c = t.costs || {};
    if (c.grand) {
      push('');
      push('', '', 'Quote estimate', this.num(c.grand));
      push('', '', 'Variance (actual - quote)', total - this.num(c.grand));
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 13 }, { wch: 40 }, { wch: 13 },
                   { wch: 9 }, { wch: 16 }, { wch: 9 }, { wch: 12 }, { wch: 30 }];
    for (let r = 5; r < rows.length; r++) {
      const cell = ws['D' + (r + 1)];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    }
    return ws;
  }
};
