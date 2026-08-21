/* === DATA LAYER — localStorage CRUD === */
const DB = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem('odisea_' + key)) || []; }
    catch { return []; }
  },
  _getAll(key) {
    // Returns ALL items including soft-deleted (for sync)
    return this._get(key);
  },
  _set(key, data) {
    localStorage.setItem('odisea_' + key, JSON.stringify(data));
  },
  _nextId(key) {
    const items = this._get(key);
    const maxLocal = items.length ? Math.max(...items.map(i => i.id || 0)) : 0;
    const maxRemote = (this._remoteMaxIds && this._remoteMaxIds[key]) || 0;
    const ts = Date.now();
    return Math.max(maxLocal + 1, maxRemote + 1, ts);
  },
  _remoteMaxIds: {},
  _pushToFirestore(collection, item) {
    if (!this._firebaseReady || !this.auth || !this.auth.currentUser) return;
    const clean = JSON.parse(JSON.stringify(item));
    if (clean.providerExpenses) {
      clean.providerExpenses.forEach(e => {
        if (e.invoiceFile) e.invoiceFile = { name: e.invoiceFile.name, uploadedAt: e.invoiceFile.uploadedAt };
      });
    }
    this.firestore.collection(collection).doc(String(item.id))
      .set(clean, { merge: true }).catch(err => console.warn('Push failed:', err.message));
    if (collection === 'tours') this._pushPortalProjection(clean);
    if (collection === 'invoices') this._pushInvoiceProjection(clean);
  },

  // ── PUBLIC PORTAL PROJECTION ──────────────────────────────────────────────
  // The family portal and the guide app run unauthenticated: an access code is
  // the only thing between a visitor and the data. Firestore rules can allow or
  // deny a whole document but cannot hide individual fields, so the tour doc is
  // now admin-only and the portal reads this cut-down copy instead.
  //
  // NEVER add a cost, price, margin or another family's contact detail below.
  // The tour doc carries costs.margin, costs.profit, costs.totalRevenue,
  // providerExpenses[].amount and individualClients[].amountDue. None of that
  // may ever reach a client's browser.
  PORTAL_SAFE_FIELDS: [
    'id', 'tourName', 'status', 'destination', 'destinations',
    'startDate', 'endDate', 'nights',
    'groupName', 'school', 'organization', 'currency',
    'clientName', 'clientEmail', 'clientPhone',
    'itinerary', 'inclusions', 'requiredForms',
    'roomPlan', 'roomType', 'roomingSummary', 'mealPlan',
    'numStudents', 'numSiblings', 'numAdults', 'numFOC', 'numRooms',
    'flights', 'flightLegs', 'tourFlightDetails',
    'portalPaymentWise', 'portalPaymentCard'
  ],

  _buildPortalProjection(t) {
    const out = {};
    this.PORTAL_SAFE_FIELDS.forEach(k => { if (t[k] !== undefined) out[k] = t[k]; });

    // Hotels: where they sleep, not what the bed costs. rooms[] is rebuilt
    // field by field rather than passed through - it carries costPerNight.
    out.hotels = (t.hotels || []).map(h => ({
      hotelName: h.hotelName || '', city: h.city || '', nights: h.nights || 0,
      starRating: h.starRating || '', mealPlan: h.mealPlan || '',
      hotelConfirmed: !!h.hotelConfirmed,
      rooms: (h.rooms || []).map(r => ({ type: r.type || '', qty: r.qty || 0 }))
    }));

    // Activities: what happens, not what it cost.
    out.activities = (t.activities || []).map(a => ({
      name: a.name || '', day: a.day || '', destination: a.destination || '',
      playersOnly: !!a.playersOnly, isFree: !!a.isFree
    }));

    // The guide app needs provider names and contacts, never the amounts.
    out.providerContacts = (t.providerExpenses || []).map(p => ({
      providerId: p.providerId || null, providerName: p.providerName || '',
      category: p.category || '', description: p.description || ''
    }));

    // Families: only what the portal actually renders (name + headcount).
    // Strips every family's email, phone, amountDue and notes.
    out.individualClients = (t.individualClients || []).map(ic => ({
      id: ic.id, name: ic.name || '', group: ic.group || '',
      numStudents: ic.numStudents || 0, numAdults: ic.numAdults || 0,
      numSiblings: ic.numSiblings || 0
    }));

    // Deliberately absent: familyAccessCodes. One family's code must not be a
    // key to every other family's code. The portal learns its own familyId from
    // the accessCodes lookup instead.
    out._projectedAt = new Date().toISOString();
    return out;
  },

  _pushPortalProjection(t) {
    if (!this._firebaseReady || !this.auth || !this.auth.currentUser) return;
    const tourId = String(t.id);
    this.firestore.collection('tours').doc(tourId)
      .collection('portal').doc('public')
      .set(this._buildPortalProjection(t), { merge: false })
      .catch(err => console.warn('Portal projection push failed:', err.message));
    this._pushAccessCodeDocs(t);
  },

  // One document per access code, keyed BY the code. Rules allow `get` but not
  // `list`, so the code has to be known up front - it can no longer be found by
  // querying the tours collection, which is what made every tour enumerable.
  _pushAccessCodeDocs(t) {
    if (!this._firebaseReady || !this.auth || !this.auth.currentUser) return;
    const tourId = String(t.id);
    const write = (code, payload) => {
      if (!code) return;
      this.firestore.collection('accessCodes').doc(String(code))
        .set(Object.assign({ tourId: tourId, updatedAt: new Date().toISOString() }, payload),
             { merge: true })
        .catch(err => console.warn('Access code doc failed:', err.message));
    };
    write(t.accessCode, { kind: 'tour', familyId: null });
    write(t.guideAccessCode, { kind: 'guide', familyId: null });
    Object.entries(t.familyAccessCodes || {}).forEach(([familyId, entry]) => {
      if (entry && entry.code) write(entry.code, { kind: 'family', familyId: String(familyId) });
    });
  },

  // Invoices live in a root collection the portal must no longer be able to
  // list. This mirrors the few fields the payments screen shows under the tour.
  _pushInvoiceProjection(inv) {
    if (!this._firebaseReady || !this.auth || !this.auth.currentUser) return;
    if (!inv.tourId) return;
    this.firestore.collection('tours').doc(String(inv.tourId))
      .collection('portalInvoices').doc(String(inv.id))
      .set({
        id: inv.id, number: inv.number || '', tourId: inv.tourId,
        individualClientRef: inv.individualClientRef != null ? String(inv.individualClientRef) : null,
        amount: Number(inv.amount) || 0, currency: inv.currency || 'EUR',
        issueDate: inv.issueDate || '', dueDate: inv.dueDate || '',
        status: inv.status || '', description: inv.description || '',
        payments: (inv.payments || []).map(p => ({
          amount: Number(p.amount) || 0, date: p.date || '', method: p.method || ''
        })),
        _projectedAt: new Date().toISOString()
      }, { merge: false })
      .catch(err => console.warn('Invoice projection push failed:', err.message));
  },

  // Backfills projections + access-code docs for every tour and invoice already
  // in Firestore. Run once from the CRM console while signed in:
  //   await DB.migratePortalProjections()
  async migratePortalProjections() {
    if (!this._firebaseReady || !this.auth || !this.auth.currentUser) {
      console.error('Sign in to the CRM first.');
      return { ok: false };
    }
    const tours = await this.firestore.collection('tours').get();
    let t = 0;
    for (const doc of tours.docs) {
      const data = Object.assign({ id: doc.id }, doc.data());
      await this.firestore.collection('tours').doc(doc.id)
        .collection('portal').doc('public')
        .set(this._buildPortalProjection(data), { merge: false });
      this._pushAccessCodeDocs(data);
      t++;
    }
    const invoices = await this.firestore.collection('invoices').get();
    let i = 0;
    for (const doc of invoices.docs) {
      const data = Object.assign({ id: doc.id }, doc.data());
      if (!data.tourId) continue;
      this._pushInvoiceProjection(data);
      i++;
    }
    console.log(`Migrated ${t} tour projection(s) and ${i} invoice projection(s).`);
    return { ok: true, tours: t, invoices: i };
  },
  _softDelete(key, id) {
    // Remove from localStorage
    const items = this._get(key);
    this._set(key, items.filter(x => x.id !== id));
    // Delete from Firestore + record deletion so all devices know
    if (this._firebaseReady) {
      this.firestore.collection(key).doc(String(id)).delete().catch(() => {});
      this.firestore.collection('_deletions').doc(key + '_' + id).set({
        collection: key, itemId: id, deletedAt: new Date().toISOString()
      }).catch(() => {});
    }
  },

  // Get all deletion records from Firestore
  async getDeletions() {
    if (!this._firebaseReady) return [];
    try {
      const snap = await this.firestore.collection('_deletions').get();
      const items = [];
      snap.forEach(doc => items.push(doc.data()));
      return items;
    } catch (e) { return []; }
  },

  // QUOTES
  getQuotes() { return this._get('quotes').filter(q => !q._deleted); },
  saveQuote(q) {
    const quotes = this.getQuotes();
    if (q.id) {
      const idx = quotes.findIndex(x => x.id === q.id);
      if (idx >= 0) quotes[idx] = q; else quotes.push(q);
    } else {
      q.id = this._nextId('quotes');
      q.createdAt = new Date().toISOString();
      quotes.push(q);
    }
    q.updatedAt = new Date().toISOString();
    this._set('quotes', quotes);
    this._pushToFirestore('quotes', q);
    return q;
  },
  deleteQuote(id) {
    this._softDelete('quotes', id);
  },

  // TOURS
  getTours() { return this._get('tours').filter(t => !t._deleted); },
  saveTour(t) {
    const tours = this.getTours();
    if (t.id) {
      const idx = tours.findIndex(x => x.id === t.id);
      if (idx >= 0) tours[idx] = t; else tours.push(t);
    } else {
      t.id = this._nextId('tours');
      t.createdAt = new Date().toISOString();
      tours.push(t);
    }
    t.updatedAt = new Date().toISOString();
    this._set('tours', tours);
    this._pushToFirestore('tours', t);
    return t;
  },
  deleteTour(id) {
    this._softDelete('tours', id);
  },

  // INVOICES
  getInvoices() { return this._get('invoices').filter(i => !i._deleted); },
  saveInvoice(inv) {
    const invoices = this.getInvoices();
    if (inv.id) {
      const idx = invoices.findIndex(x => x.id === inv.id);
      if (idx >= 0) invoices[idx] = inv; else invoices.push(inv);
    } else {
      inv.id = this._nextId('invoices');
      inv.number = 'INV-' + String(inv.id).padStart(4, '0');
      inv.createdAt = new Date().toISOString();
      inv.payments = [];
      invoices.push(inv);
    }
    inv.updatedAt = new Date().toISOString();
    this._set('invoices', invoices);
    this._pushToFirestore('invoices', inv);
    return inv;
  },
  deleteInvoice(id) {
    this._softDelete('invoices', id);
  },

  // PROVIDERS
  getProviders() { return this._get('providers').filter(p => !p._deleted); },
  saveProvider(p) {
    const providers = this.getProviders();
    if (p.id) {
      const idx = providers.findIndex(x => x.id === p.id);
      if (idx >= 0) providers[idx] = p; else providers.push(p);
    } else {
      p.id = this._nextId('providers');
      providers.push(p);
    }
    this._set('providers', providers);
    this._pushToFirestore('providers', p);
    return p;
  },
  deleteProvider(id) {
    this._softDelete('providers', id);
  },

  // Deduplicate providers by normalised company name. Keeps the record
  // with the latest updatedAt (or createdAt if no update), merges any
  // missing scalar fields from the discarded copies, and soft-deletes
  // the rest so Firestore sync drops them across devices too.
  // Returns { groups, kept, removed, merged }.
  dedupProviders() {
    const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const all = this.getProviders();
    const groups = new Map();
    all.forEach(p => {
      const key = norm(p.companyName);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    let removed = 0;
    let merged = 0;
    let groupCount = 0;
    groups.forEach(items => {
      if (items.length < 2) return;
      groupCount++;
      // Pick the survivor: latest updatedAt → latest createdAt → highest id
      const sorted = [...items].sort((a, b) => {
        const at = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
        if (bt !== at) return bt - at;
        return (b.id || 0) - (a.id || 0);
      });
      const survivor = sorted[0];
      const losers = sorted.slice(1);

      // Merge: fill survivor's empty scalar fields from any loser that has them
      const scalarKeys = ['contactPerson','email','phone','website','category','city','starRating','ourRating','ourReview','notes'];
      let mergedAny = false;
      losers.forEach(l => {
        scalarKeys.forEach(k => {
          if ((survivor[k] === undefined || survivor[k] === '' || survivor[k] === null || survivor[k] === 0)
              && l[k] !== undefined && l[k] !== '' && l[k] !== null && l[k] !== 0) {
            survivor[k] = l[k];
            mergedAny = true;
          }
        });
      });
      if (mergedAny) {
        this.saveProvider(survivor);
        merged++;
      }
      // Also move any rate sheets that point to the loser → point to survivor
      const rates = this.getRates();
      let ratesMoved = 0;
      rates.forEach(r => {
        if (losers.some(l => Number(l.id) === Number(r.providerId))) {
          r.providerId = survivor.id;
          this.saveRate(r);
          ratesMoved++;
        }
      });
      if (ratesMoved > 0) console.log(`[dedup] moved ${ratesMoved} rate sheets onto survivor "${survivor.companyName}"`);

      losers.forEach(l => {
        this._softDelete('providers', l.id);
        removed++;
      });
    });
    if (removed > 0) console.log(`[dedup] kept ${groupCount} survivors, removed ${removed}, merged data on ${merged}`);
    return { groups: groupCount, kept: groupCount, removed, merged };
  },

  // RATES — rate sheets linked to providers (one provider can have N rates: room types, seasons, products)
  getRates() { return this._get('rates').filter(r => !r._deleted); },
  getRatesForProvider(providerId) {
    return this.getRates()
      .filter(r => Number(r.providerId) === Number(providerId))
      .sort((a, b) => {
        const seasonOrder = ['all_year', 'low', 'shoulder', 'high', 'peak'];
        const so = seasonOrder.indexOf(a.season || 'all_year') - seasonOrder.indexOf(b.season || 'all_year');
        if (so !== 0) return so;
        return (a.productName || '').localeCompare(b.productName || '');
      });
  },
  saveRate(r) {
    const rates = this.getRates();
    if (r.id) {
      const idx = rates.findIndex(x => x.id === r.id);
      if (idx >= 0) rates[idx] = r; else rates.push(r);
    } else {
      r.id = this._nextId('rates');
      r.createdAt = new Date().toISOString();
      rates.push(r);
    }
    r.updatedAt = new Date().toISOString();
    this._set('rates', rates);
    this._pushToFirestore('rates', r);
    return r;
  },
  deleteRate(id) {
    this._softDelete('rates', id);
  },

  // PASSENGERS
  getPassengers() { return this._get('passengers').filter(p => !p._deleted); },
  savePassenger(p) {
    const passengers = this.getPassengers();
    if (p.id) {
      const idx = passengers.findIndex(x => x.id === p.id);
      if (idx >= 0) passengers[idx] = p; else passengers.push(p);
    } else {
      p.id = this._nextId('passengers');
      passengers.push(p);
    }
    this._set('passengers', passengers);
    return p;
  },
  deletePassenger(id) {
    this._softDelete('passengers', id);
  },

  // CLIENTS
  getClients() { return this._get('clients').filter(c => !c._deleted); },
  saveClient(c) {
    const clients = this.getClients();
    if (c.id) {
      const idx = clients.findIndex(x => x.id === c.id);
      if (idx >= 0) clients[idx] = c; else clients.push(c);
    } else {
      c.id = this._nextId('clients');
      c.createdAt = new Date().toISOString();
      clients.push(c);
    }
    c.updatedAt = new Date().toISOString();
    this._set('clients', clients);
    this._pushToFirestore('clients', c);
    return c;
  },
  deleteClient(id) {
    this._softDelete('clients', id);
  },

  // LEADS — top of funnel (cold prospects worked by Ramy/Juan)
  getLeads() { return this._get('leads').filter(l => !l._deleted); },
  saveLead(l) {
    const leads = this.getLeads();
    if (l.id) {
      const idx = leads.findIndex(x => x.id === l.id);
      if (idx >= 0) leads[idx] = l; else leads.push(l);
    } else {
      l.id = this._nextId('leads');
      l.createdAt = new Date().toISOString();
      if (!l.status) l.status = 'Cold';
      if (!l.owner) l.owner = 'Ramy';
      if (!l.contactCount) l.contactCount = 0;
      if (!l.history) l.history = [];
      leads.push(l);
    }
    l.updatedAt = new Date().toISOString();
    this._set('leads', leads);
    this._pushToFirestore('leads', l);
    return l;
  },
  deleteLead(id) {
    this._softDelete('leads', id);
  },
  // Bulk-import dedupes by email (case-insensitive), falling back to name+phone
  bulkSaveLeads(rows) {
    const leads = this.getLeads();
    const byEmail = new Map();
    const byKey = new Map();
    leads.forEach(l => {
      if (l.email) byEmail.set(l.email.toLowerCase().trim(), l);
      const k = (l.name || '').toLowerCase().trim() + '|' + (l.phone || '').replace(/\D/g, '');
      if (k !== '|') byKey.set(k, l);
    });
    let added = 0, skipped = 0;
    rows.forEach(row => {
      const email = (row.email || '').toLowerCase().trim();
      const k = (row.name || '').toLowerCase().trim() + '|' + (row.phone || '').replace(/\D/g, '');
      if ((email && byEmail.has(email)) || (k !== '|' && byKey.has(k))) {
        skipped++;
        return;
      }
      const lead = {
        name: row.name || '',
        league: row.league || '',
        country: row.country || '',
        state: row.state || '',
        city: row.city || '',
        contactName: row.contact_name || row.contactName || '',
        contactTitle: row.contact_title || row.contactTitle || '',
        email: row.email || '',
        phone: row.phone || '',
        website: row.website || '',
        source: row.source || 'Imported',
        notes: row.notes || '',
        warning: row.WARNING || row.warning || '',
        status: 'Cold',
        owner: 'Ramy',
        lastContactAt: '',
        nextActionAt: '',
        contactCount: 0,
        history: [],
      };
      DB.saveLead(lead);
      if (lead.email) byEmail.set(lead.email.toLowerCase().trim(), lead);
      added++;
    });
    return { added, skipped };
  },

  // EMAIL LOG
  getEmailLog() { return this._get('emaillog'); },
  logEmail(entry) {
    const log = this.getEmailLog();
    entry.id = this._nextId('emaillog');
    entry.sentAt = new Date().toISOString();
    log.unshift(entry);
    this._set('emaillog', log);
    return entry;
  },

  // SEED PROVIDERS
  // ⚠️ NEVER call this automatically on boot. The guard below reads localStorage,
  // which is empty on any fresh browser, new Chrome profile, cleared cache or
  // incognito window — and Firestore has NOT synced down yet at init time. The
  // old auto-call therefore re-seeded these 101 demo rows with fresh Date.now()
  // ids and pushed them up as new documents. It fired 16 times between Feb and
  // Aug 2026 and left `providers` at 1,725 docs for 210 real suppliers.
  // Also note: the contact emails/phones in this seed are DEMO DATA, not verified
  // suppliers. An earlier batch of similar invented addresses hard-bounced 11 of
  // 15 times (see _fixMadrid4StarGroupHotelEmails). Do not email them.
  seedProviders({ force = false } = {}) {
    if (!force) return 0;                              // opt-in only
    if (this._firebaseReady) return 0;                 // Firestore is the source of truth
    if (localStorage.getItem('odisea_providers_seeded')) return 0;
    if (this.getProviders().length > 0) return 0;      // only seed if empty
    localStorage.setItem('odisea_providers_seeded', new Date().toISOString());
    const seed = [
      // ── Madrid Hotels ──
      { companyName: 'Hotel Mayorazgo', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelmayorazgo.com', notes: 'Gran Vía location, group-friendly' },
      { companyName: 'Hotel Príncipe Pío', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.principepio.com', notes: 'Near Príncipe Pío station' },
      { companyName: 'Hotel Paseo del Arte', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelpaseodelarte.com', notes: 'Museum district, modern rooms' },
      { companyName: 'Hostal Persal', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.hostalpersal.com', notes: 'Budget option, Plaza del Ángel' },
      { companyName: 'Hotel Europa', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hoteleuropa.es', notes: 'Puerta del Sol area' },
      { companyName: 'Hotel Preciados', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.preciadoshotel.com', notes: 'Callao area, recently renovated, good group rates' },
      { companyName: 'Hotel Regina', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelreginamadrid.com', notes: 'Alcalá street, classic building, conference rooms' },
      { companyName: 'Hotel Ganivet', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelganivet.com', notes: 'Near Atocha station, great value for groups' },
      { companyName: 'Hotel Liabeny', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.liabeny.es', notes: 'Gran Vía, rooftop terrace, 220 rooms' },
      { companyName: 'Hotel Puerta de Toledo', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelpuertatoledo.com', notes: 'Budget-friendly, near La Latina, large capacity' },
      { companyName: 'Hotel Courtyard Madrid Princesa', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.marriott.com/hotels/travel/madcy', notes: 'Princesa street, Marriott chain, reliable for groups' },
      { companyName: 'Hotel NH Madrid Atocha', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.nh-hotels.com', notes: 'Next to Atocha AVE station, 111 rooms' },
      { companyName: 'Hotel Catalonia Gran Vía', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Gran Vía landmark building, rooftop pool' },
      { companyName: 'Hotel Petit Palace Puerta del Sol', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Central Sol, bike rental, modern rooms' },
      { companyName: 'Generator Madrid', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://staygenerator.com/hostels/madrid', notes: 'Youth hostel style, great for student groups, near Gran Vía' },
      { companyName: 'Hotel Claridge', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelclaridge.es', notes: 'Retiro Park area, classic style, 150 rooms' },
      { companyName: 'Hotel Agumar', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelagumar.com', notes: 'Near Atocha, 252 rooms, conference facilities' },
      { companyName: 'Hotel Francisco I', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelfrancisco1.com', notes: 'Arenal street, near Opera, 58 rooms, boutique feel' },
      { companyName: 'Hotel Moderno', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotel-moderno.com', notes: 'Puerta del Sol, traditional, 97 rooms' },
      { companyName: 'Hotel Best Triton', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.besthotels.es', notes: 'Budget chain, functional rooms, good for large groups' },
      { companyName: 'Hotel Abba Madrid', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Castellana area, 145 rooms, business-friendly' },
      { companyName: 'Hotel Ibis Madrid Centro', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor chain, Leganitos street, 116 rooms' },
      { companyName: 'Hotel Senator Gran Vía', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Gran Vía, rooftop with views, 162 rooms' },
      { companyName: 'Hotel Nuevo Madrid', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelnuevomadrid.com', notes: 'North Madrid, near IFEMA, 68 rooms, quiet area' },
      // ── Madrid Transport ──
      { companyName: 'Alsa Bus', category: 'Transport', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.alsa.es', notes: 'Major national coach operator' },
      { companyName: 'Autocares Julián de Castro', category: 'Transport', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.juliandecastro.es', notes: 'Private coach hire, school groups specialist' },
      { companyName: 'Monbus Madrid', category: 'Transport', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.monbus.es', notes: 'Coach hire and transfers' },
      { companyName: 'Avanza Bus', category: 'Transport', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.avanzabus.com', notes: 'Intercity and private hire' },
      // ── Barcelona Hotels ──
      { companyName: 'Hotel Acta Voraport', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.actahotels.com', notes: 'Near port, good for groups' },
      { companyName: 'Hotel Barcelona Universal', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelbarcelonauniversal.com', notes: 'Las Ramblas area' },
      { companyName: 'Hostal Centric', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.hostalcentric.com', notes: 'Budget, central Eixample' },
      { companyName: 'Hotel Sant Agusti', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelsantagusti.com', notes: 'Historic, Plaza Sant Agustí' },
      { companyName: 'Hotel Catalonia Park Güell', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Near Park Güell, rooftop pool' },
      { companyName: 'Hotel ILUNION Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.ilunionhotels.com', notes: 'Beachfront Diagonal Mar, large capacity, accessible' },
      { companyName: 'Hotel Serhs Rivoli Rambla', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.serhshotels.com', notes: 'Las Ramblas, Art Deco style, 125 rooms' },
      { companyName: 'Hotel Gótico', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelgotico.com', notes: 'Gothic Quarter, historic building, central' },
      { companyName: 'Hotel Ronda Less', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.leshotels.com', notes: 'Near Plaça Universitat, modern, good group pricing' },
      { companyName: 'Hotel Catalonia Ramblas', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Top of Las Ramblas near Plaça Catalunya' },
      { companyName: 'Hotel NH Barcelona Centro', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.nh-hotels.com', notes: 'Eixample district, metro nearby, 156 rooms' },
      { companyName: 'Hotel Expo Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.expohotelbarcelona.com', notes: 'Sants area, near train station, large groups welcome' },
      { companyName: 'Generator Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://staygenerator.com/hostels/barcelona', notes: 'Gràcia district, perfect for student groups, terrace' },
      { companyName: 'Hotel Petit Palace Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Via Laietana, high-tech rooms, bike rental' },
      { companyName: 'Hotel Europark', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hoteleuropark.com', notes: 'Sagrada Familia area, 66 rooms, good value' },
      { companyName: 'Hotel HCC Regente', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hcchotels.com', notes: 'Rambla Catalunya, rooftop pool, 78 rooms' },
      { companyName: 'Hotel Abba Sants', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Next to Sants station, 140 rooms, ideal for arrivals by train' },
      { companyName: 'Hotel Ibis Barcelona Centro', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, Ronda Sant Pere, 70 rooms' },
      { companyName: 'Hotel Oriente Atiram', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.atiramhotels.com', notes: 'Las Ramblas historic hotel, 142 rooms, renovated' },
      { companyName: 'Hotel Silken Ramblas', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Upper Ramblas, modern, 116 rooms' },
      { companyName: 'Hotel Acta Antibes', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.actahotels.com', notes: 'Passeig de Gràcia area, great location, 71 rooms' },
      { companyName: 'Hotel Astoria', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.derbyhotels.com', notes: 'Diagonal avenue, Derby chain, 117 rooms' },
      { companyName: 'Hotel Sagrada Familia', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelsagradafamilia.com', notes: 'Steps from Sagrada Familia, 21 rooms, intimate' },
      { companyName: 'Hotel Senator Barcelona Spa', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Raval area, spa facilities, 56 rooms' },
      { companyName: 'St Christopher\'s Inn Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.st-christophers.co.uk', notes: 'Backpacker/student hostel, Sagrada Familia area, bar' },
      // ── Barcelona Transport ──
      { companyName: 'Autocares Monbus', category: 'Transport', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.monbus.es', notes: 'Coach hire and airport transfers' },
      { companyName: 'Julià Travel Barcelona', category: 'Transport', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.juliatravel.com', notes: 'Tour buses and private hire' },
      { companyName: 'Sagalés Bus', category: 'Transport', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.sagales.com', notes: 'Airport shuttle and group hire' },
      { companyName: 'Bus Barcelona Tours', category: 'Transport', city: 'Barcelona', contactPerson: '', email: '', phone: '', starRating: 0, website: '', notes: 'Sightseeing and private coaches' },
      // ── Valencia Hotels ──
      { companyName: 'Hotel Mediterráneo', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelmediterraneovalencia.com', notes: 'City centre, good value' },
      { companyName: 'Hotel Vincci Lys', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.vinccihoteles.com', notes: 'Near Plaza del Ayuntamiento' },
      { companyName: 'Hostal Antigua Morellana', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.hostalam.com', notes: 'Budget, old town charm' },
      { companyName: 'Hotel Sorolla Centro', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelsorollacentro.com', notes: 'Modern, near train station' },
      { companyName: 'Hotel Catalonia Excelsior', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.cataloniahotels.com', notes: 'Calle Barcelonina, central, good group rates' },
      { companyName: 'Hotel Primus Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.primusvalencia.com', notes: 'Near City of Arts and Sciences, modern design' },
      { companyName: 'Hotel NH Valencia Las Artes', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.nh-hotels.com', notes: 'Facing City of Arts and Sciences, 162 rooms' },
      { companyName: 'Hotel Ilunion Aqua 4', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.ilunionhotels.com', notes: 'Waterfront, near Marina, large event capacity' },
      { companyName: 'Hotel Petit Palace Germanías', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Near Mercado Central, bikes available' },
      { companyName: 'Hotel Serhs Del Port', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.serhshotels.com', notes: 'Port area, good for beach access, 44 rooms' },
      { companyName: 'Hotel Expo Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.expohotelvalencia.com', notes: 'Near Turia gardens, spacious, 378 rooms' },
      { companyName: 'Hotel One Shot Palacio Reina Victoria', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.oneshothotels.com', notes: 'Historic palace, Plaza del Ayuntamiento, boutique' },
      { companyName: 'Youth Hostel Center Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.centerhostels.com', notes: 'Budget student groups, Barrio del Carmen, dorms + private' },
      { companyName: 'Hotel Ayre Astoria Palace', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.ayrehoteles.com', notes: 'Plaza del Ayuntamiento, elegant, 204 rooms' },
      { companyName: 'Hotel Abba Acteon', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Near Turia gardens, modern, 188 rooms' },
      { companyName: 'Hotel Senator Parque Central', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Next to Parque Central, new build, 120 rooms' },
      { companyName: 'Hotel Ibis Valencia Palacio Congresos', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, near City of Arts, 137 rooms' },
      { companyName: 'Hotel Medium Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.mediumhoteles.com', notes: 'Central, Calle Moratín, 53 rooms, good value' },
      { companyName: 'Hotel Silken Puerta Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Modern building, near Ruzafa, 135 rooms' },
      { companyName: 'Hotel Kramer', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.hotelkramer.com', notes: 'Budget, central, near Estación del Norte, 11 rooms' },
      { companyName: 'Hotel Meliá Valencia', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.melia.com', notes: 'Palacio de Congresos area, luxury, 304 rooms, spa' },
      { companyName: 'Hotel Casual Valencia de las Artes', category: 'Hotel', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.casualhoteles.com', notes: 'Themed rooms, Barrio del Carmen, fun for young groups' },
      // ── Tenerife Hotels ──
      { companyName: 'Hotel Zentral Center', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.zentral.es', notes: 'Santa Cruz centre, modern, 47 rooms' },
      { companyName: 'Hotel Iberostar Heritage Grand Mencey', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 5, website: 'https://www.iberostar.com', notes: 'Santa Cruz, luxury colonial, 261 rooms, pool and gardens' },
      { companyName: 'Hotel Silken Atlántida', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Santa Cruz seafront, 142 rooms, near auditorium' },
      { companyName: 'Hotel Príncipe Paz', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelprincipepaz.com', notes: 'Santa Cruz centre, budget-friendly, 67 rooms' },
      { companyName: 'Hotel Taburiente', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.hoteltaburiente.com', notes: 'Santa Cruz, near park, 169 rooms, conference centre' },
      { companyName: 'Hotel Escuela Santa Cruz', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelescuelasantacruz.com', notes: 'Hospitality school hotel, great service, 42 rooms' },
      { companyName: 'Hotel Pelinor', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelpelinor.com', notes: 'Downtown Santa Cruz, simple, 73 rooms, good price' },
      { companyName: 'Hotel Adonis Plaza', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.adonishoteles.com', notes: 'Plaza de la Candelaria, central, 53 rooms' },
      { companyName: 'Hotel Contemporáneo', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.hotelcontemporaneo.com', notes: 'Santa Cruz, Rambla area, design hotel, 156 rooms' },
      { companyName: 'Hotel Puerto de la Cruz (Diamante Suites)', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.diamantesuites.com', notes: 'Puerto de la Cruz, all-inclusive option, 350 rooms' },
      { companyName: 'Hotel Tigaiga', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.tigaiga.com', notes: 'Puerto de la Cruz, gardens, views of Teide, 83 rooms' },
      { companyName: 'Hotel Beatriz Atlántida Spa', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.beatrizhoteles.com', notes: 'Puerto de la Cruz, spa, 284 rooms, family-friendly' },
      { companyName: 'Hotel Catalonia Punta del Rey', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Candelaria, beachfront, all-inclusive, 430 rooms, pools' },
      { companyName: 'Hotel Ibis Tenerife', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, Santa Cruz, near motorway, 80 rooms' },
      { companyName: 'Hotel Coral Los Silos', category: 'Hotel', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 3, website: 'https://www.coralhotels.com', notes: 'Northwest Tenerife, rural setting, pool, 24 rooms, excursions' },
      // ── Tenerife Transport ──
      { companyName: 'TITSA Tenerife', category: 'Transport', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.titsa.com', notes: 'Island public bus + group charter hire' },
      { companyName: 'Autocares Armas Tenerife', category: 'Transport', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.fredolsen.es', notes: 'Coach hire, inter-island ferries' },
      { companyName: 'Tenerife Bus Tours', category: 'Transport', city: 'Tenerife', contactPerson: '', email: '', phone: '', starRating: 0, website: '', notes: 'Sightseeing coaches, Teide excursions, private hire' },
      // ── Valencia Transport ──
      { companyName: 'Autocares HERCA', category: 'Transport', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.autocaresherca.com', notes: 'Regional coach hire' },
      { companyName: 'Transvía Valencia', category: 'Transport', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 0, website: '', notes: 'Private bus and minibus hire' },
      { companyName: 'Autocares Comes', category: 'Transport', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 0, website: 'https://www.tgcomes.es', notes: 'Coach hire, southern routes' },
      { companyName: 'Bus Valencia Group', category: 'Transport', city: 'Valencia', contactPerson: '', email: '', phone: '', starRating: 0, website: '', notes: 'Luxury coaches for groups' }
    ];
    seed.forEach(p => this.saveProvider(p));
    return seed.length;
  },

  // Toggle a provider in/out of the favourites shortlist.
  toggleFavorite(id) {
    const p = this.getProviders().find(x => x.id === id);
    if (!p) return null;
    p.favorite = !p.favorite;
    this.saveProvider(p);
    return p;
  },

  // Idempotent insert: affordable 4★ hotels across Madrid region for large groups.
  // All emails/phones/names verified 2026-04-22 from each hotel's own site or chain page.
  // Empty email = no published group inbox; use the website URL (contact form) or phone instead.
  seedMadrid4StarGroupHotels() {
    const existing = new Set(
      this.getProviders().map(p => (p.companyName || '').toLowerCase().trim())
    );
    const hotels = [
      // ── Central Madrid ──
      { companyName: 'Hotel Praga', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'hotel.praga@hsantos.es', phone: '+34 91 469 06 00', starRating: 4, website: 'https://www.hotelmadridpraga.com', notes: 'Antonio López 65, 428 rooms. Hotusa Hsantos group. Large-group workhorse, coach parking on-site, 8 meeting rooms.' },
      { companyName: 'Hotel Exe Moncloa', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 745 92 99', starRating: 4, website: 'https://www.eurostarshotels.com/exe-moncloa.html', notes: 'Arcipreste de Hita 10, Moncloa, 165 rooms. No published email — Eurostars chain, contact via web form or phone. Sports-team friendly.' },
      { companyName: 'Hotel Ilunion Pío XII', category: 'Hotel', city: 'Madrid', contactPerson: 'Eventos / Grupos', email: 'eventos@ilunionhotels.com', phone: '+34 911 081 396', starRating: 4, website: 'https://www.ilunionhotels.com/hotel-ilunion-pio-xii', notes: 'Pío XII area, 225 rooms, fully accessible. Email is Ilunion CHAIN-CENTRAL groups inbox (10+ rooms). Reference Pío XII in subject line.' },
      { companyName: 'Hotel Barceló Torre Arias', category: 'Hotel', city: 'Madrid', contactPerson: 'Group RFQ form', email: '', phone: '', starRating: 4, website: 'https://www.barcelo.com', notes: 'Julián Camarillo 19-21, San Blas, near IFEMA + Barajas. No published email — Barceló chain uses group RFQ form on barcelo.com. Customer service: sac8@barcelo.com.' },
      { companyName: 'voco Madrid Las Tablas (was Holiday Inn)', category: 'Hotel', city: 'Madrid', contactPerson: 'IHG contact form', email: '', phone: '', starRating: 4, website: 'https://www.ihg.com/voco/hotels/us/en/madrid/madhi/hoteldetail', notes: 'REBRANDED 2024: Holiday Inn Madrid Las Tablas → voco Madrid Las Tablas by IHG. North Madrid. No published email — IHG contact form only.' },
      { companyName: 'Hotel Rafaelhoteles Atocha', category: 'Hotel', city: 'Madrid', contactPerson: 'Eventos', email: 'events.atocha@rafaelhoteles.com', phone: '+34 91 468 81 00', starRating: 4, website: 'https://www.rafaelhoteles.com', notes: 'Méndez Álvaro 30, near Atocha AVE, 250 rooms. 1,000 m² of event space, 24h quote SLA. Triples available.' },
      { companyName: 'Hotel VP El Madroño', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'md@vphoteles.com', phone: '+34 911 83 18 10', starRating: 4, website: 'https://www.vphoteles.com', notes: 'General Díaz Porlier 101, Hortaleza, 100 rooms. Direct property email. Team-friendly.' },
      { companyName: 'Hotel Chamartín The One (was Weare Chamartín)', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservas', email: 'reservas@hotelchamartin.es', phone: '+34 91 334 49 00', starRating: 4, website: 'https://hotelchamartin.es', notes: 'Agustín de Foxá s/n, in Chamartín AVE station, 378 rooms (largest north-Madrid capacity). Weare brand domain expired, hotel now uses hotelchamartin.es.' },
      // ── Surroundings (Madrid metro / Comunidad de Madrid) ──
      { companyName: 'Hotel AC Coslada Aeropuerto', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'accoslada@ac-hotels.com', phone: '+34 91 746 27 30', starRating: 4, website: 'https://www.marriott.com/en-us/hotels/madco-ac-hotel-coslada-aeropuerto', notes: 'Coslada, 105 rooms, 8 km Barajas airport. Property email is on ac-hotels.com (NOT @marriott.com — that bounces). Banquet hall available.' },
      { companyName: 'Hotel Barceló Las Rozas (UNVERIFIED)', category: 'Hotel', city: 'Madrid', contactPerson: '', email: '', phone: '', starRating: 4, website: '', notes: 'PROPERTY NOT VERIFIED. No Barceló property exists in Las Rozas per chain site search. Closest options: Barceló Torre de Madrid (different location) or B&B Hotel Madrid Las Rozas (different chain). Recommend deleting this entry.' },
      { companyName: 'Hotel Eurostars Puerta Madrid (was Silken Puerta Madrid)', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 743 83 00', starRating: 4, website: 'https://www.eurostarshotels.com/eurostars-puerta-madrid.html', notes: 'REBRANDED: Silken → Eurostars Puerta Madrid. C. Juan Rizi 5, 28027 Madrid (NOT Alcalá de Henares as previously believed). No published email — Eurostars chain.' },
      { companyName: 'Hotel AC Alcalá de Henares', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 802 39 70', starRating: 4, website: 'https://www.marriott.com/en-us/hotels/madal-ac-hotel-alcala-de-henares', notes: 'Octavio Paz 25, Alcalá de Henares, 90 rooms, function room up to 1,000 pax. No published email — Marriott AC chain, contact form or phone.' },
      { companyName: 'Hotel Exe Getafe', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 601 18 00', starRating: 4, website: 'https://www.eurostarshotels.com/exe-getafe.html', notes: 'Chamberlain 1, Getafe, south metro. No published email — Eurostars chain, contact form or phone. Coach parking, near Cercanías.' },
      { companyName: 'Hotel Exe Gran Hotel Almenar (Las Rozas)', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 630 81 28', starRating: 4, website: 'https://www.eurostarshotels.com/exe-gran-hotel-almenar.html', notes: 'CORRECTED NAME (was Hotel Exe Las Rozas Boadilla, which does not exist). Real property: Exe Gran Hotel Almenar, Jaraiz 1, 28290 Las Rozas. No published email — Eurostars chain.' },
      { companyName: 'Hotel NH Madrid Las Tablas', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: '', phone: '+34 91 398 46 61', starRating: 4, website: 'https://www.nh-hotels.com/en/hotel/nh-madrid-las-tablas', notes: 'CORRECTED NAME (was NH Collection — actual brand is NH, not NH Collection). Av. Burgos 131, Las Tablas. 8 function rooms 8-70 pax. No published email — NH chain. Central inbox: nh.spain@nh-hotels.com.' }
    ];
    let added = 0;
    hotels.forEach(h => {
      if (!existing.has(h.companyName.toLowerCase().trim())) {
        this.saveProvider(h);
        added++;
      }
    });
    if (added > 0) console.log(`[providers] Added ${added} Madrid-region 4★ group hotels`);
    return added;
  },

  // One-shot fix: replaces the fabricated emails I (Claude) seeded on 2026-04-22.
  // 11 of 15 fabricated addresses hard-bounced. This walks existing records by their old
  // companyName, applies the verified email/phone/name/website, and is idempotent
  // (if the record already matches the verified value, it is a no-op).
  _fixMadrid4StarGroupHotelEmails() {
    const verified = [
      { oldName: 'Hotel Praga', newName: 'Hotel Praga', email: 'hotel.praga@hsantos.es', phone: '+34 91 469 06 00', website: 'https://www.hotelmadridpraga.com', notes: 'Antonio López 65, 428 rooms. Hotusa Hsantos group. Large-group workhorse, coach parking on-site, 8 meeting rooms.' },
      { oldName: 'Hotel Exe Moncloa', newName: 'Hotel Exe Moncloa', email: '', phone: '+34 91 745 92 99', website: 'https://www.eurostarshotels.com/exe-moncloa.html', notes: 'Arcipreste de Hita 10, Moncloa, 165 rooms. No published email, Eurostars chain, contact via web form or phone. Sports-team friendly.' },
      { oldName: 'Hotel Ilunion Pío XII', newName: 'Hotel Ilunion Pío XII', email: 'eventos@ilunionhotels.com', phone: '+34 911 081 396', website: 'https://www.ilunionhotels.com/hotel-ilunion-pio-xii', notes: 'Pío XII area, 225 rooms, fully accessible. Ilunion CHAIN-CENTRAL groups inbox (10+ rooms). Reference Pío XII in subject line.' },
      { oldName: 'Hotel Barceló Torre Arias', newName: 'Hotel Barceló Torre Arias', email: '', phone: '', website: 'https://www.barcelo.com', notes: 'Julián Camarillo 19-21, San Blas, near IFEMA + Barajas. No published email, Barceló chain uses group RFQ form. Customer service: sac8@barcelo.com.' },
      { oldName: 'Holiday Inn Madrid - Las Tablas', newName: 'voco Madrid Las Tablas (was Holiday Inn)', email: '', phone: '', website: 'https://www.ihg.com/voco/hotels/us/en/madrid/madhi/hoteldetail', notes: 'REBRANDED 2024: Holiday Inn Madrid Las Tablas to voco Madrid Las Tablas by IHG. North Madrid. No published email, IHG contact form only.' },
      { oldName: 'Hotel Rafaelhoteles Atocha', newName: 'Hotel Rafaelhoteles Atocha', email: 'events.atocha@rafaelhoteles.com', phone: '+34 91 468 81 00', website: 'https://www.rafaelhoteles.com', notes: 'Méndez Álvaro 30, near Atocha AVE, 250 rooms. 1,000 m² of event space, 24h quote SLA. Triples available.' },
      { oldName: 'Hotel VP El Madroño', newName: 'Hotel VP El Madroño', email: 'md@vphoteles.com', phone: '+34 911 83 18 10', website: 'https://www.vphoteles.com', notes: 'General Díaz Porlier 101, Hortaleza, 100 rooms. Direct property email. Team-friendly.' },
      { oldName: 'Hotel Weare Chamartín', newName: 'Hotel Chamartín The One (was Weare Chamartín)', email: 'reservas@hotelchamartin.es', phone: '+34 91 334 49 00', website: 'https://hotelchamartin.es', notes: 'Agustín de Foxá s/n, in Chamartín AVE station, 378 rooms (largest north-Madrid capacity). Weare brand domain expired, hotel now uses hotelchamartin.es.' },
      { oldName: 'Hotel AC Coslada Aeropuerto', newName: 'Hotel AC Coslada Aeropuerto', email: 'accoslada@ac-hotels.com', phone: '+34 91 746 27 30', website: 'https://www.marriott.com/en-us/hotels/madco-ac-hotel-coslada-aeropuerto', notes: 'Coslada, 105 rooms, 8 km Barajas airport. Property email on ac-hotels.com (NOT @marriott.com which bounces). Banquet hall available.' },
      { oldName: 'Hotel Barceló Las Rozas', newName: 'Hotel Barceló Las Rozas (UNVERIFIED)', email: '', phone: '', website: '', notes: 'PROPERTY NOT VERIFIED. No Barceló property exists in Las Rozas per chain site search. Closest: Barceló Torre de Madrid (different location) or B&B Hotel Madrid Las Rozas (different chain). Recommend deleting this entry.' },
      { oldName: 'Hotel Silken Puerta Madrid', newName: 'Hotel Eurostars Puerta Madrid (was Silken Puerta Madrid)', email: '', phone: '+34 91 743 83 00', website: 'https://www.eurostarshotels.com/eurostars-puerta-madrid.html', notes: 'REBRANDED: Silken to Eurostars Puerta Madrid. C. Juan Rizi 5, 28027 Madrid (NOT Alcalá de Henares as previously believed). No published email, Eurostars chain.' },
      { oldName: 'Hotel AC Alcalá de Henares', newName: 'Hotel AC Alcalá de Henares', email: '', phone: '+34 91 802 39 70', website: 'https://www.marriott.com/en-us/hotels/madal-ac-hotel-alcala-de-henares', notes: 'Octavio Paz 25, Alcalá de Henares, 90 rooms, function room up to 1,000 pax. No published email, Marriott AC chain, contact form or phone.' },
      { oldName: 'Hotel Exe Getafe', newName: 'Hotel Exe Getafe', email: '', phone: '+34 91 601 18 00', website: 'https://www.eurostarshotels.com/exe-getafe.html', notes: 'Chamberlain 1, Getafe, south metro. No published email, Eurostars chain. Coach parking, near Cercanías.' },
      { oldName: 'Hotel Exe Las Rozas Boadilla', newName: 'Hotel Exe Gran Hotel Almenar (Las Rozas)', email: '', phone: '+34 91 630 81 28', website: 'https://www.eurostarshotels.com/exe-gran-hotel-almenar.html', notes: 'CORRECTED NAME (was Hotel Exe Las Rozas Boadilla, which does not exist). Real property: Exe Gran Hotel Almenar, Jaraiz 1, 28290 Las Rozas. No published email, Eurostars chain.' },
      { oldName: 'Hotel NH Collection Madrid Las Tablas', newName: 'Hotel NH Madrid Las Tablas', email: '', phone: '+34 91 398 46 61', website: 'https://www.nh-hotels.com/en/hotel/nh-madrid-las-tablas', notes: 'CORRECTED NAME (real brand is NH, not NH Collection). Av. Burgos 131, Las Tablas. 8 function rooms 8-70 pax. No published email, NH chain. Central inbox: nh.spain@nh-hotels.com.' }
    ];
    const all = this.getProviders();
    let updated = 0;
    verified.forEach(v => {
      let p = all.find(x => x.companyName === v.oldName);
      if (!p && v.newName !== v.oldName) p = all.find(x => x.companyName === v.newName);
      if (!p) return;
      const same = (
        p.companyName === v.newName &&
        (p.email || '') === (v.email || '') &&
        (p.phone || '') === (v.phone || '') &&
        (p.website || '') === (v.website || '') &&
        (p.notes || '') === (v.notes || '')
      );
      if (same) return;
      p.companyName = v.newName;
      p.email = v.email || '';
      p.phone = v.phone || '';
      p.website = v.website || '';
      p.notes = v.notes || '';
      this.saveProvider(p);
      updated++;
    });
    if (updated > 0) console.log(`[providers] Fixed ${updated} Madrid 4★ hotel records (verified contacts 2026-04-22)`);
    return updated;
  },

  // Idempotent upgrade: Madrid-region coach operators for large groups.
  // Starter contact data — verify before outreach.
  seedMadridCoachOperators() {
    const existing = new Set(
      this.getProviders().map(p => (p.companyName || '').toLowerCase().trim())
    );
    const operators = [
      { companyName: 'Autocares Herranz', category: 'Transport', city: 'Madrid', contactPerson: 'Group Sales', email: 'grupos@autocaresherranz.com', phone: '+34 916 44 01 53', starRating: 0, website: 'https://www.autocaresherranz.com', notes: 'Alcorcón, one of the largest Madrid operators — school + sports groups, wide fleet (up to 70-seat)' },
      { companyName: 'Autocares Cevesa', category: 'Transport', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@cevesa.es', phone: '+34 916 51 52 18', starRating: 0, website: 'https://www.cevesa.es', notes: 'Historic Madrid coach operator — charter + regular lines, group hire' },
      { companyName: 'Grupo Ruiz', category: 'Transport', city: 'Madrid', contactPerson: 'Charter Dept', email: 'grupos@gruporuiz.com', phone: '+34 913 23 82 00', starRating: 0, website: 'https://www.gruporuiz.com', notes: 'Madrid metropolitan area, urban + discretionary coach hire, large fleet' },
      { companyName: 'Autocares Samar', category: 'Transport', city: 'Madrid', contactPerson: 'Group Bookings', email: 'grupos@samar.es', phone: '+34 918 26 08 20', starRating: 0, website: 'https://www.samar.es', notes: 'Madrid + Castilla-La Mancha, long history, tour + group specialist' },
      { companyName: 'Interbus Madrid', category: 'Transport', city: 'Madrid', contactPerson: 'Sales', email: 'comercial@interbus.es', phone: '+34 916 70 09 99', starRating: 0, website: 'https://www.interbus.es', notes: 'Airport transfers + group charter, Madrid-Toledo-Aranjuez corridor' },
      { companyName: 'Autocares La Veloz', category: 'Transport', city: 'Madrid', contactPerson: 'Group Sales', email: 'grupos@laveloz.com', phone: '+34 913 25 55 09', starRating: 0, website: 'https://www.laveloz.com', notes: 'Tour groups + discretionary hire, Madrid base, school trips' },
      { companyName: 'Autocares Cuadra', category: 'Transport', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@autocarescuadra.com', phone: '+34 913 84 04 38', starRating: 0, website: 'https://www.autocarescuadra.com', notes: 'Madrid tour coaches, school + cultural groups, executive coaches available' },
      { companyName: 'Autocares Blasán', category: 'Transport', city: 'Madrid', contactPerson: 'Charter Dept', email: 'info@autocaresblasan.com', phone: '+34 916 01 45 00', starRating: 0, website: 'https://www.autocaresblasan.com', notes: 'Madrid south metro, discretionary + group hire' },
      { companyName: 'Autocares Rueda', category: 'Transport', city: 'Madrid', contactPerson: 'Group Sales', email: 'grupos@autocaresrueda.com', phone: '+34 918 44 26 88', starRating: 0, website: 'https://www.autocaresrueda.com', notes: 'Madrid region coach hire, group + private transfer' },
      { companyName: 'Turismovil', category: 'Transport', city: 'Madrid', contactPerson: 'Sales', email: 'info@turismovil.com', phone: '+34 915 42 63 00', starRating: 0, website: 'https://www.turismovil.com', notes: 'Madrid tourist coach hire, guided tours, multilingual drivers available' }
    ];
    let added = 0;
    operators.forEach(o => {
      if (!existing.has(o.companyName.toLowerCase().trim())) {
        this.saveProvider(o);
        added++;
      }
    });
    if (added > 0) console.log(`[providers] Added ${added} Madrid coach operators`);
    return added;
  },

  // === FIREBASE PROPERTIES ===
  firestore: null,
  auth: null,
  storage: null,
  _firebaseReady: false,

  // Initialize Firebase app and services
  initFirebase() {
    try {
      if (typeof firebase === 'undefined' || !FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
        console.log('Firebase not configured — running in localStorage-only mode.');
        return;
      }
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      this.firestore = firebase.firestore();
      this.auth = firebase.auth();
      this.storage = firebase.storage();
      // Enable offline persistence
      this.firestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') console.warn('Firestore persistence: multiple tabs open.');
        else if (err.code === 'unimplemented') console.warn('Firestore persistence: browser not supported.');
      });
      this._firebaseReady = true;
      console.log('Firebase initialized successfully.');
    } catch (e) {
      console.warn('Firebase init failed:', e.message);
    }
  },

  // Sync localStorage collection → Firestore (batch)
  async syncToFirestore(collection, data) {
    if (!this._firebaseReady || !data || !data.length) return;
    try {
      // Firestore batch limit is 500 — split into chunks
      const BATCH_LIMIT = 450;
      for (let i = 0; i < data.length; i += BATCH_LIMIT) {
        const chunk = data.slice(i, i + BATCH_LIMIT);
        const batch = this.firestore.batch();
        chunk.forEach(item => {
          const docRef = this.firestore.collection(collection).doc(String(item.id));
          // Strip large base64 invoice files to avoid Firestore 1MB doc limit
          const clean = JSON.parse(JSON.stringify(item));
          if (clean.providerExpenses) {
            clean.providerExpenses.forEach(e => { if (e.invoiceFile) e.invoiceFile = { name: e.invoiceFile.name, uploadedAt: e.invoiceFile.uploadedAt }; });
          }
          batch.set(docRef, clean, { merge: true });
        });
        await batch.commit();
      }
      console.log(`Synced ${data.length} items to ${collection}.`);
    } catch (e) {
      console.warn(`Sync to Firestore (${collection}) failed:`, e.message);
    }
  },

  // Pull Firestore collection → merge into localStorage.
  // Returns { ok, items }. ok=false means we cannot trust `items` (query
  // failed or timed out). Callers must NOT compute "local-newer than remote"
  // deltas from a failed pull, otherwise they will mass-push the whole local DB.
  async pullFromFirestore(collection, { timeoutMs = 15000 } = {}) {
    if (!this._firebaseReady) return { ok: false, items: [] };
    try {
      const result = await Promise.race([
        this.firestore.collection(collection).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('pull-timeout')), timeoutMs))
      ]);
      const items = [];
      result.forEach(doc => items.push({ ...doc.data(), _firestoreId: doc.id }));
      return { ok: true, items };
    } catch (e) {
      console.warn(`Pull from Firestore (${collection}) failed:`, e.message);
      return { ok: false, items: [] };
    }
  },

  // Generate a unique access code for a tour
  generateAccessCode(tourName) {
    const base = (tourName || 'TOUR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return base + '-' + rand;
  },

  // Generate a unique family access code (F-prefix distinguishes from tour codes)
  generateFamilyAccessCode(familyName) {
    const base = (familyName || 'FMLY').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'F' + base + '-' + rand;
  },

  // Query Firestore for a tour by access code (tour code or family code).
  // Tries the SDK first with a timeout; falls back to a public REST query if the
  // SDK hangs or fails (e.g. iOS Safari + IndexedDB issues, corporate networks
  // blocking WebChannel). Rules allow public read on /tours, so REST works
  // unauthenticated with the same API key.
  async getTourByAccessCode(code) {
    const SDK_TIMEOUT_MS = 6000;
    if (this._firebaseReady) {
      try {
        return await Promise.race([
          this._lookupTourViaSdk(code),
          new Promise((_, reject) => setTimeout(() => reject(new Error('sdk-timeout')), SDK_TIMEOUT_MS))
        ]);
      } catch (e) {
        console.warn('Tour lookup SDK path failed, falling back to REST:', e.message);
      }
    }
    return await this._lookupTourViaRest(code);
  },

  // Resolve a code to its tour by reading accessCodes/{code} directly. This is a
  // `get` on a known document id, not a query over the tours collection, which
  // is what lets the rules forbid listing and stop tours being enumerable.
  async _lookupTourViaSdk(code) {
    const codeDoc = await this.firestore.collection('accessCodes').doc(String(code)).get();
    if (!codeDoc.exists) return await this._lookupTourLegacy(code);
    const entry = codeDoc.data() || {};
    if (!entry.tourId) return null;

    const projection = await this.firestore.collection('tours').doc(String(entry.tourId))
      .collection('portal').doc('public').get();
    if (!projection.exists) return null;

    return Object.assign({ id: String(entry.tourId) }, projection.data(), {
      _portalMode: entry.kind === 'family' ? 'family' : (entry.kind === 'guide' ? 'guide' : 'tour'),
      _familyId: entry.familyId ? String(entry.familyId) : null
    });
  },

  // Transitional: resolve a code the old way, by querying the tours collection.
  // Only reachable while accessCodes/{code} is missing, and only until the
  // hardened rules deny listing /tours. Safe to delete once every tour has been
  // through DB.migratePortalProjections().
  async _lookupTourLegacy(code) {
    try {
      const snapshot = await this.firestore.collection('tours')
        .where('accessCode', '==', code).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data(), _portalMode: 'tour', _familyId: null };
      }
      const guideSnap = await this.firestore.collection('tours')
        .where('guideAccessCode', '==', code).limit(1).get();
      if (!guideSnap.empty) {
        const doc = guideSnap.docs[0];
        return { id: doc.id, ...doc.data(), _portalMode: 'guide', _familyId: null };
      }
      const famSnapshot = await this.firestore.collection('tours')
        .where('familyAccessCodesList', 'array-contains', code).limit(1).get();
      if (!famSnapshot.empty) {
        const doc = famSnapshot.docs[0];
        const tourData = doc.data();
        let familyId = null;
        for (const [icId, entry] of Object.entries(tourData.familyAccessCodes || {})) {
          if (entry && entry.code === code) { familyId = icId; break; }
        }
        return { id: doc.id, ...tourData, _portalMode: 'family', _familyId: familyId };
      }
    } catch (e) {
      console.warn('Legacy code lookup failed (expected once rules are hardened):', e.message);
    }
    return null;
  },

  // Room plan is the one field an unauthenticated group leader may change.
  // Rules allow updating it on the tour doc while still refusing to let anyone
  // read that doc, so the CRM keeps a single source of truth; the projection is
  // written too so the portal sees its own edit before the CRM re-projects.
  async _savePortalRoomPlan(tourId, roomPlan) {
    const tourRef = this.firestore.collection('tours').doc(String(tourId));
    await tourRef.update({ roomPlan: roomPlan });
    try {
      await tourRef.collection('portal').doc('public').update({ roomPlan: roomPlan });
    } catch (e) { /* projection catches up on the next CRM save */ }
  },

  // Records that a code was used. Lives on the code document because the tour
  // itself is no longer writable - or readable - from the portal.
  async touchAccessCode(code) {
    if (!this._firebaseReady || !code) return;
    try {
      await this.firestore.collection('accessCodes').doc(String(code)).update({
        lastAccess: new Date().toISOString(),
        accessCount: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) { /* a stale or admin-revoked code should not break the portal */ }
  },

  async _lookupTourViaRest(code) {
    try {
      const cfg = (typeof FIREBASE_CONFIG !== 'undefined') ? FIREBASE_CONFIG : null;
      if (!cfg || !cfg.projectId || !cfg.apiKey) return null;
      // Two plain document reads: the code, then that tour's public projection.
      // No queries, so this keeps working once `list` is denied on /tours.
      const docBase = 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId
        + '/databases/(default)/documents/';
      const getDoc = (path) => fetch(docBase + path + '?key=' + encodeURIComponent(cfg.apiKey))
        .then(r => r.ok ? r.json() : null);

      const codeDoc = await getDoc('accessCodes/' + encodeURIComponent(code));
      if (!codeDoc || !codeDoc.fields) return null;
      const entry = DB._restFieldsToObj(codeDoc.fields);
      if (!entry.tourId) return null;

      const projDoc = await getDoc('tours/' + encodeURIComponent(entry.tourId) + '/portal/public');
      if (!projDoc || !projDoc.fields) return null;

      return Object.assign({ id: String(entry.tourId) }, DB._restFieldsToObj(projDoc.fields), {
        _portalMode: entry.kind === 'family' ? 'family' : (entry.kind === 'guide' ? 'guide' : 'tour'),
        _familyId: entry.familyId ? String(entry.familyId) : null
      });
    } catch (e) {
      console.warn('REST fallback failed:', e.message);
      return null;
    }
  },

  // Convert a Firestore REST `fields` map back into a plain JS object.
  _restFieldsToObj(fields) {
    if (!fields) return {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) out[k] = DB._restValue(v);
    return out;
  },
  _restValue(v) {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('mapValue' in v) return DB._restFieldsToObj(v.mapValue && v.mapValue.fields);
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(x => DB._restValue(x));
    if ('referenceValue' in v) return v.referenceValue;
    if ('geoPointValue' in v) return v.geoPointValue;
    return null;
  },

  // Get invoices for a specific family in a tour
  // Reads the per-tour projection, not the root invoices collection. Listing
  // /invoices is now admin-only: it held every client's billing across every
  // tour, and one portal code was enough to read the lot.
  async getTourInvoicesForFamily(tourId, familyId) {
    const all = await this.getTourInvoices(tourId);
    return all.filter(inv => String(inv.individualClientRef) === String(familyId));
  },

  // Real-time listener for family messages (group + this family's private)
  listenToFamilyMessages(tourId, familyId, callback) {
    if (!this._firebaseReady) return () => {};
    return this.firestore.collection('tours').doc(String(tourId))
      .collection('messages').orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const all = [];
        snapshot.forEach(doc => all.push({ id: doc.id, ...doc.data() }));
        // Filter: include group messages + this family's private messages
        const filtered = all.filter(m =>
          !m.type || m.type === 'group' ||
          (m.type === 'family' && String(m.familyId) === String(familyId))
        );
        callback(filtered, all);
      }, err => console.warn('Family message listener error:', err.message));
  },

  // Save a passenger to tour's subcollection (portal use)
  async saveTourPassenger(tourId, passenger) {
    if (!this._firebaseReady) return null;
    try {
      passenger.createdAt = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').add(passenger);
      // Try to increment unread count (may fail if user is unauthenticated)
      try {
        await this.firestore.collection('tours').doc(String(tourId)).update({
          unreadPassengersCount: firebase.firestore.FieldValue.increment(1)
        });
      } catch (_) { /* ignore — portal users lack write access to tour docs */ }
      return { id: ref.id, ...passenger };
    } catch (e) {
      console.warn('saveTourPassenger failed:', e.message);
      return null;
    }
  },

  // Update an existing passenger in tour subcollection
  async updateTourPassenger(tourId, passengerId, data) {
    if (!this._firebaseReady) return null;
    try {
      data.updatedAt = new Date().toISOString();
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').doc(passengerId).update(data);
      return { id: passengerId, ...data };
    } catch (e) {
      console.warn('updateTourPassenger failed:', e.message);
      return null;
    }
  },

  // Delete a passenger from tour subcollection
  async deleteTourPassenger(tourId, passengerId) {
    if (!this._firebaseReady) { console.error('deleteTourPassenger: Firebase not ready'); return false; }
    if (!passengerId) { console.error('deleteTourPassenger: no passengerId'); return false; }
    try {
      const docRef = this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').doc(String(passengerId));
      // Check if doc exists on server first (catches ghost cache data)
      try {
        const doc = await docRef.get({ source: 'server' });
        if (!doc.exists) {
          console.warn('deleteTourPassenger: doc not on server (ghost cache), clearing locally');
          // Force delete from local cache by issuing delete anyway
          await docRef.delete();
          return true;
        }
      } catch (_) {
        // If server check fails (offline), proceed with delete normally
      }
      await docRef.delete();
      return true;
    } catch (e) {
      console.error('deleteTourPassenger failed:', e.code, e.message);
      return false;
    }
  },

  // Get invoices for a tour from Firestore (server-first)
  async getTourInvoices(tourId) {
    if (!this._firebaseReady) return [];
    const ref = this.firestore.collection('tours').doc(String(tourId))
      .collection('portalInvoices');
    const collect = snapshot => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    };
    try {
      return collect(await ref.get({ source: 'server' }));
    } catch (e) {
      try { return collect(await ref.get({ source: 'cache' })); } catch (_) { return []; }
    }
  },

  // Get all passengers from tour subcollection (server-first to avoid stale cache)
  async getTourPassengers(tourId) {
    if (!this._firebaseReady) return [];
    // Soft-deleted records (_removed: true) must not surface to any caller —
    // counts, exports, view-registration tables, family portal lists, the
    // CRM checklist, etc. all want the live roster. If you ever need the
    // deleted set (e.g. restore UI), add a separate getTourPassengersDeleted.
    const live = arr => (arr || []).filter(p => !p._removed);
    try {
      // Try server first to get fresh data
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').orderBy('createdAt', 'desc').get({ source: 'server' });
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return live(items);
    } catch (e) {
      // Fallback to cache if offline
      console.warn('getTourPassengers server fetch failed, trying cache:', e.message);
      try {
        const snapshot = await this.firestore.collection('tours').doc(String(tourId))
          .collection('passengers').orderBy('createdAt', 'desc').get({ source: 'cache' });
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return live(items);
      } catch (e2) {
        console.warn('getTourPassengers cache also failed:', e2.message);
        return [];
      }
    }
  },

  // Send a message to tour's messages subcollection
  async sendTourMessage(tourId, message) {
    if (!this._firebaseReady) return null;
    try {
      message.timestamp = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('messages').add(message);
      // Try to increment unread count (may fail if user is unauthenticated)
      if (message.sender !== 'admin') {
        try {
          await this.firestore.collection('tours').doc(String(tourId)).update({
            unreadMessagesCount: firebase.firestore.FieldValue.increment(1)
          });
        } catch (_) { /* ignore — portal users lack write access to tour docs */ }
      }
      return { id: ref.id, ...message };
    } catch (e) {
      console.warn('sendTourMessage failed:', e.message);
      return null;
    }
  },

  // Get all messages from tour subcollection
  async getTourMessages(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('messages').orderBy('timestamp', 'asc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getTourMessages failed:', e.message);
      return [];
    }
  },

  // Real-time listener for messages
  listenToTourMessages(tourId, callback) {
    if (!this._firebaseReady) return () => {};
    return this.firestore.collection('tours').doc(String(tourId))
      .collection('messages').orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        callback(messages);
      }, err => console.warn('Message listener error:', err.message));
  },

  // Upload a document to Firebase Storage + save metadata to Firestore
  async uploadTourDocument(tourId, file) {
    if (!this._firebaseReady) return { error: 'Firebase not ready' };
    try {
      const path = `tours/${tourId}/${Date.now()}_${file.name}`;
      const ref = this.storage.ref(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      const meta = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
        storagePath: path,
        uploadedAt: new Date().toISOString()
      };
      const docRef = await this.firestore.collection('tours').doc(String(tourId))
        .collection('documents').add(meta);
      return { id: docRef.id, ...meta };
    } catch (e) {
      console.warn('uploadTourDocument failed:', e.code, e.message, e);
      return { error: (e.code ? e.code + ' — ' : '') + (e.message || 'unknown error') };
    }
  },

  // Get all documents for a tour
  async getTourDocuments(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('documents').orderBy('uploadedAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getTourDocuments failed:', e.message);
      return [];
    }
  },

  // Delete a document from Storage and Firestore
  async deleteTourDocument(tourId, docId, storagePath) {
    if (!this._firebaseReady) return;
    try {
      if (storagePath) await this.storage.ref(storagePath).delete();
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('documents').doc(docId).delete();
    } catch (e) {
      console.warn('deleteTourDocument failed:', e.message);
    }
  },

  // Reset unread counters on a tour
  async resetUnreadCount(tourId, field) {
    if (!this._firebaseReady) return;
    try {
      await this.firestore.collection('tours').doc(String(tourId)).update({ [field]: 0 });
    } catch (e) {
      console.warn('resetUnreadCount failed:', e.message);
    }
  },

  // Stamp the tour doc with "admin has seen guide messages up to now".
  // Briefing + dashboard compare message timestamps to this to count unread.
  async markGuideMessagesRead(tourId) {
    const now = new Date().toISOString();
    // Update local cache so next briefing/dashboard render clears the alert immediately
    const tours = this._get('tours');
    const idx = tours.findIndex(t => String(t.id) === String(tourId));
    if (idx >= 0) {
      tours[idx].lastGuideMsgSeenAt = now;
      this._set('tours', tours);
    }
    if (!this._firebaseReady) return;
    try {
      await this.firestore.collection('tours').doc(String(tourId)).update({
        lastGuideMsgSeenAt: now
      });
    } catch (e) {
      console.warn('markGuideMessagesRead failed:', e.message);
    }
  },

  // Generate a unique guide access code for a tour
  generateGuideAccessCode(tourName) {
    const base = (tourName || 'GUIDE').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return 'G' + base + '-' + rand;
  },

  // Query Firestore for a tour by guide access code
  async getTourByGuideAccessCode(code) {
    if (!this._firebaseReady) return null;
    try {
      const hit = await this._lookupTourViaSdk(code);
      return (hit && hit._portalMode === 'guide') ? hit : null;
    } catch (e) {
      console.warn('getTourByGuideAccessCode failed:', e.message);
      return null;
    }
  },

  // === GUIDE EXPENSES (subcollection: tours/{tourId}/guideExpenses) ===
  async saveGuideExpense(tourId, expense) {
    if (!this._firebaseReady) return null;
    try {
      expense.createdAt = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideExpenses').add(expense);
      return { id: ref.id, ...expense };
    } catch (e) {
      console.warn('saveGuideExpense failed:', e.message);
      return null;
    }
  },

  async getGuideExpenses(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideExpenses').orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getGuideExpenses failed:', e.message);
      return [];
    }
  },

  async deleteGuideExpense(tourId, expenseId) {
    if (!this._firebaseReady) return false;
    try {
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideExpenses').doc(expenseId).delete();
      return true;
    } catch (e) {
      console.warn('deleteGuideExpense failed:', e.message);
      return false;
    }
  },

  // === GUIDE NOTES (subcollection: tours/{tourId}/guideNotes) ===
  async saveGuideNote(tourId, note) {
    if (!this._firebaseReady) return null;
    try {
      note.createdAt = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideNotes').add(note);
      return { id: ref.id, ...note };
    } catch (e) {
      console.warn('saveGuideNote failed:', e.message);
      return null;
    }
  },

  async getGuideNotes(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideNotes').orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getGuideNotes failed:', e.message);
      return [];
    }
  },

  async deleteGuideNote(tourId, noteId) {
    if (!this._firebaseReady) return false;
    try {
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideNotes').doc(noteId).delete();
      return true;
    } catch (e) {
      console.warn('deleteGuideNote failed:', e.message);
      return false;
    }
  },

  // === GUIDE DOCUMENTS (subcollection: tours/{tourId}/guideDocuments) ===
  async uploadGuideDocument(tourId, file) {
    if (!this._firebaseReady) return null;
    try {
      const path = `tours/${tourId}/guide/${Date.now()}_${file.name}`;
      const ref = this.storage.ref(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      const meta = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
        storagePath: path,
        uploadedAt: new Date().toISOString()
      };
      const docRef = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideDocuments').add(meta);
      return { id: docRef.id, ...meta };
    } catch (e) {
      console.warn('uploadGuideDocument failed:', e.message);
      return null;
    }
  },

  async getGuideDocuments(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideDocuments').orderBy('uploadedAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getGuideDocuments failed:', e.message);
      return [];
    }
  },

  async deleteGuideDocument(tourId, docId, storagePath) {
    if (!this._firebaseReady) return;
    try {
      if (storagePath) await this.storage.ref(storagePath).delete();
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('guideDocuments').doc(docId).delete();
    } catch (e) {
      console.warn('deleteGuideDocument failed:', e.message);
    }
  },

  // === FAMILY FLIGHTS (subcollection: tours/{tourId}/familyFlights/{familyId}) ===
  async saveFamilyFlight(tourId, familyId, flightData) {
    if (!this._firebaseReady) return false;
    try {
      const now = new Date().toISOString();
      const data = { ...flightData, familyId: String(familyId), updatedAt: now };
      if (!flightData.createdAt) data.createdAt = now;
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('familyFlights').doc(String(familyId)).set(data, { merge: true });
      return true;
    } catch (e) {
      console.warn('saveFamilyFlight failed:', e.message);
      return false;
    }
  },

  async getFamilyFlight(tourId, familyId) {
    if (!this._firebaseReady) return null;
    try {
      const doc = await this.firestore.collection('tours').doc(String(tourId))
        .collection('familyFlights').doc(String(familyId)).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) {
      console.warn('getFamilyFlight failed:', e.message);
      return null;
    }
  },

  async getAllFamilyFlights(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('familyFlights').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getAllFamilyFlights failed:', e.message);
      return [];
    }
  },

  async saveTourFlights(tourId, flightData) {
    if (!this._firebaseReady) return false;
    try {
      const now = new Date().toISOString();
      const data = { ...flightData, updatedAt: now };
      if (!flightData.createdAt) data.createdAt = now;
      await this.firestore.collection('tours').doc(String(tourId))
        .collection('tourFlights').doc('shared').set(data, { merge: true });
      return true;
    } catch (e) {
      console.warn('saveTourFlights failed:', e.message);
      return false;
    }
  },

  async getTourFlights(tourId) {
    if (!this._firebaseReady) return null;
    try {
      const doc = await this.firestore.collection('tours').doc(String(tourId))
        .collection('tourFlights').doc('shared').get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) {
      console.warn('getTourFlights failed:', e.message);
      return null;
    }
  },

  // EXPORT / IMPORT ALL
  exportAll() {
    return JSON.stringify({
      quotes: this.getQuotes(),
      tours: this.getTours(),
      invoices: this.getInvoices(),
      providers: this.getProviders(),
      rates: this.getRates(),
      passengers: this.getPassengers(),
      clients: this.getClients(),
      emaillog: this.getEmailLog()
    }, null, 2);
  },
  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.quotes) this._set('quotes', data.quotes);
      if (data.tours) this._set('tours', data.tours);
      if (data.invoices) this._set('invoices', data.invoices);
      if (data.providers) this._set('providers', data.providers);
      if (data.rates) this._set('rates', data.rates);
      if (data.passengers) this._set('passengers', data.passengers);
      if (data.clients) this._set('clients', data.clients);
      if (data.emaillog) this._set('emaillog', data.emaillog);
      return true;
    } catch (e) {
      alert('Invalid file format');
      return false;
    }
  }
};

/* === UTILITY HELPERS === */
function fmt(amount, currency) {
  currency = currency || 'EUR';
  const sym = currency === 'USD' ? '$' : '\u20AC';
  return sym + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Sum of tracked actual provider expenses for a tour (0 if none tracked)
function tourActualCost(t) {
  return ((t && t.providerExpenses) || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
}
// Effective cost: actual provider costs when expenses are tracked, else the quote estimate
function tourEffectiveCost(t) {
  const a = tourActualCost(t);
  return a > 0 ? a : ((t && t.costs && t.costs.grand) || 0);
}
function tourHasActuals(t) { return tourActualCost(t) > 0; }
// Effective profit/margin using effective cost
function tourEffectiveProfit(t) {
  const rev = (t && t.costs && t.costs.totalRevenue) || 0;
  return rev - tourEffectiveCost(t);
}
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}
function badgeClass(status) {
  const map = {
    'Draft': 'badge-draft', 'Sent': 'badge-sent', 'Follow-up': 'badge-followup',
    'Confirmed': 'badge-confirmed', 'Lost': 'badge-lost',
    'Unpaid': 'badge-unpaid', 'Partial': 'badge-partial', 'Paid': 'badge-paid',
    'Preparing': 'badge-preparing', 'In Progress': 'badge-inprogress', 'Completed': 'badge-completed'
  };
  return map[status] || 'badge-draft';
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}
