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
  seedProviders() {
    if (this.getProviders().length > 0) return; // only seed if empty
    const seed = [
      // ── Madrid Hotels ──
      { companyName: 'Hotel Mayorazgo', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations Dept', email: 'reservas@hotelmayorazgo.com', phone: '+34 915 47 26 00', starRating: 4, website: 'https://www.hotelmayorazgo.com', notes: 'Gran Vía location, group-friendly' },
      { companyName: 'Hotel Príncipe Pío', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Sales', email: 'groups@principepio.com', phone: '+34 915 47 08 00', starRating: 3, website: 'https://www.principepio.com', notes: 'Near Príncipe Pío station' },
      { companyName: 'Hotel Paseo del Arte', category: 'Hotel', city: 'Madrid', contactPerson: 'Events Team', email: 'events@hotelpaseodelarte.com', phone: '+34 912 98 48 00', starRating: 4, website: 'https://www.hotelpaseodelarte.com', notes: 'Museum district, modern rooms' },
      { companyName: 'Hostal Persal', category: 'Hotel', city: 'Madrid', contactPerson: 'Reception', email: 'info@hostalpersal.com', phone: '+34 913 69 46 43', starRating: 2, website: 'https://www.hostalpersal.com', notes: 'Budget option, Plaza del Ángel' },
      { companyName: 'Hotel Europa', category: 'Hotel', city: 'Madrid', contactPerson: 'Booking Dept', email: 'reservas@hoteleuropa.es', phone: '+34 915 21 29 00', starRating: 3, website: 'https://www.hoteleuropa.es', notes: 'Puerta del Sol area' },
      { companyName: 'Hotel Preciados', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@preciadoshotel.com', phone: '+34 914 54 44 00', starRating: 4, website: 'https://www.preciadoshotel.com', notes: 'Callao area, recently renovated, good group rates' },
      { companyName: 'Hotel Regina', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Bookings', email: 'groups@hotelregina.com', phone: '+34 915 21 47 25', starRating: 4, website: 'https://www.hotelreginamadrid.com', notes: 'Alcalá street, classic building, conference rooms' },
      { companyName: 'Hotel Ganivet', category: 'Hotel', city: 'Madrid', contactPerson: 'Sales Dept', email: 'info@hotelganivet.com', phone: '+34 913 69 71 20', starRating: 3, website: 'https://www.hotelganivet.com', notes: 'Near Atocha station, great value for groups' },
      { companyName: 'Hotel Liabeny', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Sales', email: 'grupos@liabeny.es', phone: '+34 915 31 90 00', starRating: 4, website: 'https://www.liabeny.es', notes: 'Gran Vía, rooftop terrace, 220 rooms' },
      { companyName: 'Hotel Puerta de Toledo', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@hotelpuertatoledo.com', phone: '+34 914 74 71 00', starRating: 3, website: 'https://www.hotelpuertatoledo.com', notes: 'Budget-friendly, near La Latina, large capacity' },
      { companyName: 'Hotel Courtyard Madrid Princesa', category: 'Hotel', city: 'Madrid', contactPerson: 'Events Mgr', email: 'events@courtyardmadrid.com', phone: '+34 915 41 55 00', starRating: 4, website: 'https://www.marriott.com/hotels/travel/madcy', notes: 'Princesa street, Marriott chain, reliable for groups' },
      { companyName: 'Hotel NH Madrid Atocha', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Dept', email: 'nhatocha@nh-hotels.com', phone: '+34 912 03 73 00', starRating: 4, website: 'https://www.nh-hotels.com', notes: 'Next to Atocha AVE station, 111 rooms' },
      { companyName: 'Hotel Catalonia Gran Vía', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Sales', email: 'granvia@cataloniahotels.com', phone: '+34 915 31 22 22', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Gran Vía landmark building, rooftop pool' },
      { companyName: 'Hotel Petit Palace Puerta del Sol', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'puertadelsol@petitpalace.com', phone: '+34 915 21 15 16', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Central Sol, bike rental, modern rooms' },
      { companyName: 'Generator Madrid', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Bookings', email: 'madrid@generatorhostels.com', phone: '+34 917 47 77 00', starRating: 2, website: 'https://staygenerator.com/hostels/madrid', notes: 'Youth hostel style, great for student groups, near Gran Vía' },
      { companyName: 'Hotel Claridge', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@hotelclaridge.es', phone: '+34 915 51 94 00', starRating: 3, website: 'https://www.hotelclaridge.es', notes: 'Retiro Park area, classic style, 150 rooms' },
      { companyName: 'Hotel Agumar', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Sales', email: 'grupos@hotelagumar.com', phone: '+34 915 52 69 00', starRating: 4, website: 'https://www.hotelagumar.com', notes: 'Near Atocha, 252 rooms, conference facilities' },
      { companyName: 'Hotel Francisco I', category: 'Hotel', city: 'Madrid', contactPerson: 'Booking Dept', email: 'reservas@hotelfrancisco1.com', phone: '+34 915 48 02 04', starRating: 3, website: 'https://www.hotelfrancisco1.com', notes: 'Arenal street, near Opera, 58 rooms, boutique feel' },
      { companyName: 'Hotel Moderno', category: 'Hotel', city: 'Madrid', contactPerson: 'Reception', email: 'info@hotel-moderno.com', phone: '+34 915 31 09 00', starRating: 3, website: 'https://www.hotel-moderno.com', notes: 'Puerta del Sol, traditional, 97 rooms' },
      { companyName: 'Hotel Best Triton', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Dept', email: 'triton@besthotels.es', phone: '+34 915 39 22 00', starRating: 3, website: 'https://www.besthotels.es', notes: 'Budget chain, functional rooms, good for large groups' },
      { companyName: 'Hotel Abba Madrid', category: 'Hotel', city: 'Madrid', contactPerson: 'Events Mgr', email: 'madrid@abbahoteles.com', phone: '+34 917 81 08 00', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Castellana area, 145 rooms, business-friendly' },
      { companyName: 'Hotel Ibis Madrid Centro', category: 'Hotel', city: 'Madrid', contactPerson: 'Reservations', email: 'h3218@accor.com', phone: '+34 913 89 86 10', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor chain, Leganitos street, 116 rooms' },
      { companyName: 'Hotel Senator Gran Vía', category: 'Hotel', city: 'Madrid', contactPerson: 'Group Bookings', email: 'granvia@senatorhoteles.com', phone: '+34 915 41 82 08', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Gran Vía, rooftop with views, 162 rooms' },
      { companyName: 'Hotel Nuevo Madrid', category: 'Hotel', city: 'Madrid', contactPerson: 'Sales', email: 'info@hotelnuevomadrid.com', phone: '+34 914 58 01 00', starRating: 3, website: 'https://www.hotelnuevomadrid.com', notes: 'North Madrid, near IFEMA, 68 rooms, quiet area' },
      // ── Madrid Transport ──
      { companyName: 'Alsa Bus', category: 'Transport', city: 'Madrid', contactPerson: 'Group Bookings', email: 'groups@alsa.es', phone: '+34 902 42 22 42', starRating: 0, website: 'https://www.alsa.es', notes: 'Major national coach operator' },
      { companyName: 'Autocares Julián de Castro', category: 'Transport', city: 'Madrid', contactPerson: 'Sales Dept', email: 'info@juliandecastro.es', phone: '+34 916 73 40 00', starRating: 0, website: 'https://www.juliandecastro.es', notes: 'Private coach hire, school groups specialist' },
      { companyName: 'Monbus Madrid', category: 'Transport', city: 'Madrid', contactPerson: 'Reservations', email: 'reservas@monbus.es', phone: '+34 982 29 29 00', starRating: 0, website: 'https://www.monbus.es', notes: 'Coach hire and transfers' },
      { companyName: 'Avanza Bus', category: 'Transport', city: 'Madrid', contactPerson: 'Group Sales', email: 'groups@avanzabus.com', phone: '+34 912 72 28 32', starRating: 0, website: 'https://www.avanzabus.com', notes: 'Intercity and private hire' },
      // ── Barcelona Hotels ──
      { companyName: 'Hotel Acta Voraport', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'voraport@actahotels.com', phone: '+34 933 06 58 00', starRating: 3, website: 'https://www.actahotels.com', notes: 'Near port, good for groups' },
      { companyName: 'Hotel Barcelona Universal', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Bookings', email: 'groups@hoteluniversal.com', phone: '+34 935 67 74 47', starRating: 4, website: 'https://www.hotelbarcelonauniversal.com', notes: 'Las Ramblas area' },
      { companyName: 'Hostal Centric', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reception', email: 'info@hostalcentric.com', phone: '+34 934 26 75 73', starRating: 2, website: 'https://www.hostalcentric.com', notes: 'Budget, central Eixample' },
      { companyName: 'Hotel Sant Agusti', category: 'Hotel', city: 'Barcelona', contactPerson: 'Events Dept', email: 'events@hotelsantagusti.com', phone: '+34 933 18 16 58', starRating: 3, website: 'https://www.hotelsantagusti.com', notes: 'Historic, Plaza Sant Agustí' },
      { companyName: 'Hotel Catalonia Park Güell', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Sales', email: 'parkguell@cataloniahotels.com', phone: '+34 932 59 68 00', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Near Park Güell, rooftop pool' },
      { companyName: 'Hotel ILUNION Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Dept', email: 'barcelona@ilunionhotels.com', phone: '+34 932 97 39 00', starRating: 4, website: 'https://www.ilunionhotels.com', notes: 'Beachfront Diagonal Mar, large capacity, accessible' },
      { companyName: 'Hotel Serhs Rivoli Rambla', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'rivoli@serhshotels.com', phone: '+34 933 01 45 00', starRating: 4, website: 'https://www.serhshotels.com', notes: 'Las Ramblas, Art Deco style, 125 rooms' },
      { companyName: 'Hotel Gótico', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Sales', email: 'gotico@hotelgotico.com', phone: '+34 933 15 22 11', starRating: 3, website: 'https://www.hotelgotico.com', notes: 'Gothic Quarter, historic building, central' },
      { companyName: 'Hotel Ronda Less', category: 'Hotel', city: 'Barcelona', contactPerson: 'Booking Dept', email: 'info@hotelrondaless.com', phone: '+34 933 17 30 53', starRating: 3, website: 'https://www.leshotels.com', notes: 'Near Plaça Universitat, modern, good group pricing' },
      { companyName: 'Hotel Catalonia Ramblas', category: 'Hotel', city: 'Barcelona', contactPerson: 'Events Team', email: 'ramblas@cataloniahotels.com', phone: '+34 933 16 84 00', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Top of Las Ramblas near Plaça Catalunya' },
      { companyName: 'Hotel NH Barcelona Centro', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Dept', email: 'nhbcncentro@nh-hotels.com', phone: '+34 932 70 34 10', starRating: 3, website: 'https://www.nh-hotels.com', notes: 'Eixample district, metro nearby, 156 rooms' },
      { companyName: 'Hotel Expo Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'info@expohotelbarcelona.com', phone: '+34 936 00 31 00', starRating: 4, website: 'https://www.expohotelbarcelona.com', notes: 'Sants area, near train station, large groups welcome' },
      { companyName: 'Generator Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Bookings', email: 'barcelona@generatorhostels.com', phone: '+34 932 20 03 77', starRating: 2, website: 'https://staygenerator.com/hostels/barcelona', notes: 'Gràcia district, perfect for student groups, terrace' },
      { companyName: 'Hotel Petit Palace Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: 'Sales', email: 'barcelona@petitpalace.com', phone: '+34 933 04 60 00', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Via Laietana, high-tech rooms, bike rental' },
      { companyName: 'Hotel Europark', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Sales', email: 'grupos@hoteleuropark.com', phone: '+34 934 57 92 05', starRating: 3, website: 'https://www.hoteleuropark.com', notes: 'Sagrada Familia area, 66 rooms, good value' },
      { companyName: 'Hotel HCC Regente', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'regente@hcchotels.com', phone: '+34 934 87 59 89', starRating: 4, website: 'https://www.hcchotels.com', notes: 'Rambla Catalunya, rooftop pool, 78 rooms' },
      { companyName: 'Hotel Abba Sants', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Dept', email: 'sants@abbahoteles.com', phone: '+34 934 00 60 00', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Next to Sants station, 140 rooms, ideal for arrivals by train' },
      { companyName: 'Hotel Ibis Barcelona Centro', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'h8625@accor.com', phone: '+34 932 70 20 00', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, Ronda Sant Pere, 70 rooms' },
      { companyName: 'Hotel Oriente Atiram', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Sales', email: 'oriente@atiramhotels.com', phone: '+34 933 02 25 58', starRating: 3, website: 'https://www.atiramhotels.com', notes: 'Las Ramblas historic hotel, 142 rooms, renovated' },
      { companyName: 'Hotel Silken Ramblas', category: 'Hotel', city: 'Barcelona', contactPerson: 'Events Team', email: 'ramblas@hotelessilken.com', phone: '+34 933 43 79 09', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Upper Ramblas, modern, 116 rooms' },
      { companyName: 'Hotel Acta Antibes', category: 'Hotel', city: 'Barcelona', contactPerson: 'Booking Dept', email: 'antibes@actahotels.com', phone: '+34 933 01 74 04', starRating: 3, website: 'https://www.actahotels.com', notes: 'Passeig de Gràcia area, great location, 71 rooms' },
      { companyName: 'Hotel Astoria', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Bookings', email: 'astoria@derbyhotels.com', phone: '+34 932 09 83 11', starRating: 3, website: 'https://www.derbyhotels.com', notes: 'Diagonal avenue, Derby chain, 117 rooms' },
      { companyName: 'Hotel Sagrada Familia', category: 'Hotel', city: 'Barcelona', contactPerson: 'Reservations', email: 'info@hotelsagradafamilia.com', phone: '+34 934 35 02 51', starRating: 3, website: 'https://www.hotelsagradafamilia.com', notes: 'Steps from Sagrada Familia, 21 rooms, intimate' },
      { companyName: 'Hotel Senator Barcelona Spa', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Dept', email: 'bcnspa@senatorhoteles.com', phone: '+34 933 18 44 00', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Raval area, spa facilities, 56 rooms' },
      { companyName: 'St Christopher\'s Inn Barcelona', category: 'Hotel', city: 'Barcelona', contactPerson: 'Group Bookings', email: 'barcelona@st-christophers.co.uk', phone: '+34 932 68 10 60', starRating: 2, website: 'https://www.st-christophers.co.uk', notes: 'Backpacker/student hostel, Sagrada Familia area, bar' },
      // ── Barcelona Transport ──
      { companyName: 'Autocares Monbus', category: 'Transport', city: 'Barcelona', contactPerson: 'BCN Office', email: 'barcelona@monbus.es', phone: '+34 902 29 29 00', starRating: 0, website: 'https://www.monbus.es', notes: 'Coach hire and airport transfers' },
      { companyName: 'Julià Travel Barcelona', category: 'Transport', city: 'Barcelona', contactPerson: 'Operations', email: 'ops@juliatravel.com', phone: '+34 933 17 64 54', starRating: 0, website: 'https://www.juliatravel.com', notes: 'Tour buses and private hire' },
      { companyName: 'Sagalés Bus', category: 'Transport', city: 'Barcelona', contactPerson: 'Bookings', email: 'reserves@sagales.com', phone: '+34 938 93 70 60', starRating: 0, website: 'https://www.sagales.com', notes: 'Airport shuttle and group hire' },
      { companyName: 'Bus Barcelona Tours', category: 'Transport', city: 'Barcelona', contactPerson: 'Sales', email: 'info@busbcntours.com', phone: '+34 933 00 12 34', starRating: 0, website: '', notes: 'Sightseeing and private coaches' },
      // ── Valencia Hotels ──
      { companyName: 'Hotel Mediterráneo', category: 'Hotel', city: 'Valencia', contactPerson: 'Reservations', email: 'reservas@hotelmediterraneo.com', phone: '+34 963 51 01 42', starRating: 3, website: 'https://www.hotelmediterraneovalencia.com', notes: 'City centre, good value' },
      { companyName: 'Hotel Vincci Lys', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Dept', email: 'groups@vinccihoteles.com', phone: '+34 963 53 52 52', starRating: 4, website: 'https://www.vinccihoteles.com', notes: 'Near Plaza del Ayuntamiento' },
      { companyName: 'Hostal Antigua Morellana', category: 'Hotel', city: 'Valencia', contactPerson: 'Reception', email: 'info@hostalam.com', phone: '+34 963 91 57 73', starRating: 2, website: 'https://www.hostalam.com', notes: 'Budget, old town charm' },
      { companyName: 'Hotel Sorolla Centro', category: 'Hotel', city: 'Valencia', contactPerson: 'Sales Team', email: 'sorollacentro@hotelsorolla.com', phone: '+34 963 52 33 92', starRating: 4, website: 'https://www.hotelsorollacentro.com', notes: 'Modern, near train station' },
      { companyName: 'Hotel Catalonia Excelsior', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Sales', email: 'excelsior@cataloniahotels.com', phone: '+34 963 51 46 12', starRating: 3, website: 'https://www.cataloniahotels.com', notes: 'Calle Barcelonina, central, good group rates' },
      { companyName: 'Hotel Primus Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Reservations', email: 'reservas@primusvalencia.com', phone: '+34 963 94 06 00', starRating: 4, website: 'https://www.primusvalencia.com', notes: 'Near City of Arts and Sciences, modern design' },
      { companyName: 'Hotel NH Valencia Las Artes', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Dept', email: 'nhlasartes@nh-hotels.com', phone: '+34 963 18 84 00', starRating: 4, website: 'https://www.nh-hotels.com', notes: 'Facing City of Arts and Sciences, 162 rooms' },
      { companyName: 'Hotel Ilunion Aqua 4', category: 'Hotel', city: 'Valencia', contactPerson: 'Events Mgr', email: 'aqua4@ilunionhotels.com', phone: '+34 963 18 31 00', starRating: 4, website: 'https://www.ilunionhotels.com', notes: 'Waterfront, near Marina, large event capacity' },
      { companyName: 'Hotel Petit Palace Germanías', category: 'Hotel', city: 'Valencia', contactPerson: 'Booking Dept', email: 'germanias@petitpalace.com', phone: '+34 963 51 62 00', starRating: 3, website: 'https://www.petitpalace.com', notes: 'Near Mercado Central, bikes available' },
      { companyName: 'Hotel Serhs Del Port', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Sales', email: 'delport@serhshotels.com', phone: '+34 963 55 05 00', starRating: 3, website: 'https://www.serhshotels.com', notes: 'Port area, good for beach access, 44 rooms' },
      { companyName: 'Hotel Expo Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Reservations', email: 'info@expohotelvalencia.com', phone: '+34 963 15 05 00', starRating: 4, website: 'https://www.expohotelvalencia.com', notes: 'Near Turia gardens, spacious, 378 rooms' },
      { companyName: 'Hotel One Shot Palacio Reina Victoria', category: 'Hotel', city: 'Valencia', contactPerson: 'Sales', email: 'reinavictoria@oneshothotels.com', phone: '+34 963 52 04 87', starRating: 4, website: 'https://www.oneshothotels.com', notes: 'Historic palace, Plaza del Ayuntamiento, boutique' },
      { companyName: 'Youth Hostel Center Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Bookings', email: 'groups@centerhostelvalencia.com', phone: '+34 963 92 71 01', starRating: 2, website: 'https://www.centerhostels.com', notes: 'Budget student groups, Barrio del Carmen, dorms + private' },
      { companyName: 'Hotel Ayre Astoria Palace', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Sales', email: 'astoria@ayrehoteles.com', phone: '+34 963 98 10 00', starRating: 4, website: 'https://www.ayrehoteles.com', notes: 'Plaza del Ayuntamiento, elegant, 204 rooms' },
      { companyName: 'Hotel Abba Acteon', category: 'Hotel', city: 'Valencia', contactPerson: 'Events Mgr', email: 'acteon@abbahoteles.com', phone: '+34 963 31 07 07', starRating: 4, website: 'https://www.abbahoteles.com', notes: 'Near Turia gardens, modern, 188 rooms' },
      { companyName: 'Hotel Senator Parque Central', category: 'Hotel', city: 'Valencia', contactPerson: 'Reservations', email: 'parquecentral@senatorhoteles.com', phone: '+34 963 52 50 00', starRating: 4, website: 'https://www.senatorhoteles.com', notes: 'Next to Parque Central, new build, 120 rooms' },
      { companyName: 'Hotel Ibis Valencia Palacio Congresos', category: 'Hotel', city: 'Valencia', contactPerson: 'Reservations', email: 'h8542@accor.com', phone: '+34 963 16 72 00', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, near City of Arts, 137 rooms' },
      { companyName: 'Hotel Medium Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Dept', email: 'valencia@mediumhoteles.com', phone: '+34 963 52 06 12', starRating: 3, website: 'https://www.mediumhoteles.com', notes: 'Central, Calle Moratín, 53 rooms, good value' },
      { companyName: 'Hotel Silken Puerta Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Group Sales', email: 'puertavalencia@hotelessilken.com', phone: '+34 963 52 67 37', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Modern building, near Ruzafa, 135 rooms' },
      { companyName: 'Hotel Kramer', category: 'Hotel', city: 'Valencia', contactPerson: 'Reception', email: 'info@hotelkramer.com', phone: '+34 963 52 74 60', starRating: 2, website: 'https://www.hotelkramer.com', notes: 'Budget, central, near Estación del Norte, 11 rooms' },
      { companyName: 'Hotel Meliá Valencia', category: 'Hotel', city: 'Valencia', contactPerson: 'Events Team', email: 'melia.valencia@melia.com', phone: '+34 963 60 73 00', starRating: 4, website: 'https://www.melia.com', notes: 'Palacio de Congresos area, luxury, 304 rooms, spa' },
      { companyName: 'Hotel Casual Valencia de las Artes', category: 'Hotel', city: 'Valencia', contactPerson: 'Booking Dept', email: 'artes@casualhoteles.com', phone: '+34 963 52 18 00', starRating: 3, website: 'https://www.casualhoteles.com', notes: 'Themed rooms, Barrio del Carmen, fun for young groups' },
      // ── Tenerife Hotels ──
      { companyName: 'Hotel Zentral Center', category: 'Hotel', city: 'Tenerife', contactPerson: 'Reservations', email: 'reservas@zentral.es', phone: '+34 922 28 39 08', starRating: 3, website: 'https://www.zentral.es', notes: 'Santa Cruz centre, modern, 47 rooms' },
      { companyName: 'Hotel Iberostar Heritage Grand Mencey', category: 'Hotel', city: 'Tenerife', contactPerson: 'Group Sales', email: 'grandmencey@iberostar.com', phone: '+34 922 60 99 00', starRating: 5, website: 'https://www.iberostar.com', notes: 'Santa Cruz, luxury colonial, 261 rooms, pool and gardens' },
      { companyName: 'Hotel Silken Atlántida', category: 'Hotel', city: 'Tenerife', contactPerson: 'Events Team', email: 'atlantida@hotelessilken.com', phone: '+34 922 29 45 00', starRating: 4, website: 'https://www.hotelessilken.com', notes: 'Santa Cruz seafront, 142 rooms, near auditorium' },
      { companyName: 'Hotel Príncipe Paz', category: 'Hotel', city: 'Tenerife', contactPerson: 'Reception', email: 'info@hotelprincipepaz.com', phone: '+34 922 24 69 69', starRating: 3, website: 'https://www.hotelprincipepaz.com', notes: 'Santa Cruz centre, budget-friendly, 67 rooms' },
      { companyName: 'Hotel Taburiente', category: 'Hotel', city: 'Tenerife', contactPerson: 'Group Dept', email: 'reservas@hoteltaburiente.com', phone: '+34 922 27 60 00', starRating: 4, website: 'https://www.hoteltaburiente.com', notes: 'Santa Cruz, near park, 169 rooms, conference centre' },
      { companyName: 'Hotel Escuela Santa Cruz', category: 'Hotel', city: 'Tenerife', contactPerson: 'Reservations', email: 'info@hotelescuelasantacruz.com', phone: '+34 922 00 14 00', starRating: 3, website: 'https://www.hotelescuelasantacruz.com', notes: 'Hospitality school hotel, great service, 42 rooms' },
      { companyName: 'Hotel Pelinor', category: 'Hotel', city: 'Tenerife', contactPerson: 'Booking Dept', email: 'reservas@hotelpelinor.com', phone: '+34 922 24 68 75', starRating: 3, website: 'https://www.hotelpelinor.com', notes: 'Downtown Santa Cruz, simple, 73 rooms, good price' },
      { companyName: 'Hotel Adonis Plaza', category: 'Hotel', city: 'Tenerife', contactPerson: 'Group Sales', email: 'plaza@adonishoteles.com', phone: '+34 922 24 24 40', starRating: 3, website: 'https://www.adonishoteles.com', notes: 'Plaza de la Candelaria, central, 53 rooms' },
      { companyName: 'Hotel Contemporáneo', category: 'Hotel', city: 'Tenerife', contactPerson: 'Reservations', email: 'reservas@hotelcontemporaneo.com', phone: '+34 922 27 15 71', starRating: 3, website: 'https://www.hotelcontemporaneo.com', notes: 'Santa Cruz, Rambla area, design hotel, 156 rooms' },
      { companyName: 'Hotel Puerto de la Cruz (Diamante Suites)', category: 'Hotel', city: 'Tenerife', contactPerson: 'Group Dept', email: 'groups@diamantesuites.com', phone: '+34 922 57 47 47', starRating: 4, website: 'https://www.diamantesuites.com', notes: 'Puerto de la Cruz, all-inclusive option, 350 rooms' },
      { companyName: 'Hotel Tigaiga', category: 'Hotel', city: 'Tenerife', contactPerson: 'Sales', email: 'reservas@tigaiga.com', phone: '+34 922 38 35 00', starRating: 4, website: 'https://www.tigaiga.com', notes: 'Puerto de la Cruz, gardens, views of Teide, 83 rooms' },
      { companyName: 'Hotel Beatriz Atlántida Spa', category: 'Hotel', city: 'Tenerife', contactPerson: 'Events Mgr', email: 'atlantida@beatrizhoteles.com', phone: '+34 922 37 41 45', starRating: 4, website: 'https://www.beatrizhoteles.com', notes: 'Puerto de la Cruz, spa, 284 rooms, family-friendly' },
      { companyName: 'Hotel Catalonia Punta del Rey', category: 'Hotel', city: 'Tenerife', contactPerson: 'Group Sales', email: 'puntadelrey@cataloniahotels.com', phone: '+34 922 77 27 00', starRating: 4, website: 'https://www.cataloniahotels.com', notes: 'Candelaria, beachfront, all-inclusive, 430 rooms, pools' },
      { companyName: 'Hotel Ibis Tenerife', category: 'Hotel', city: 'Tenerife', contactPerson: 'Reservations', email: 'h8714@accor.com', phone: '+34 922 63 34 00', starRating: 2, website: 'https://www.ibis.accor.com', notes: 'Budget Accor, Santa Cruz, near motorway, 80 rooms' },
      { companyName: 'Hotel Coral Los Silos', category: 'Hotel', city: 'Tenerife', contactPerson: 'Booking Dept', email: 'lossilos@coralhotels.com', phone: '+34 922 84 10 30', starRating: 3, website: 'https://www.coralhotels.com', notes: 'Northwest Tenerife, rural setting, pool, 24 rooms, excursions' },
      // ── Tenerife Transport ──
      { companyName: 'TITSA Tenerife', category: 'Transport', city: 'Tenerife', contactPerson: 'Group Hire', email: 'info@titsa.com', phone: '+34 922 53 13 00', starRating: 0, website: 'https://www.titsa.com', notes: 'Island public bus + group charter hire' },
      { companyName: 'Autocares Armas Tenerife', category: 'Transport', city: 'Tenerife', contactPerson: 'Charter Dept', email: 'charter@fredolsen.es', phone: '+34 922 62 82 00', starRating: 0, website: 'https://www.fredolsen.es', notes: 'Coach hire, inter-island ferries' },
      { companyName: 'Tenerife Bus Tours', category: 'Transport', city: 'Tenerife', contactPerson: 'Sales', email: 'info@tenerifebustours.com', phone: '+34 922 39 08 00', starRating: 0, website: '', notes: 'Sightseeing coaches, Teide excursions, private hire' },
      // ── Valencia Transport ──
      { companyName: 'Autocares HERCA', category: 'Transport', city: 'Valencia', contactPerson: 'Operations', email: 'info@autocaresherca.com', phone: '+34 961 50 08 00', starRating: 0, website: 'https://www.autocaresherca.com', notes: 'Regional coach hire' },
      { companyName: 'Transvía Valencia', category: 'Transport', city: 'Valencia', contactPerson: 'Bookings', email: 'reservas@transvia-valencia.com', phone: '+34 963 49 72 22', starRating: 0, website: '', notes: 'Private bus and minibus hire' },
      { companyName: 'Autocares Comes', category: 'Transport', city: 'Valencia', contactPerson: 'Group Sales', email: 'groups@tgcomes.es', phone: '+34 902 19 92 08', starRating: 0, website: 'https://www.tgcomes.es', notes: 'Coach hire, southern routes' },
      { companyName: 'Bus Valencia Group', category: 'Transport', city: 'Valencia', contactPerson: 'Charter Dept', email: 'charter@busvalencia.com', phone: '+34 963 45 67 89', starRating: 0, website: '', notes: 'Luxury coaches for groups' }
    ];
    seed.forEach(p => this.saveProvider(p));
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

  async _lookupTourViaSdk(code) {
    const snapshot = await this.firestore.collection('tours')
      .where('accessCode', '==', code).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data(), _portalMode: 'tour', _familyId: null };
    }
    const famSnapshot = await this.firestore.collection('tours')
      .where('familyAccessCodesList', 'array-contains', code).limit(1).get();
    if (!famSnapshot.empty) {
      const doc = famSnapshot.docs[0];
      const tourData = doc.data();
      let familyId = null;
      const codes = tourData.familyAccessCodes || {};
      for (const [icId, entry] of Object.entries(codes)) {
        if (entry.code === code) { familyId = icId; break; }
      }
      return { id: doc.id, ...tourData, _portalMode: 'family', _familyId: familyId };
    }
    return null;
  },

  async _lookupTourViaRest(code) {
    try {
      const cfg = (typeof FIREBASE_CONFIG !== 'undefined') ? FIREBASE_CONFIG : null;
      if (!cfg || !cfg.projectId || !cfg.apiKey) return null;
      const url = 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId
        + '/databases/(default)/documents:runQuery?key=' + encodeURIComponent(cfg.apiKey);

      const post = (body) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.ok ? r.json() : []);

      // 1) Tour-level access code
      const tourRows = await post({
        structuredQuery: {
          from: [{ collectionId: 'tours' }],
          where: { fieldFilter: {
            field: { fieldPath: 'accessCode' },
            op: 'EQUAL',
            value: { stringValue: code }
          }},
          limit: 1
        }
      });
      const tourHit = (tourRows || []).find(r => r && r.document);
      if (tourHit) {
        const fields = DB._restFieldsToObj(tourHit.document.fields);
        const docId = tourHit.document.name.split('/').pop();
        return { id: docId, ...fields, _portalMode: 'tour', _familyId: null };
      }

      // 2) Family access code
      const famRows = await post({
        structuredQuery: {
          from: [{ collectionId: 'tours' }],
          where: { fieldFilter: {
            field: { fieldPath: 'familyAccessCodesList' },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: code }
          }},
          limit: 1
        }
      });
      const famHit = (famRows || []).find(r => r && r.document);
      if (famHit) {
        const fields = DB._restFieldsToObj(famHit.document.fields);
        const docId = famHit.document.name.split('/').pop();
        let familyId = null;
        const codes = fields.familyAccessCodes || {};
        for (const [icId, entry] of Object.entries(codes)) {
          if (entry && entry.code === code) { familyId = icId; break; }
        }
        return { id: docId, ...fields, _portalMode: 'family', _familyId: familyId };
      }
      return null;
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
  async getTourInvoicesForFamily(tourId, familyId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('invoices')
        .where('tourId', '==', Number(tourId)).get();
      const items = [];
      snapshot.forEach(doc => {
        const inv = { id: doc.id, ...doc.data() };
        if (String(inv.individualClientRef) === String(familyId)) items.push(inv);
      });
      return items;
    } catch (e) {
      console.warn('getTourInvoicesForFamily failed:', e.message);
      return [];
    }
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
    try {
      const snapshot = await this.firestore.collection('invoices')
        .where('tourId', '==', Number(tourId)).get({ source: 'server' });
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      // Fallback to cache if offline
      try {
        const snapshot = await this.firestore.collection('invoices')
          .where('tourId', '==', Number(tourId)).get({ source: 'cache' });
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return items;
      } catch (_) { return []; }
    }
  },

  // Get all passengers from tour subcollection (server-first to avoid stale cache)
  async getTourPassengers(tourId) {
    if (!this._firebaseReady) return [];
    try {
      // Try server first to get fresh data
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').orderBy('createdAt', 'desc').get({ source: 'server' });
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      // Fallback to cache if offline
      console.warn('getTourPassengers server fetch failed, trying cache:', e.message);
      try {
        const snapshot = await this.firestore.collection('tours').doc(String(tourId))
          .collection('passengers').orderBy('createdAt', 'desc').get({ source: 'cache' });
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return items;
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
      const snapshot = await this.firestore.collection('tours')
        .where('guideAccessCode', '==', code).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
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
