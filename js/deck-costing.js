/* === ODISEA · hoja de costes ==================================================
 *
 * Sustituye a los _make_costing_xlsx.py escritos a mano por tour. Aquellos
 * llevaban las tarifas tecleadas DENTRO del script (65 EUR de media pension,
 * 82 EUR netos de Castelldefels, 750 EUR/dia de autocar), copiadas a ojo del
 * cost book. Cuando una tarifa cambiaba, cambiaba en un script y en ninguno
 * mas.
 *
 * Aqui los numeros salen del presupuesto que ya esta en el CRM (t.hotels,
 * t.activities, t.coachHire...), es decir del mismo sitio del que sale el
 * precio que se le da al cliente. No hay dos verdades.
 *
 * Dos hojas:
 *   "Quote"        lo que se estimo al cotizar, linea a linea, con margen
 *   "Actual cost"  t.providerExpenses: lo que se ha facturado y pagado
 *
 * Cada linea lleva su origen, que es lo que distingue un presupuesto
 * defendible de una lista de numeros:
 *   VERIFIED    hay factura del proveedor (invoiceReceived)
 *   RATE CARD   sale de una tarifa escrita del proveedor
 *   ESTIMATE    precio de mercado, hay que pedirlo antes de cerrar
 *
 * La hoja va en ingles, como el resto del CRM. Los comentarios de este fichero
 * siguen en castellano; los nombres de bloque (ACCOMMODATION, TRANSPORT...) no
 * son decorativos: tienen que cuadrar entre VAT_DEFAULT, origin() y
 * quoteLines(), o el IVA y la marca de origen dejan de aplicarse.
 *
 * DeckCosting.export(tourId)
 */
const DeckCosting = {

  /* IVA por bloque. Se puede sobreescribir por tour en t.costing.iva.
   * Por defecto 0: los importes del CRM se toman tal cual se metieron, y la
   * hoja lo dice. Inventar un IVA sobre una cifra que ya lo llevaba dentro es
   * peor que no ponerlo. */
  VAT_DEFAULT: { ACCOMMODATION: 0, MEALS: 0, TRANSPORT: 0, ACTIVITIES: 0, GUIDE: 0, COMMISSION: 0 },

  export(tourId) {
    if (typeof XLSX === 'undefined') {
      alert('The Excel library (SheetJS) has not loaded yet. Wait a second and try again.');
      return;
    }
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) { alert('Tour not found.'); return; }

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

  /* Origen de una linea. Si el tour ya tiene un gasto real del mismo bloque con
   * factura recibida, esa parte esta verificada. */
  origin(t, block, hint) {
    if (hint) return hint;
    const cat = { ACCOMMODATION: 'Hotel', TRANSPORT: 'Transport', ACTIVITIES: 'Activity', GUIDE: 'Guide' }[block];
    const has = (t.providerExpenses || []).some(e => e.category === cat && e.invoiceReceived);
    return has ? 'VERIFIED' : 'ESTIMATE';
  },

  /* -- Hoja 1 · presupuesto --------------------------------------------------- */

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

    // -- Ingresos y margen ---------------------------------------------------
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

    // Formato de numero: importes con dos decimales, IVA y margen en porcentaje.
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

  /* Convierte el presupuesto del CRM en lineas de coste con su detalle. Es la
   * misma aritmetica que Quote.calculateCosts(), desglosada para que la hoja
   * explique de donde sale cada euro en vez de dar un total. */
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

  /* -- Hoja 2 · coste real ---------------------------------------------------- */

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
