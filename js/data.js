/* === DATA LAYER — localStorage CRUD === */
const DB = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem('odisea_' + key)) || []; }
    catch { return []; }
  },
  _set(key, data) {
    localStorage.setItem('odisea_' + key, JSON.stringify(data));
  },
  _nextId(key) {
    const items = this._get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  // QUOTES
  getQuotes() { return this._get('quotes'); },
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
    return q;
  },
  deleteQuote(id) {
    this._set('quotes', this.getQuotes().filter(q => q.id !== id));
  },

  // TOURS
  getTours() { return this._get('tours'); },
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
    return t;
  },
  deleteTour(id) {
    this._set('tours', this.getTours().filter(t => t.id !== id));
  },

  // INVOICES
  getInvoices() { return this._get('invoices'); },
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
    return inv;
  },
  deleteInvoice(id) {
    this._set('invoices', this.getInvoices().filter(i => i.id !== id));
  },

  // PROVIDERS
  getProviders() { return this._get('providers'); },
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
    return p;
  },
  deleteProvider(id) {
    this._set('providers', this.getProviders().filter(p => p.id !== id));
  },

  // PASSENGERS
  getPassengers() { return this._get('passengers'); },
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
    this._set('passengers', this.getPassengers().filter(p => p.id !== id));
  },

  // CLIENTS
  getClients() { return this._get('clients'); },
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
    return c;
  },
  deleteClient(id) {
    this._set('clients', this.getClients().filter(c => c.id !== id));
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
      const batch = this.firestore.batch();
      data.forEach(item => {
        const docRef = this.firestore.collection(collection).doc(String(item.id));
        // Strip large base64 invoice files to avoid Firestore 1MB doc limit
        const clean = JSON.parse(JSON.stringify(item));
        if (clean.providerExpenses) {
          clean.providerExpenses.forEach(e => { if (e.invoiceFile) e.invoiceFile = { name: e.invoiceFile.name, uploadedAt: e.invoiceFile.uploadedAt }; });
        }
        batch.set(docRef, clean, { merge: true });
      });
      await batch.commit();
      console.log(`Synced ${data.length} items to ${collection}.`);
    } catch (e) {
      console.warn(`Sync to Firestore (${collection}) failed:`, e.message);
    }
  },

  // Pull Firestore collection → merge into localStorage
  async pullFromFirestore(collection) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection(collection).get();
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), _firestoreId: doc.id }));
      return items;
    } catch (e) {
      console.warn(`Pull from Firestore (${collection}) failed:`, e.message);
      return [];
    }
  },

  // Generate a unique access code for a tour
  generateAccessCode(tourName) {
    const base = (tourName || 'TOUR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return base + '-' + rand;
  },

  // Query Firestore for a tour by access code
  async getTourByAccessCode(code) {
    if (!this._firebaseReady) return null;
    try {
      const snapshot = await this.firestore.collection('tours')
        .where('accessCode', '==', code).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn('getTourByAccessCode failed:', e.message);
      return null;
    }
  },

  // Save a passenger to tour's subcollection (portal use)
  async saveTourPassenger(tourId, passenger) {
    if (!this._firebaseReady) return null;
    try {
      passenger.createdAt = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').add(passenger);
      // Increment unread count on tour doc
      await this.firestore.collection('tours').doc(String(tourId)).update({
        unreadPassengersCount: firebase.firestore.FieldValue.increment(1)
      });
      return { id: ref.id, ...passenger };
    } catch (e) {
      console.warn('saveTourPassenger failed:', e.message);
      return null;
    }
  },

  // Get all passengers from tour subcollection
  async getTourPassengers(tourId) {
    if (!this._firebaseReady) return [];
    try {
      const snapshot = await this.firestore.collection('tours').doc(String(tourId))
        .collection('passengers').orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    } catch (e) {
      console.warn('getTourPassengers failed:', e.message);
      return [];
    }
  },

  // Send a message to tour's messages subcollection
  async sendTourMessage(tourId, message) {
    if (!this._firebaseReady) return null;
    try {
      message.timestamp = new Date().toISOString();
      const ref = await this.firestore.collection('tours').doc(String(tourId))
        .collection('messages').add(message);
      // Increment unread count if from client
      if (message.sender !== 'admin') {
        await this.firestore.collection('tours').doc(String(tourId)).update({
          unreadMessagesCount: firebase.firestore.FieldValue.increment(1)
        });
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
    if (!this._firebaseReady) return null;
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
      console.warn('uploadTourDocument failed:', e.message);
      return null;
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

  // EXPORT / IMPORT ALL
  exportAll() {
    return JSON.stringify({
      quotes: this.getQuotes(),
      tours: this.getTours(),
      invoices: this.getInvoices(),
      providers: this.getProviders(),
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
