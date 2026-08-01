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
 *   "Presupuesto"  lo que se estimo al cotizar, linea a linea, con margen
 *   "Coste real"   t.providerExpenses: lo que se ha facturado y pagado
 *
 * Cada linea lleva su origen, que es lo que distingue un presupuesto
 * defendible de una lista de numeros:
 *   VERIFICADO  hay factura del proveedor (invoiceReceived)
 *   TARIFA      sale de una tarifa escrita del proveedor
 *   ESTIMADO    precio de mercado, hay que pedirlo antes de cerrar
 *
 * DeckCosting.export(tourId)
 */
const DeckCosting = {

  /* IVA por bloque. Se puede sobreescribir por tour en t.costing.iva.
   * Por defecto 0: los importes del CRM se toman tal cual se metieron, y la
   * hoja lo dice. Inventar un IVA sobre una cifra que ya lo llevaba dentro es
   * peor que no ponerlo. */
  IVA_DEFAULT: { ALOJAMIENTO: 0, MANUTENCION: 0, TRANSPORTE: 0, ACTIVIDADES: 0, GUIA: 0, COMISIONES: 0 },

  export(tourId) {
    if (typeof XLSX === 'undefined') {
      alert('La librería de Excel (SheetJS) todavía no ha cargado. Espera un segundo y vuelve a intentarlo.');
      return;
    }
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) { alert('Tour not found.'); return; }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, this.sheetQuote(t), 'Presupuesto');

    const actual = t.providerExpenses || [];
    if (actual.length) {
      XLSX.utils.book_append_sheet(wb, this.sheetActual(t), 'Coste real');
    }

    const safe = String(t.tourName || 'Tour').replace(/[\\\/:*?"<>|]/g, '-').slice(0, 60);
    XLSX.writeFile(wb, safe + ' - Costes.xlsx');
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

  iva(t, block) {
    const cfg = (t.costing && t.costing.iva) || {};
    return cfg[block] != null ? this.num(cfg[block]) : (this.IVA_DEFAULT[block] || 0);
  },

  /* Origen de una linea. Si el tour ya tiene un gasto real del mismo bloque con
   * factura recibida, esa parte esta verificada. */
  origin(t, block, hint) {
    if (hint) return hint;
    const cat = { ALOJAMIENTO: 'Hotel', TRANSPORTE: 'Transport', ACTIVIDADES: 'Activity', GUIA: 'Guide' }[block];
    const has = (t.providerExpenses || []).some(e => e.category === cat && e.invoiceReceived);
    return has ? 'VERIFICADO' : 'ESTIMADO';
  },

  /* -- Hoja 1 · presupuesto --------------------------------------------------- */

  sheetQuote(t) {
    const p = this.pax(t);
    const ccy = t.currency || 'EUR';
    const nights = this.num(t.nights);
    const days = nights + 1;
    const rows = [];
    const push = (...cells) => rows.push(cells);

    push('ODISEA TOURS · HOJA DE COSTES');
    push(t.tourName || '');
    push('Cliente', t.clientName || '');
    push('Fechas', (t.startDate || '') + ' a ' + (t.endDate || ''), '', nights + ' noches', days + ' días');
    push('Grupo', p.total + ' pax', p.students + ' jugadores', p.siblings + ' hermanos',
         p.adults + ' adultos', p.foc + ' gratuidades');
    push('Divisa', ccy);
    push('');
    push('NO ES UNA COTIZACIÓN EN FIRME. Cada línea lleva su origen: VERIFICADO = hay factura del proveedor;');
    push('TARIFA = tarifa escrita del proveedor; ESTIMADO = precio de mercado, hay que pedirlo antes de cerrar.');
    push('Los importes se toman tal cual del presupuesto del CRM. Si alguna tarifa es NETA con IVA aparte,');
    push('ajusta el porcentaje en la columna IVA.');
    push('');

    const HEAD = ['BLOQUE', 'CONCEPTO', 'DETALLE', 'UDS', 'PRECIO UD', 'BASE', 'IVA %', 'IVA', 'TOTAL', 'ORIGEN'];
    push.apply(null, HEAD);
    const headRow = rows.length - 1;

    const lines = this.quoteLines(t, p, nights, days);
    const firstLine = rows.length;

    let base = 0, ivaTotal = 0;
    lines.forEach(l => {
      const b = l.units * l.unitPrice;
      const iv = b * l.iva;
      base += b; ivaTotal += iv;
      push(l.block, l.concept, l.detail, l.units, l.unitPrice, b, l.iva, iv, b + iv,
           this.origin(t, l.block, l.origin));
    });
    const lastLine = rows.length - 1;

    push('');
    push('', '', '', '', 'Subtotal', base, '', ivaTotal, base + ivaTotal);

    const contingency = t.costing && t.costing.contingency != null
      ? this.num(t.costing.contingency) : 0.03;
    const cont = (base + ivaTotal) * contingency;
    push('', '', 'Imprevistos y ajuste de tarifas', '', Math.round(contingency * 100) + '%', '', '', '', cont);

    const totalCost = base + ivaTotal + cont;
    push('', '', '', '', 'TOTAL COSTE', '', '', '', totalCost);
    push('', '', '', '', 'Coste por persona de pago', '', '', '',
         p.paying ? totalCost / p.paying : 0);
    push('');

    // -- Ingresos y margen ---------------------------------------------------
    push('PVP Y MARGEN');
    push('Concepto', 'Pax', 'PVP', 'Ingreso');
    const tiers = [
      { label: 'Jugador', n: p.students, price: this.num(t.priceStudent) },
      { label: 'Hermano/a', n: p.siblings, price: this.num(t.priceSibling) },
      { label: 'Adulto', n: p.adults, price: this.num(t.priceAdult) },
      { label: 'Gratuidades', n: p.foc, price: 0 }
    ];
    let revenue = 0;
    tiers.forEach(x => {
      const r = x.n * x.price;
      revenue += r;
      push(x.label, x.n, x.price, r);
    });
    push('', '', 'INGRESOS', revenue);
    push('', '', 'COSTE', totalCost);
    push('', '', 'BENEFICIO', revenue - totalCost);
    push('', '', 'MARGEN', revenue ? (revenue - totalCost) / revenue : 0);
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
          block: 'ALOJAMIENTO',
          concept: (h.hotelName || h.city || 'Hotel') + (h.starRating ? ' ' + h.starRating + '★' : ''),
          detail: qty + ' x ' + (r.type || 'hab.') + ' · ' + hn + ' noches · ' + (h.mealPlan || ''),
          units: qty * hn, unitPrice: rate, iva: this.iva(t, 'ALOJAMIENTO')
        });
      });
      const meal = this.num(h.mealCostPerPersonPerDay);
      if (meal) {
        L.push({
          block: 'MANUTENCION',
          concept: 'Comidas · ' + (h.city || h.hotelName || ''),
          detail: p.total + ' pax x ' + hn + ' días x ' + meal,
          units: p.total * hn, unitPrice: meal, iva: this.iva(t, 'MANUTENCION')
        });
      }
    });

    const flight = this.num(t.flightCostPerPerson);
    if (flight) L.push({
      block: 'TRANSPORTE', concept: 'Vuelos', detail: p.total + ' pax',
      units: p.total, unitPrice: flight, iva: this.iva(t, 'TRANSPORTE')
    });

    [['airportTransfers', 'Traslados de aeropuerto'],
     ['coachHire', 'Autocar privado'],
     ['internalTransport', 'Transporte interno']].forEach(([k, label]) => {
      const v = this.num(t[k]);
      if (v) L.push({
        block: 'TRANSPORTE', concept: label, detail: '',
        units: 1, unitPrice: v, iva: this.iva(t, 'TRANSPORTE')
      });
    });

    (t.activities || []).forEach(a => {
      if (a.isFree) return;
      const cost = this.num(a.costPerPerson);
      if (!cost) return;
      const n = a.playersOnly ? p.students : p.total;
      L.push({
        block: 'ACTIVIDADES', concept: a.name || 'Actividad',
        detail: (a.city ? a.city + ' · ' : '') + n + ' pax' + (a.playersOnly ? ' (solo jugadores)' : ''),
        units: n, unitPrice: cost, iva: this.iva(t, 'ACTIVIDADES')
      });
    });

    if (!t.noGuide) {
      const ng = this.num(t.numGuides), rate = this.num(t.guideDailyRate);
      if (ng && rate) L.push({
        block: 'GUIA', concept: 'Guía / tour director',
        detail: ng + ' x ' + days + ' días x ' + rate,
        units: ng * days, unitPrice: rate, iva: this.iva(t, 'GUIA')
      });
      [['guideFlights', 'Vuelos del guía'],
       ['guideAccommodation', 'Alojamiento del guía'],
       ['guideMeals', 'Manutención del guía']].forEach(([k, label]) => {
        const v = this.num(t[k]);
        if (v) L.push({
          block: 'GUIA', concept: label, detail: '',
          units: 1, unitPrice: v, iva: this.iva(t, 'GUIA')
        });
      });
    }

    if (t.agentCommission && this.num(t.agentCommissionAmount) > 0) {
      const amt = this.num(t.agentCommissionAmount);
      if (t.agentCommissionType === 'per_person') {
        L.push({
          block: 'COMISIONES', concept: 'Comisión de agencia',
          detail: p.total + ' pax x ' + amt,
          units: p.total, unitPrice: amt, iva: this.iva(t, 'COMISIONES'), origin: 'TARIFA'
        });
      } else {
        const subtotal = L.reduce((s, l) => s + l.units * l.unitPrice, 0);
        L.push({
          block: 'COMISIONES', concept: 'Comisión de agencia',
          detail: amt + '% sobre ' + Math.round(subtotal),
          units: 1, unitPrice: subtotal * (amt / 100), iva: this.iva(t, 'COMISIONES'), origin: 'TARIFA'
        });
      }
    }

    return L;
  },

  /* -- Hoja 2 · coste real ---------------------------------------------------- */

  sheetActual(t) {
    const rows = [];
    const push = (...c) => rows.push(c);

    push('COSTE REAL · ' + (t.tourName || ''));
    push('Lo que se ha facturado y pagado de verdad. Es lo que hace defendible el margen del tour');
    push('y lo que se vuelca a 00-business/tour-ledger.csv al cerrar.');
    push('');
    push('PROVEEDOR', 'CATEGORÍA', 'DESCRIPCIÓN', 'IMPORTE', 'FACTURA', 'REF.', 'PAGADO', 'FECHA PAGO', 'NOTAS');

    let total = 0, paid = 0;
    (t.providerExpenses || []).forEach(e => {
      const amt = this.num(e.amount);
      total += amt;
      if (e.paid) paid += this.num(e.paidAmount) || amt;
      push(e.providerName || '', e.category || '', e.description || '', amt,
           e.invoiceReceived ? 'Sí' : 'No', e.invoiceRef || '',
           e.paid ? 'Sí' : 'No', e.paidDate || '', e.notes || '');
    });

    push('');
    push('', '', 'TOTAL FACTURADO', total);
    push('', '', 'TOTAL PAGADO', paid);
    push('', '', 'PENDIENTE DE PAGO', total - paid);

    const c = t.costs || {};
    if (c.grand) {
      push('');
      push('', '', 'Estimación del presupuesto', this.num(c.grand));
      push('', '', 'Desviación (real - presupuesto)', total - this.num(c.grand));
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
