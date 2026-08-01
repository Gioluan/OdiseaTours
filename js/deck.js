/* === ODISEA DECK · generador de itinerarios de presentacion ==================
 *
 * Sustituye a los scripts _fill_<cliente>.py de
 * tools/odisea-itinerary-template/. Aquellos eran ~1.000 lineas escritas a mano
 * por tour; de esas, la mitad era siempre lo mismo (constructor de filas, borrar
 * ranuras de dia sobrantes, variante sin precios, retoques de maquetacion y unos
 * 40 asserts de reglas de Odisea). Esa mitad vive aqui una sola vez.
 *
 * Lee el MISMO documento de tour que ya usa el CRM. Nada que teclear dos veces:
 *   t.itinerary[].items{time, description, highlight}  ->  filas del horario
 *   t.destinations / t.hotels                          ->  capitulos y estancias
 *   t.priceStudent / Sibling / Adult                   ->  tabla de precios
 *   t.inclusions                                       ->  que incluye
 *
 * Lo que el CRM no sabe (fotos, ledes, color del club, copy de portada y cierre)
 * vive en t.deck, y se edita en la pestana Deck de la ficha del tour.
 *
 * A diferencia de la plantilla original, aqui NO hay 10 ranuras de dia fijas:
 * se generan tantas diapositivas como dias tenga el itinerario. Hawaii con 11
 * noches deja de ser un problema.
 *
 * Salida: una ventana nueva con el deck a 1920x1080. Se navega con las flechas
 * y con Imprimir -> Guardar como PDF sale el entregable, una slide por pagina
 * (de eso se encarga deck-stage.js, que es el mismo componente de la plantilla).
 *
 * Deck.generate(tourId)              deck con precios
 * Deck.generate(tourId, {noPricing:true})   version "a consultar"
 */
const Deck = {

  /* -- Textos fijos ---------------------------------------------------------
   * Todo el texto que no sale del tour. El primer deck en castellano (BHM,
   * agosto 2026) se hizo traduciendo la plantilla a mano; esto lo hace
   * innecesario. Para anadir un idioma, se copia el bloque y se traduce. */
  UI: {
    en: {
      chapterCover: 'Chapter I', itinerary: 'Itinerary',
      chapterWelcome: 'Chapter II', welcome: 'Welcome',
      chapterOverview: 'Chapter III', overview: 'Overview',
      chapterPackage: 'Chapter IV', thePackage: 'The Package',
      chapterReservations: 'Chapter V', reservations: 'Reservations',
      fin: 'Fin', theInvitation: 'The Invitation',
      travelWindow: 'Travel Window', groupSize: 'Group Size', cities: 'Cities',
      operator: 'Operator', inPartnershipWith: 'Where the group trains',
      atAGlance: 'At a glance', tourAtAGlance: ['Tour at a', 'glance.'],
      tourDates: 'Tour dates', length: 'Length', days: 'days', nights: 'nights',
      groupCapacity: 'Group capacity', minAge: 'Min. age',
      arriveInto: 'Arrive into', departFrom: 'Depart from',
      day: 'Day', date: 'Date', highlight: 'Highlight',
      stay: 'Stay', transfer: 'Transfer', schedule: 'Schedule',
      whatsIncluded: ['What’s', 'included.'], notIncluded: 'Not Included',
      pricing: 'Pricing.', perPerson: 'Per Person',
      groupBasis: 'Group Basis', confirmed: 'confirmed', currency: 'Currency',
      securingYourPlace: ['Securing', 'your place.'],
      paymentSchedule: 'Payment Schedule', threePayments: ['Three', 'payments.'],
      deposit: 'Deposit', secondPayment: 'Second payment',
      finalPayment: 'Final payment', due: 'due',
      firstComeFirstServed: 'First-come, first-served',
      reserveBy: 'Reserve By', departure: 'Departure',
      tourLead: 'Tour Lead', email: 'Email', phone: 'Phone',
      webSocial: 'Web · Social',
      onRequest: 'On request', part: 'Part',
      partWords: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
      locale: 'en-GB'
    },
    es: {
      chapterCover: 'Capítulo I', itinerary: 'Itinerario',
      chapterWelcome: 'Capítulo II', welcome: 'Bienvenida',
      chapterOverview: 'Capítulo III', overview: 'Resumen',
      chapterPackage: 'Capítulo IV', thePackage: 'El Paquete',
      chapterReservations: 'Capítulo V', reservations: 'Reservas',
      fin: 'Fin', theInvitation: 'La Invitación',
      travelWindow: 'Fechas', groupSize: 'Grupo', cities: 'Ciudades',
      operator: 'Operador', inPartnershipWith: 'Dónde entrena el grupo',
      atAGlance: 'De un vistazo', tourAtAGlance: ['La gira de un', 'vistazo.'],
      tourDates: 'Fechas', length: 'Duración', days: 'días', nights: 'noches',
      groupCapacity: 'Tamaño del grupo', minAge: 'Edades',
      arriveInto: 'Llegada a', departFrom: 'Salida desde',
      day: 'Día', date: 'Fecha', highlight: 'Lo destacado',
      stay: 'Alojamiento', transfer: 'Trayecto', schedule: 'Agenda',
      whatsIncluded: ['Qué', 'incluye.'], notIncluded: 'No incluido',
      pricing: 'Precios.', perPerson: 'Por persona',
      groupBasis: 'Base de grupo', confirmed: 'confirmados', currency: 'Divisa',
      securingYourPlace: ['Cómo reservar', 'la plaza.'],
      paymentSchedule: 'Calendario de pagos', threePayments: ['Tres', 'pagos.'],
      deposit: 'Reserva', secondPayment: 'Segundo pago',
      finalPayment: 'Pago final', due: 'antes del',
      firstComeFirstServed: 'Por orden de reserva',
      reserveBy: 'Reservar antes del', departure: 'Salida',
      tourLead: 'Responsable', email: 'Correo', phone: 'Teléfono',
      webSocial: 'Web · Redes',
      onRequest: 'A consultar', part: 'Parte',
      partWords: ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'],
      locale: 'es-ES'
    }
  },

  /* Coordenadas para la etiqueta de capitulo ("Parte Uno · Madrid · 40.4168° N").
   * Un detalle de la plantilla original que da caracter de cuaderno de viaje. */
  COORDS: {
    'madrid': '40.4168° N', 'barcelona': '41.3874° N',
    'valencia': '39.4699° N', 'sevilla': '37.3891° N',
    'bilbao': '43.2630° N', 'san sebastián': '43.3183° N',
    'donostia': '43.3183° N', 'vitoria': '42.8467° N',
    'castelldefels': '41.2800° N', 'benicàssim': '40.0544° N',
    'benicassim': '40.0544° N', 'castellón': '39.9864° N',
    'salou': '41.0763° N', 'tarragona': '41.1189° N',
    'girona': '41.9794° N', 'roses': '42.2619° N',
    'málaga': '36.7213° N', 'sitges': '41.2371° N',
    'toledo': '39.8628° N', 'zaragoza': '41.6488° N'
  },

  /* ======================================================================== */

  generate(tourId, opts) {
    opts = opts || {};
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) { alert('Tour not found.'); return; }
    if (!t.itinerary || !t.itinerary.length) {
      alert('This tour has no day-by-day itinerary yet.\n\nBuild it in the Itinerary tab first — the deck is generated from it.');
      return;
    }

    // El linter avisa antes de generar. Es la red que antes eran los asserts
    // al final de cada script de Python.
    if (typeof DeckLint !== 'undefined' && !opts.skipLint) {
      const problems = DeckLint.check(t, opts);
      const blocking = problems.filter(p => p.level === 'error');
      if (problems.length) {
        const lines = problems.map(p => (p.level === 'error' ? '✖  ' : '⚠  ') + p.msg);
        const msg = blocking.length
          ? 'This deck breaks Odisea rules:\n\n' + lines.join('\n') +
            '\n\nFix it before sending it to the client. Generate anyway?'
          : 'Warnings:\n\n' + lines.join('\n') + '\n\nGenerate?';
        if (!confirm(msg)) return;
      }
    }

    const html = this.buildHTML(t, opts);
    const w = window.open('', '_blank');
    if (!w) { alert('The browser blocked the pop-up window. Allow it and try again.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  },

  /* -- Helpers --------------------------------------------------------------- */

  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* Las fechas del CRM son 'YYYY-MM-DD'. new Date() las lee como UTC y en
   * husos negativos se van un dia atras, asi que se construyen en local. */
  parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  },

  fmtDate(s, lang, o) {
    const d = this.parseDate(s);
    if (!d) return '';
    return d.toLocaleDateString(this.UI[lang].locale, o);
  },

  /* '0900' | '9:00' | '9am' -> '09:00'. Igual que el itinerario del CRM. */
  fmtTime(v) {
    if (!v) return '';
    const s = String(v).trim();
    const hm = s.match(/^(\d{1,2})\s*[:.]\s*(\d{2})/);
    if (hm) return hm[1].padStart(2, '0') + ':' + hm[2];
    const digits = s.replace(/[^0-9]/g, '');
    if (!digits) return this.esc(s);
    if (digits.length <= 2) return digits.padStart(2, '0') + ':00';
    return digits.padStart(4, '0').slice(0, 2) + ':' + digits.padStart(4, '0').slice(2, 4);
  },

  pad2(n) { return String(n).padStart(2, '0'); },

  money(n, lang) {
    if (n == null || n === '' || isNaN(n)) return '';
    return Math.round(+n).toLocaleString(this.UI[lang].locale);
  },

  currencySymbol(code) {
    return { EUR: '€', GBP: '£', USD: '$', AUD: '$', CAD: '$' }[code] || '€';
  },

  groupSize(t) {
    return (+t.numStudents || 0) + (+t.numSiblings || 0) + (+t.numAdults || 0) + (+t.numFOC || 0);
  },

  /* -- Normalizacion del tour ------------------------------------------------
   * Une lo que hay en el doc del tour con lo editado en la pestana Deck y
   * rellena por defecto todo lo que falte, para que un tour a medio configurar
   * genere igualmente un deck presentable. */
  model(t, opts) {
    const d = t.deck || {};
    const lang = d.lang === 'es' ? 'es' : 'en';
    const ui = this.UI[lang];
    const ccyCode = t.currency || 'EUR';
    const days = (t.itinerary || []).slice().sort((a, b) => (a.day || 0) - (b.day || 0));

    const chapters = this.chapters(t, days, lang);

    return {
      t: t, d: d, lang: lang, ui: ui, days: days, chapters: chapters,
      noPricing: !!opts.noPricing,
      ccyCode: ccyCode,
      ccy: d.currencySymbol || this.currencySymbol(ccyCode),
      pax: this.groupSize(t),
      nights: t.nights || Math.max(0, days.length - 1),
      accent: d.clientAccent || '#FFB400',
      accentDeep: d.clientAccentDeep || d.clientAccent || '#C98A00'
    };
  },

  /* Reparte los dias en capitulos. Si el tour no los define, agrupa dias
   * consecutivos por ciudad; y si tampoco hay ciudad por dia, cae al destino
   * del tour y hace un unico capitulo. */
  chapters(t, days, lang) {
    const d = t.deck || {};
    const dayCity = (day, i) => {
      const dd = (d.days && d.days[i]) || {};
      return dd.city || day.city || '';
    };

    let chs;
    if (d.chapters && d.chapters.length) {
      chs = d.chapters.map(c => Object.assign({}, c));
    } else {
      chs = [];
      days.forEach((day, i) => {
        // El nombre de la ciudad del dia de traslado ("Valencia -> Barcelona")
        // abre capitulo con la ciudad de destino.
        const raw = dayCity(day, i);
        const city = (raw.split(/→|->/).pop() || '').trim();
        const last = chs[chs.length - 1];
        if (!last || (city && city !== last.city)) {
          chs.push({ city: city, from: i, to: i });
        } else {
          last.to = i;
        }
      });
      if (!chs.length || (chs.length === 1 && !chs[0].city)) {
        const dests = (t.destinations && t.destinations.length)
          ? t.destinations : [t.destination || ''];
        chs = [{ city: dests.join(' · '), from: 0, to: days.length - 1 }];
      }
    }

    chs.forEach((c, i) => {
      if (c.from == null) c.from = 0;
      if (c.to == null) c.to = days.length - 1;
      c.index = i;
      c.city = c.city || '';
    });
    return chs;
  },

  /* ======================================================================== */

  buildHTML(t, opts) {
    const m = this.model(t, opts);
    const base = location.href.replace(/[^\/]*(\?.*)?$/, '');
    const title = this.esc(t.tourName || t.clientName || 'Odisea Tours');

    // El orden y qué slides salen es editable (pestaña Deck). 'itinerary' es el
    // hueco donde se meten los capítulos y sus días, tantos como haya.
    const sections = [];
    this.slideList(t).filter(s => s.on !== false).forEach(s => {
      switch (s.type) {
        case 'cover':      sections.push(this.slideCover(m)); break;
        case 'welcome':    sections.push(this.slideWelcome(m)); break;
        case 'overview':   sections.push(this.slideOverview(m)); break;
        case 'inclusions': sections.push(this.slideInclusions(m)); break;
        case 'payment':    sections.push(this.slidePayment(m)); break;
        case 'closing':    sections.push(this.slideClosing(m)); break;
        case 'custom':     sections.push(this.slideCustom(m, s)); break;
        case 'itinerary':
          m.chapters.forEach(c => {
            sections.push(this.slideChapter(m, c));
            for (let i = c.from; i <= c.to && i < m.days.length; i++) {
              sections.push(this.slideDay(m, i));
            }
          });
          break;
      }
    });

    return '<!doctype html>\n' +
      '<html lang="' + m.lang + '">\n<head>\n' +
      '<meta charset="utf-8">\n' +
      '<base href="' + this.esc(base) + '">\n' +
      '<title>' + title + ' · Odisea Tours</title>\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Archivo+Black&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
      '<link rel="stylesheet" href="css/deck.css">\n' +
      '<style>\n  :root {\n' +
      '    --client-accent: ' + this.esc(m.accent) + ';\n' +
      '    --client-accent-deep: ' + this.esc(m.accentDeep) + ';\n' +
      '  }\n</style>\n' +
      '<script src="js/deck-stage.js"><\/script>\n' +
      '</head>\n<body>\n\n' +
      '<deck-stage width="1920" height="1080" autotag>\n\n' +
      sections.join('\n\n') +
      '\n\n</deck-stage>\n\n</body>\n</html>\n';
  },

  /* Las slides fijas del deck y su orden. Un tour que nunca lo ha tocado usa el
   * orden de siempre; en cuanto se edita en la pestaña Deck manda t.deck.slides.
   * 'itinerary' no es una slide: es el hueco de los capítulos y los días. */
  DEFAULT_SLIDES: [
    { type: 'cover', on: true },
    { type: 'welcome', on: true },
    { type: 'overview', on: true },
    { type: 'itinerary', on: true },
    { type: 'inclusions', on: true },
    { type: 'payment', on: true },
    { type: 'closing', on: true }
  ],

  SLIDE_LABELS: {
    cover: 'Cover', welcome: 'Welcome', overview: 'Overview & route',
    itinerary: 'Chapters & days', inclusions: 'Inclusions & pricing',
    payment: 'Payment schedule', closing: 'Closing & contact',
    custom: 'Custom slide'
  },

  slideList(t) {
    const saved = t.deck && t.deck.slides;
    if (!saved || !saved.length) return this.DEFAULT_SLIDES.map(s => Object.assign({}, s));
    // Si en el futuro se añade una slide fija nueva al motor, se cuela al final
    // de los decks ya guardados en vez de desaparecer sin avisar.
    const out = saved.map(s => Object.assign({}, s));
    this.DEFAULT_SLIDES.forEach(def => {
      if (!out.some(s => s.type === def.type)) out.push(Object.assign({}, def));
    });
    return out;
  },

  /* Slide libre: un titular, un texto y una foto opcional. Para lo que no cabe
   * en las fijas (una nota sobre vuelos, un torneo, condiciones especiales). */
  slideCustom(m, s) {
    const E = this.esc.bind(this);
    const photo = this.photo(m, s.photo, '');
    const right = photo
      ? '      <div class="right has-photo">\n' +
        '        <div class="photo-area" style="' + this.bgImage(photo) + '">\n' +
        '          <div class="photo-cap">' + E(s.photoCap || '') + '</div>\n' +
        '        </div>\n      </div>\n'
      : '';
    const body = String(s.body || '').split(/\n+/).filter(Boolean)
      .map(p => '          <p class="body-text" style="max-width:820px;margin:0 0 20px 0;">' + E(p) + '</p>')
      .join('\n');

    return this.section('Custom · ' + (s.title || ''),
      '    <div class="day">\n' +
      '      <div class="left">\n' +
      '        <div>\n' +
      '          <div class="chapter-label">' + E(s.eyebrow || '') + '</div>\n' +
      '          <h1>' + E(s.title || '') + (s.title2 ? '<br/>' + E(s.title2) : '') + '</h1>\n' +
      '          <div class="gold-rule" style="margin-bottom: 28px;"></div>\n' +
      body + '\n' +
      '        </div>\n' +
      '      </div>\n' +
      right +
      '    </div>');
  },

  /* Resuelve una referencia de foto. Acepta un nombre del banco
   * (assets/photos/), una ruta ya completa o una URL externa. */
  photo(m, ref, fallback) {
    const v = ref || fallback || '';
    if (!v) return '';
    if (/^(https?:)?\/\//.test(v) || v.indexOf('assets/') === 0 || v.indexOf('data:') === 0) return v;
    return 'assets/photos/' + v;
  },

  /* Valor listo para un atributo style. Va en el elemento y no en una variable
   * CSS a proposito: dentro de una variable, Chrome resuelve las url()
   * relativas contra el fichero .css donde se usa la variable, y las fotos se
   * pedian en /css/assets/... Aqui la url la resuelve el documento, que es lo
   * que queremos. */
  bgImage(url, gradient) {
    const layers = [];
    if (gradient) layers.push(gradient);
    if (url) layers.push("url('" + String(url).replace(/'/g, "%27") + "')");
    if (!layers.length) return '';
    return 'background-image: ' + layers.join(', ') + ';';
  },

  logo(ref) {
    const v = ref || '';
    if (!v) return '';
    if (/^(https?:)?\/\//.test(v) || v.indexOf('assets/') === 0 || v.indexOf('data:') === 0) return v;
    return 'assets/logos/' + v;
  },

  section(label, inner) {
    return '  <section data-label="' + this.esc(label) + '">\n' + inner + '\n  </section>';
  },

  /* -- 1 · Portada ----------------------------------------------------------- */
  slideCover(m) {
    const t = m.t, d = m.d, ui = m.ui, E = this.esc.bind(this);
    const client = t.clientName || t.tourName || '';
    const period = d.tourPeriod || this.travelWindow(m, true);
    const titleL1 = d.titleLine1 || (t.tourName || '').split(' ').slice(0, 1).join(' ');
    const titleL2Plain = d.titleLine2Plain || '';
    const titleL2Gold = d.titleLine2Gold || (t.tourName || '').split(' ').slice(1).join(' ');

    const crests = (d.crests && d.crests.length ? d.crests : []).map(c =>
      '            <div class="crest">\n' +
      '              <div class="shield">\n' +
      '                <img src="' + E(this.logo(c.logo)) + '" alt="' + E(c.name) + '" style="width:100%; height:100%; object-fit: contain;" />\n' +
      '              </div>\n' +
      '              <div class="lines">\n' +
      '                <div class="top">' + E(c.top || '') + '</div>\n' +
      '                <div class="name">' + E(c.name || '') + '</div>\n' +
      '                <div class="sub">' + E(c.sub || '') + '</div>\n' +
      '              </div>\n' +
      '            </div>').join('\n');

    const partners = crests
      ? '        <div class="cover-partners">\n' +
        '          <div class="label">' + E(d.crestsLabel || ui.inPartnershipWith) + '</div>\n' +
        '          <div class="crests">\n' + crests + '\n          </div>\n' +
        '        </div>\n'
      : '';

    const stat = (k, v) => '          <div class="stat">\n            <div class="k">' + E(k) +
      '</div>\n            <div class="v">' + E(v) + '</div>\n          </div>';

    const COVER_GRADIENT =
      'linear-gradient(180deg, rgba(10,8,6,0.55) 0%, rgba(10,8,6,0.45) 40%, rgba(10,8,6,0.92) 100%)';

    return this.section('01 Cover',
      '    <div class="cover">\n' +
      '      <div class="cover-img" style="' +
      this.bgImage(this.photo(m, d.coverPhoto, 'cover-floodlights.jpg'), COVER_GRADIENT) + '"></div>\n' +
      '      <div class="cover-content">\n\n' +
      '        <div class="cover-top">\n' +
      '          <div class="left-mark">\n' +
      (d.clientLogo ? '            <img src="' + E(this.logo(d.clientLogo)) + '" alt="' + E(client) + '" />\n            <div class="vrule"></div>\n' : '') +
      '            <div class="meta">\n' +
      '              <strong>' + E((d.clientLocation || client).toUpperCase()) + '</strong><br/>\n' +
      '              ' + E((d.tagline || '').toUpperCase()) + '<br/>\n' +
      '              ' + E(String(period).toUpperCase()) + '\n' +
      '            </div>\n' +
      '          </div>\n' +
      '          <div class="right-mark">\n' +
      '            <img src="assets/odisea-color.png" alt="Odisea Tours" />\n' +
      '          </div>\n' +
      '        </div>\n\n' +
      '        <div class="cover-mid">\n' +
      '          <div class="eyebrow">' + E(ui.chapterCover + ' · ' + ui.itinerary + ' · ' + period) + '</div>\n' +
      '          <h1>' + E(titleL1) + '<br/>' + E(titleL2Plain) + ' <span class="gold">' + E(titleL2Gold) + '</span></h1>\n' +
      '          <div class="sub">' + E(d.coverSub || '') + '</div>\n' +
      '        </div>\n\n' +
      '        <div class="cover-bottom">\n' +
      stat(ui.travelWindow, this.travelWindow(m)) + '\n' +
      stat(ui.groupSize, m.pax + ' PAX') + '\n' +
      stat(ui.cities, this.cityList(m)) + '\n' +
      stat(ui.operator, 'Odisea Tours') + '\n' +
      '        </div>\n\n' +
      partners +
      '      </div>\n' +
      '    </div>');
  },

  travelWindow(m, short) {
    const a = this.parseDate(m.t.startDate), b = this.parseDate(m.t.endDate);
    if (!a) return '';
    if (short) {
      const y = a.getFullYear();
      const mon = a.toLocaleDateString(m.ui.locale, { month: 'long' });
      return mon.charAt(0).toUpperCase() + mon.slice(1) + ' ' + y;
    }
    const to = m.lang === 'es' ? 'al' : 'to';
    const fa = a.toLocaleDateString(m.ui.locale, { day: '2-digit', month: 'short' });
    if (!b) return fa;
    const fb = b.toLocaleDateString(m.ui.locale, { day: '2-digit', month: 'short', year: 'numeric' });
    return fa + ' ' + to + ' ' + fb;
  },

  cityList(m) {
    const names = m.chapters.map(c => c.city).filter(Boolean);
    if (names.length) return names.join(' · ');
    return (m.t.destinations || [m.t.destination || '']).join(' · ');
  },

  /* -- 2 · Bienvenida -------------------------------------------------------- */
  slideWelcome(m) {
    const d = m.d, ui = m.ui, E = this.esc.bind(this);
    const g = d.glance || [];
    const defaults = [
      { k: ui.travelWindow, v: this.travelWindow(m) },
      { k: ui.length, v: m.days.length + ' ' + ui.days + ' · ' + m.nights + ' ' + ui.nights },
      { k: ui.groupSize, v: m.pax + ' PAX' },
      { k: ui.cities, v: this.cityList(m) }
    ];
    const items = [0, 1, 2, 3].map(i => {
      const it = g[i] || defaults[i];
      return '          <div>\n' +
        '            <div class="chapter-label" style="font-size: 14px;">' + E(it.k) + '</div>\n' +
        '            <div style="font-family: var(--f-display); font-weight: 700; font-size: 22px; margin-top: 10px; line-height: 1.3;">' + E(it.v) + '</div>\n' +
        '          </div>';
    }).join('\n');

    const wt = d.welcomeTitle || [m.t.clientName || '', ''];
    const gt = d.glanceTitle || [ui.atAGlance, ''];

    return this.section('02 Welcome',
      '    <div class="slide-pad" style="display:grid; grid-template-columns: 1.1fr 1fr; gap: 90px; align-items:center;">\n' +
      '      <div>\n' +
      '        <div class="chapter-label">' + E(ui.chapterWelcome) + ' <span class="gold-dot">&middot;</span> ' + E(ui.welcome) + '</div>\n' +
      '        <h1 class="display-title" style="font-size: 108px; margin: 28px 0 32px;">' + E(wt[0]) + '<br/>' + E(wt[1] || '') + '</h1>\n' +
      '        <div class="gold-rule" style="margin-bottom: 32px;"></div>\n' +
      '        <p class="body-text" style="max-width: 720px; font-size: 30px; margin: 0 0 24px 0;">' + E(d.welcomePara1 || '') + '</p>\n' +
      '        <p class="body-text" style="max-width: 720px; font-size: 30px; margin: 0;">' + E(d.welcomePara2 || '') + '</p>\n' +
      '      </div>\n' +
      '      <div style="background: var(--paper-warm); padding: 64px 56px; box-sizing: border-box; height: 720px; display:flex; flex-direction:column; justify-content: space-between;">\n' +
      '        <div>\n' +
      '          <div class="chapter-label" style="color: var(--gold-deep);">' + E(ui.atAGlance) + '</div>\n' +
      '          <h3 style="font-family: var(--f-display); font-weight: 800; font-size: 56px; letter-spacing: -0.02em; margin: 18px 0 36px; line-height: 1;">' + E(gt[0]) + '<br/>' + E(gt[1] || '') + '</h3>\n' +
      '        </div>\n' +
      '        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 44px 40px;">\n' +
      items + '\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>');
  },

  /* -- 3 · Resumen y ruta ---------------------------------------------------- */
  slideOverview(m) {
    const t = m.t, d = m.d, ui = m.ui, E = this.esc.bind(this);
    const kv = (k, v) => '          <div>\n            <div class="k">' + E(k) +
      '</div>\n            <div class="v">' + E(v) + '</div>\n          </div>';

    const route = m.chapters.map((c, i) => {
      const n = (c.to - c.from) + 1;
      const nights = c.nights != null ? c.nights : Math.max(1, n - (i === m.chapters.length - 1 ? 1 : 0));
      return '          <div class="route-item">\n' +
        '            <div class="num">' + this.pad2(i + 1) + '</div>\n' +
        '            <div class="city">' + E(c.city) + '</div>\n' +
        '            <div class="nights">' + E(nights + ' ' + ui.nights) + '</div>\n' +
        '          </div>';
    }).join('\n');

    const coords = m.chapters.map(c => this.coords(c.city)).filter(Boolean).join('  ·  ');
    const rt = d.routeTitle || [ui.overview, ''];

    return this.section('03 Tour Overview',
      '    <div class="overview">\n' +
      '      <div class="left">\n' +
      '        <div class="chapter-label">' + E(ui.chapterOverview) + ' <span class="gold-dot">&middot;</span> ' + E(ui.overview) + '</div>\n' +
      '        <h1 class="display-title">' + E(ui.tourAtAGlance[0]) + '<br/>' + E(ui.tourAtAGlance[1]) + '</h1>\n' +
      '        <p class="body-text" style="max-width: 660px;">' + E(d.overviewPara || '') + '</p>\n\n' +
      '        <div class="stat-grid">\n' +
      kv(ui.tourDates, this.travelWindow(m)) + '\n' +
      kv(ui.length, m.days.length + ' ' + ui.days + ' · ' + m.nights + ' ' + ui.nights) + '\n' +
      kv(ui.groupCapacity, m.pax + ' PAX') + '\n' +
      kv(ui.minAge, d.minAge || '') + '\n' +
      kv(ui.arriveInto, d.arriveInto || '') + '\n' +
      kv(ui.departFrom, d.departFrom || '') + '\n' +
      '        </div>\n' +
      '      </div>\n\n' +
      '      <div class="right">\n' +
      '        <div class="map-eyebrow">' + E(d.routeEyebrow || ui.itinerary) + '</div>\n' +
      '        <h3>' + E(rt[0]) + '<br/>' + E(rt[1] || '') + '</h3>\n' +
      '        <div class="route-list">\n' + route + '\n        </div>\n' +
      '        <div class="route-coords">\n          ' + E(coords) + '\n        </div>\n' +
      '      </div>\n' +
      '    </div>');
  },

  coords(city) {
    if (!city) return '';
    const key = String(city).toLowerCase().trim();
    return this.COORDS[key] || '';
  },

  /* -- Capitulo -------------------------------------------------------------- */
  slideChapter(m, c) {
    const ui = m.ui, E = this.esc.bind(this);
    const city = (c.city || '').toUpperCase();
    // Una letra en color dentro del nombre de la ciudad. Por defecto la
    // primera; c.accentIndex la mueve.
    const ai = Math.max(0, Math.min(city.length - 1, c.accentIndex == null ? 0 : c.accentIndex));
    const pre = city.slice(0, ai), acc = city.slice(ai, ai + 1), post = city.slice(ai + 1);

    const partLabel = c.partLabel ||
      [ui.part + ' ' + (ui.partWords[c.index] || (c.index + 1)), c.city, this.coords(c.city)]
        .filter(Boolean).join(' · ');

    const dayNums = [];
    for (let i = c.from; i <= c.to && i < m.days.length; i++) dayNums.push(this.pad2(i + 1));
    const dayLabel = (m.lang === 'es' ? 'Días ' : 'Days ') + dayNums.join(' · ');

    const first = m.days[c.from], last = m.days[Math.min(c.to, m.days.length - 1)];
    const dates = c.dates || this.rangeLabel(m, first && first.date, last && last.date);

    return this.section(this.pad2(c.index + 1) + ' Chapter ' + (c.index + 1),
      '    <div class="chapter">\n' +
      '      <div class="bg-img" style="' + this.bgImage(this.photo(m, c.photo, '')) + '"></div>\n' +
      '      <div>\n' +
      '        <div class="num">' + E(partLabel) + '</div>\n' +
      '        <h2 style="margin-top: 32px;">' + E(pre) + '<span class="accent">' + E(acc) + '</span>' + E(post) + '.</h2>\n' +
      '        <p class="lede">' + E(c.lede || '') + '</p>\n' +
      '      </div>\n' +
      '      <div class="meta-row">\n' +
      '        <span>' + E(dayLabel) + '</span>\n' +
      '        <span>' + E(dates) + '</span>\n' +
      '        <span>' + E(c.highlights || '') + '</span>\n' +
      '      </div>\n' +
      '    </div>');
  },

  rangeLabel(m, a, b) {
    const da = this.parseDate(a), db = this.parseDate(b);
    if (!da) return '';
    const to = m.lang === 'es' ? 'al' : 'to';
    if (!db || +da === +db) {
      return da.toLocaleDateString(m.ui.locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const sameMonth = da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
    const fa = sameMonth
      ? String(da.getDate())
      : da.toLocaleDateString(m.ui.locale, { day: 'numeric', month: 'long' });
    return fa + ' ' + to + ' ' + db.toLocaleDateString(m.ui.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  },

  /* -- Dia -------------------------------------------------------------------
   * Aqui es donde el CRM ya tenia hecho el trabajo: t.itinerary[i].items es
   * exactamente lo que la plantilla llamaba sched-row, y el flag highlight es
   * la clase feature. */
  slideDay(m, i) {
    const ui = m.ui, E = this.esc.bind(this);
    const day = m.days[i];
    const dd = (m.d.days && m.d.days[i]) || {};
    const num = this.pad2(day.day || (i + 1));

    const items = day.items || [];
    const rows = items.map(it =>
      '          <div class="sched-row' + (it.highlight ? ' feature' : '') + '">' +
      '<div class="time">' + this.fmtTime(it.time) + '</div>' +
      '<div class="what">' + E(it.description || '') + '</div></div>'
    ).join('\n');

    // El titular del dia: si el CRM trae title, se parte en dos lineas por la
    // barra vertical; si no, se usa el que se haya escrito en la pestana Deck.
    const rawTitle = dd.titleLine1 ? null : (day.title || '');
    let l1 = dd.titleLine1 || '', l2 = dd.titleLine2 || '';
    if (rawTitle) {
      const parts = rawTitle.split('|');
      l1 = (parts[0] || '').trim();
      l2 = (parts[1] || '').trim();
    }

    const city = dd.city || day.city || this.cityOfDay(m, i);
    const isTransfer = /→|->/.test(city);
    const metaK = dd.metaK || (isTransfer ? ui.transfer : ui.stay);
    const metaV = dd.metaV || city;

    // Lo destacado sale solo de la primera fila marcada como feature.
    const firstFeature = items.filter(x => x.highlight)[0];
    const highlight = dd.highlight || (firstFeature ? firstFeature.description : '');

    const photoSrc = this.photo(m, dd.photo, '');
    const right = photoSrc
      ? '      <div class="right has-photo">\n' +
        '        <div class="photo-area" style="' + this.bgImage(photoSrc) + '">\n' +
        '          <div class="photo-cap">' + E(dd.photoCap || city) + '</div>\n' +
        '        </div>\n' +
        '        <div class="schedule-wrap">\n'
      : '      <div class="right">\n        <div class="schedule-wrap">\n';

    return this.section(this.pad2(i + 1) + ' Day ' + num,
      '    <div class="day">\n' +
      '      <div class="left">\n' +
      '        <div>\n' +
      '          <div class="day-eyebrow">' + E(ui.day) + ' <span class="num">' + num + '</span> <span class="gold-dot">&middot;</span> ' + E(city) + '</div>\n' +
      '          <h1>' + E(l1) + (l2 ? '<br/>' + E(l2) : '') + '</h1>\n' +
      '          <div class="gold-rule" style="margin-bottom: 28px;"></div>\n' +
      '          <p class="summary">' + E(dd.summary || '') + '</p>\n' +
      '        </div>\n' +
      '        <div class="footer-meta">\n' +
      '          <div><div class="k">' + E(ui.date) + '</div><div class="v">' + E(this.fmtDate(day.date, m.lang, { weekday: 'long', day: 'numeric', month: 'long' })) + '</div></div>\n' +
      '          <div><div class="k">' + E(metaK) + '</div><div class="v">' + E(metaV) + '</div></div>\n' +
      '          <div><div class="k">' + E(ui.highlight) + '</div><div class="v">' + E(highlight) + '</div></div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      right +
      '        <div class="heading">\n' +
      '          <div class="title">' + E(ui.schedule) + ' &middot; ' + E(ui.day) + ' ' + num + '</div>\n' +
      '          <div class="date">' + E(this.fmtDate(day.date, m.lang, { day: '2-digit', month: 'short', year: 'numeric' })) + '</div>\n' +
      '        </div>\n' +
      '        <div class="schedule">\n' + rows + '\n        </div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>');
  },

  cityOfDay(m, i) {
    const c = m.chapters.filter(x => i >= x.from && i <= x.to)[0];
    return c ? c.city : '';
  },

  /* -- Que incluye y precios -------------------------------------------------- */
  slideInclusions(m) {
    const t = m.t, d = m.d, ui = m.ui, E = this.esc.bind(this);

    // t.inclusions es una lista plana de textos. La plantilla quiere pares
    // clave/valor, asi que se parte por el primer ':' cuando lo hay.
    const raw = (d.inclusions && d.inclusions.length)
      ? d.inclusions
      : (t.inclusions || []).map(s => {
          const idx = String(s).indexOf(':');
          return idx > 0
            ? { k: String(s).slice(0, idx).trim(), v: String(s).slice(idx + 1).trim() }
            : { k: '', v: String(s) };
        });

    const items = raw.filter(x => x && (x.k || x.v)).slice(0, 7).map(x =>
      '          <div class="item">\n' +
      '            <div class="k">' + E(x.k || (m.lang === 'es' ? 'Incluido' : 'Included')) + '</div>\n' +
      '            <div class="v">' + E(x.v) + '</div>\n' +
      '          </div>').join('\n');

    const notIncluded = d.notIncluded || this.defaultNotIncluded(m);

    const tiers = this.tiers(m).map((tier, i) =>
      '          <div class="pricing-row' + (i === 0 ? ' featured' : '') + '">\n' +
      '            <div class="label">\n' +
      '              ' + E(tier.label) + '\n' +
      '              <span class="desc">' + E(tier.desc || '') + '</span>\n' +
      '            </div>\n' +
      '            <div class="price">' + (m.noPricing || !tier.price
                    ? E(ui.onRequest)
                    : '<span class="ccy">' + E(m.ccy) + '</span>' + E(this.money(tier.price, m.lang))) + '</div>\n' +
      '          </div>').join('\n');

    return this.section('Inclusions and Pricing',
      '    <div class="inclusions">\n' +
      '      <div class="left">\n' +
      '        <div class="chapter-label">' + E(ui.chapterPackage) + ' <span class="gold-dot">&middot;</span> ' + E(ui.thePackage) + '</div>\n' +
      '        <h1 class="display-title">' + E(ui.whatsIncluded[0]) + '<br/>' + E(ui.whatsIncluded[1]) + '</h1>\n' +
      '        <div class="gold-rule" style="margin-bottom: 28px;"></div>\n' +
      '        <p class="body-text">' + E(d.inclusionsIntro || '') + '</p>\n\n' +
      '        <div class="grid">\n' + items + '\n' +
      '          <div class="item">\n' +
      '            <div class="k">' + E(ui.notIncluded) + '</div>\n' +
      '            <div class="v">' + E(notIncluded) + '</div>\n' +
      '          </div>\n' +
      '        </div>\n' +
      '      </div>\n\n' +
      '      <div class="right">\n' +
      '        <div class="eyebrow">' + E(ui.thePackage + ' · ' + ui.perPerson + ' · ' + m.ccyCode) + '</div>\n' +
      '        <h2>' + E(ui.pricing) + '</h2>\n\n' +
      '        <div class="pricing-table">\n' + tiers + '\n        </div>\n\n' +
      '        <div class="pricing-note">\n' +
      '          <span class="star">★</span>\n' +
      '          <span>' + E(d.pricingNote || '') + '</span>\n' +
      '        </div>\n\n' +
      '        <div class="pricing-foot">\n' +
      '          <div><div class="k">' + E(ui.groupBasis) + '</div><div class="v">' + E(m.pax + ' ' + ui.confirmed) + '</div></div>\n' +
      '          <div><div class="k">' + E(ui.currency) + '</div><div class="v">' + E(m.ccyCode + ' · ' + m.ccy) + '</div></div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>');
  },

  /* Media pension SIEMPRE y seguro NUNCA incluido: las dos reglas duras de
   * Odisea. Si nadie escribe nada, el deck las dice bien por defecto. */
  defaultNotIncluded(m) {
    return m.lang === 'es'
      ? 'Vuelos internacionales · comidas del mediodía (por cuenta propia) · seguro de viaje y médico, obligatorio, que aporta cada club · gastos personales'
      : 'International flights · lunches (at own cost) · travel and medical insurance, mandatory, arranged by each club · personal expenses';
  },

  tiers(m) {
    const t = m.t, d = m.d, lang = m.lang;
    if (d.tiers && d.tiers.length) return d.tiers;
    const L = lang === 'es'
      ? { p: 'Jugador', pd: 'Plaza completa en habitación compartida',
          s: 'Hermano/a', sd: 'Acompañante menor',
          a: 'Adulto', ad: 'Familiar o acompañante',
          c: 'Técnico', cd: 'Cuerpo técnico del club' }
      : { p: 'Player', pd: 'Full place, shared room',
          s: 'Sibling', sd: 'Accompanying child',
          a: 'Adult', ad: 'Family or supporter',
          c: 'Coach', cd: 'Club coaching staff' };
    return [
      { label: L.p, desc: L.pd, price: t.priceStudent },
      { label: L.s, desc: L.sd, price: t.priceSibling },
      { label: L.a, desc: L.ad, price: t.priceAdult },
      { label: L.c, desc: L.cd, price: t.priceCoach }
    ].filter(x => m.noPricing || (x.price != null && x.price !== '' && +x.price > 0));
  },

  /* Calendario 25 / 35 / 40 contando hacia atrás desde la salida. Es solo el
   * punto de partida: en cuanto se toca en la pestaña Deck, manda lo editado. */
  defaultPayments(m) {
    const ui = m.ui;
    const start = this.parseDate(m.t.startDate);
    const minus = (days) => {
      if (!start) return '';
      const x = new Date(start.getTime());
      x.setDate(x.getDate() - days);
      return x.toLocaleDateString(ui.locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const base = +m.t.priceStudent || 0;
    const p1 = base ? Math.round(base * 0.25) : null;
    const p2 = base ? Math.round(base * 0.35) : null;
    return [
      { due: m.d.reserveBy || minus(300), amount: p1, desc: ui.firstComeFirstServed },
      { due: minus(120), amount: p2,
        desc: m.lang === 'es' ? 'Con el grupo ya cerrado' : 'Once the group is confirmed' },
      { due: minus(45), amount: base ? base - p1 - p2 : null,
        desc: m.lang === 'es' ? 'Resto del importe' : 'Balance of the package' }
    ];
  },

  /* -- Calendario de pagos ---------------------------------------------------- */
  slidePayment(m) {
    const d = m.d, ui = m.ui, E = this.esc.bind(this);

    const pay = (d.payments && d.payments.length) ? d.payments : this.defaultPayments(m);
    const labels = [ui.deposit, ui.secondPayment, ui.finalPayment];

    const rows = pay.slice(0, 3).map((p, i) =>
      '          <div class="pricing-row' + (i === 0 ? ' featured' : '') + '">\n' +
      '            <div class="label">\n' +
      '              <span style="display:flex; align-items:baseline; gap:14px;"><span style="font-family:var(--f-mono); font-size:16px; letter-spacing:0.28em; color:var(--gold);">' + this.pad2(i + 1) + '</span> ' + E(labels[i]) + '</span>\n' +
      '              <span class="desc">' + E(p.desc || '') + ' &middot; ' + E(ui.due) + ' ' + E(p.due || '') + '</span>\n' +
      '            </div>\n' +
      '            <div class="price">' + (m.noPricing || !p.amount
                    ? E(ui.onRequest)
                    : '<span class="ccy">' + E(m.ccy) + '</span>' + E(this.money(p.amount, m.lang))) + '</div>\n' +
      '          </div>').join('\n');

    const res = d.reservationItems || [];
    const items = res.slice(0, 3).map(x =>
      '          <div class="item">\n' +
      '            <div class="k">' + E(x.k || '') + '</div>\n' +
      '            <div class="v">' + E(x.v || '') + '</div>\n' +
      '          </div>').join('\n');

    return this.section('Payment Schedule',
      '    <div class="inclusions">\n' +
      '      <div class="left">\n' +
      '        <div class="chapter-label">' + E(ui.chapterReservations) + ' <span class="gold-dot">&middot;</span> ' + E(ui.reservations) + '</div>\n' +
      '        <h1 class="display-title">' + E(ui.securingYourPlace[0]) + '<br/>' + E(ui.securingYourPlace[1]) + '</h1>\n' +
      '        <div class="gold-rule" style="margin-bottom: 28px;"></div>\n' +
      '        <p class="body-text">' + E(d.reservationIntro || '') + '</p>\n\n' +
      '        <div class="grid">\n' + items + '\n        </div>\n' +
      '      </div>\n\n' +
      '      <div class="right">\n' +
      '        <div class="eyebrow">' + E(ui.paymentSchedule + ' · ' + m.ccyCode + ' · ' + ui.perPerson) + '</div>\n' +
      '        <h2>' + E(ui.threePayments[0]) + '<br/>' + E(ui.threePayments[1]) + '</h2>\n\n' +
      '        <div class="pricing-table">\n' + rows + '\n        </div>\n\n' +
      '        <div class="pricing-note">\n' +
      '          <span class="star">★</span>\n' +
      '          <span>' + E(d.paymentNote || '') + '</span>\n' +
      '        </div>\n\n' +
      '        <div class="pricing-foot">\n' +
      '          <div><div class="k">' + E(ui.reserveBy) + '</div><div class="v">' + E(d.reserveBy || (pay[0] && pay[0].due) || '') + '</div></div>\n' +
      '          <div><div class="k">' + E(ui.departure) + '</div><div class="v">' + E(this.fmtDate(m.t.startDate, m.lang, { day: 'numeric', month: 'long', year: 'numeric' })) + '</div></div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>');
  },

  /* -- Cierre ----------------------------------------------------------------- */
  slideClosing(m) {
    const d = m.d, ui = m.ui, E = this.esc.bind(this);
    const ct = d.closingTitle || [m.lang === 'es' ? 'Vamos,' : 'Vamos,', (m.t.clientName || '') + '.'];

    return this.section('Closing',
      '    <div class="closing">\n' +
      '      <div class="col-left">\n' +
      '        <div class="top">\n' +
      '          <div class="marks">\n' +
      '            <img class="mark" src="assets/odisea-color.png" alt="Odisea Tours" />\n' +
      (d.clientLogo
        ? '            <div class="mark-divider"></div>\n' +
          '            <img class="mark mark-kearny" src="' + E(this.logo(d.clientLogo)) + '" alt="' + E(m.t.clientName || '') + '" />\n'
        : '') +
      '          </div>\n' +
      '        </div>\n' +
      '        <div>\n' +
      '          <div class="chapter-label" style="color: var(--gold);">' + E(ui.fin) + ' &middot; ' + E(ui.theInvitation) + '</div>\n' +
      '          <h1 style="margin-top: 24px;">' + E(ct[0]) + '<br/><span class="gold">' + E(ct[1] || '') + '</span></h1>\n' +
      '          <p class="body-text" style="color: rgba(246,246,246,0.78); font-size: 30px; max-width: 720px; margin-top: 28px;">' + E(d.closingLede || '') + '</p>\n' +
      '        </div>\n' +
      '        <div class="contact" style="grid-template-columns: repeat(2, 1fr); gap: 28px 48px;">\n' +
      '          <div><div class="k">' + E(ui.tourLead) + '</div><div class="v">' + E(d.leadName || 'Juan Sánchez') + '<br/>Odisea Tours</div></div>\n' +
      '          <div><div class="k">' + E(ui.email) + '</div><div class="v gold">' + E(d.leadEmail || 'juan@odisea-tours.com') + '</div></div>\n' +
      '          <div><div class="k">' + E(ui.phone) + '</div><div class="v">' + E(d.leadPhone || '+34 670 059 797') + '</div></div>\n' +
      '          <div><div class="k">' + E(ui.webSocial) + '</div><div class="v">odisea-tours.com<br/>@Odisea_Tours</div></div>\n' +
      '        </div>\n' +
      '      </div>\n\n' +
      '      <div class="col-right">\n' +
      '        <div class="photo" style="' +
      this.bgImage(this.photo(m, d.closingPhoto, 'closing-fcb-group.jpg')) + '"></div>\n' +
      '        <div class="grad"></div>\n' +
      '        <div class="frame"></div>\n' +
      '        <div class="corner tl"></div>\n' +
      '        <div class="corner tr"></div>\n' +
      '        <div class="corner bl"></div>\n' +
      '        <div class="corner br"></div>\n' +
      '        <div class="photo-meta">\n' +
      '          <div>\n' +
      '            <div class="eyebrow">' + E(d.closingPhotoEyebrow || '') + '</div>\n' +
      '            <div class="ttl">' + E(d.closingPhotoTitle || '') + '</div>\n' +
      '          </div>\n' +
      '          <div class="stamp">' + E(d.closingPhotoStamp || this.travelWindow(m, true)) + '</div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>');
  }
};
