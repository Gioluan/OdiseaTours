/* === ODISEA DECK · editor de los campos de presentación =======================
 *
 * El CRM ya sabe las fechas, el grupo, los precios y la agenda día a día. Lo que
 * no sabe es lo editorial: qué foto va en cada capítulo, cómo se llama el
 * capítulo, el color del club, el texto de bienvenida. Eso se edita aquí y se
 * guarda en t.deck.
 *
 * Todo es opcional. Un tour sin nada de esto genera igualmente un deck
 * presentable; lo que se rellena aquí es lo que lo convierte en el deck de ESE
 * club y no en una plantilla.
 *
 * DeckEditor.render(t)  -> HTML de la sección, se inyecta desde tours.js
 */
const DeckEditor = {

  _photos: null,

  /* El banco de fotos se lee una vez y se cachea. Si no carga, los selectores
   * pasan a ser campos de texto libres: nunca bloquea la edición. */
  loadPhotos() {
    if (this._photos) return Promise.resolve(this._photos);
    return fetch('assets/photos.json')
      .then(r => r.json())
      .then(j => { this._photos = j; if (typeof DeckLint !== 'undefined') DeckLint._manifest = j; return j; })
      .catch(() => { this._photos = { photos: {}, logos: {} }; return this._photos; });
  },

  esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /* Botón con la miniatura de lo que hay elegido. Abre el selector visual.
   * Un desplegable de nombres de fichero no sirve para elegir una imagen. */
  photoSelect(tourId, path, value, label, kind) {
    kind = kind || 'photo';
    const url = this.resolve(value, kind);
    const bank = (this._photos && (kind === 'logo' ? this._photos.logos : this._photos.photos)) || {};
    const meta = bank[value] || {};
    const caption = value
      ? (meta.label || (String(value).indexOf('http') === 0 ? 'Imagen subida' : value))
      : 'Elegir…';

    return (label ? '<label style="font-size:0.75rem;color:var(--gray-400);display:block;margin-bottom:0.15rem">' + this.esc(label) + '</label>' : '') +
      '<button type="button" onclick="DeckPicker.open(' + tourId + ',\'' + path + '\',\'' + kind + '\')" ' +
      'style="width:100%;display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0.4rem;background:#fff;' +
      'border:1.5px solid ' + (meta.caution ? 'var(--red)' : 'var(--gray-200)') + ';border-radius:var(--radius);cursor:pointer;text-align:left">' +
      '<span style="width:42px;height:30px;flex-shrink:0;border-radius:3px;background:' +
      (url ? '#111 url(\'' + this.esc(url) + '\') center/' + (kind === 'logo' ? 'contain' : 'cover') + ' no-repeat' : 'var(--gray-100)') +
      ';display:block"></span>' +
      '<span style="font-size:0.75rem;color:' + (value ? '#111' : 'var(--gray-400)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      (meta.caution ? '⚠ ' : '') + this.esc(caption) + '</span></button>';
  },

  /* Un valor guardado puede ser un nombre del banco o una URL ya completa. */
  resolve(v, kind) {
    if (!v) return '';
    if (/^(https?:)?\/\//.test(v) || v.indexOf('assets/') === 0 || v.indexOf('data:') === 0) return v;
    return (kind === 'logo' ? 'assets/logos/' : 'assets/photos/') + v;
  },

  field(tourId, path, value, label, placeholder, type) {
    return '<div class="form-group" style="margin-bottom:0.6rem">' +
      '<label style="font-size:0.75rem;color:var(--gray-400)">' + this.esc(label) + '</label>' +
      (type === 'textarea'
        ? '<textarea rows="2" placeholder="' + this.esc(placeholder || '') + '" style="width:100%;padding:0.35rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit" onchange="DeckEditor.save(' + tourId + ',\'' + path + '\',this.value)">' + this.esc(value) + '</textarea>'
        : '<input type="' + (type || 'text') + '" value="' + this.esc(value) + '" placeholder="' + this.esc(placeholder || '') + '" style="width:100%;padding:0.35rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(' + tourId + ',\'' + path + '\',this.value)">') +
      '</div>';
  },

  render(t) {
    const d = t.deck || {};
    const id = t.id;
    const days = t.itinerary || [];
    const E = this.esc.bind(this);

    // Capítulos: si no se han definido, se muestra el reparto que el motor
    // deduciría, para poder ajustarlo en vez de escribirlo de cero.
    const chapters = (d.chapters && d.chapters.length)
      ? d.chapters
      : (typeof Deck !== 'undefined' ? Deck.chapters(t, days, d.lang || 'en') : []);

    const chapterRows = chapters.map((c, i) => `
      <div style="background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:0.6rem;margin-bottom:0.5rem">
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.4rem">
          <span style="background:var(--amber);color:#111;font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0">${i + 1}</span>
          <input value="${E(c.city)}" placeholder="Ciudad" style="flex:1;padding:0.3rem 0.45rem;font-weight:600;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter(${id},${i},'city',this.value)">
          <input type="number" min="1" value="${(c.from || 0) + 1}" title="Primer día" style="width:52px;padding:0.3rem;font-size:0.8rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter(${id},${i},'from',this.value-1)">
          <span style="color:var(--gray-400);font-size:0.8rem">→</span>
          <input type="number" min="1" value="${(c.to != null ? c.to : 0) + 1}" title="Último día" style="width:52px;padding:0.3rem;font-size:0.8rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter(${id},${i},'to',this.value-1)">
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem" onclick="DeckEditor.removeChapter(${id},${i})">&#10005;</button>
        </div>
        <input value="${E(c.lede || '')}" placeholder="Una frase sobre la ciudad" style="width:100%;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);margin-bottom:0.35rem" onchange="DeckEditor.saveChapter(${id},${i},'lede',this.value)">
        <div style="display:flex;gap:0.4rem">
          <input value="${E(c.highlights || '')}" placeholder="Lo destacado · separado por ·" style="flex:1;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter(${id},${i},'highlights',this.value)">
          <div style="flex:1">${this.photoSelect(id, 'chapters.' + i + '.photo', c.photo, '')}</div>
        </div>
      </div>`).join('');

    const dayRows = days.map((day, i) => {
      const dd = (d.days && d.days[i]) || {};
      return `
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
        <span style="width:22px;font-size:0.78rem;color:var(--gray-400);flex-shrink:0">${day.day || i + 1}</span>
        <input value="${E(dd.summary || '')}" placeholder="Resumen del día (una frase)" style="flex:2;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveDay(${id},${i},'summary',this.value)">
        <input value="${E(dd.city || day.city || '')}" placeholder="Ciudad" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveDay(${id},${i},'city',this.value)">
        <div style="flex:1">${this.photoSelect(id, 'days.' + i + '.photo', dd.photo, '')}</div>
      </div>`;
    }).join('');

    return `
      <h3 style="margin-top:1.5rem">Deck <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— presentación de itinerario para el cliente</span></h3>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.8rem">
        <button class="btn btn-sm" style="background:var(--amber);color:#111;font-weight:700" onclick="Deck.generate(${id})">Generar Deck</button>
        <button class="btn btn-sm btn-outline" onclick="Deck.generate(${id},{noPricing:true})">Deck sin precios</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="DeckCosting.export(${id})">Excel de costes</button>
        <button class="btn btn-sm btn-outline" onclick="DeckEditor.lint(${id})">Revisar reglas</button>
      </div>

      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem">
        <div class="form-row form-row-4">
          <div class="form-group" style="margin-bottom:0.6rem">
            <label style="font-size:0.75rem;color:var(--gray-400)">Idioma</label>
            <select style="width:100%;padding:0.35rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'lang',this.value)">
              <option value="en"${d.lang !== 'es' ? ' selected' : ''}>English</option>
              <option value="es"${d.lang === 'es' ? ' selected' : ''}>Castellano</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0.6rem">
            <label style="font-size:0.75rem;color:var(--gray-400)">Público</label>
            <select style="width:100%;padding:0.35rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'audience',this.value)">
              <option value=""${!d.audience ? ' selected' : ''}>— deducir —</option>
              <option value="us"${d.audience === 'us' ? ' selected' : ''}>EE.UU. (soccer)</option>
              <option value="uk"${d.audience === 'uk' ? ' selected' : ''}>Reino Unido (football)</option>
              <option value="au"${d.audience === 'au' ? ' selected' : ''}>Australia (football)</option>
              <option value="ie"${d.audience === 'ie' ? ' selected' : ''}>Irlanda (football)</option>
            </select>
          </div>
          ${this.field(id, 'clientAccent', d.clientAccent || '#FFB400', 'Color del club', '#FFB400', 'color')}
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'clientLogo', d.clientLogo, 'Logo del cliente', 'logo')}</div>
        </div>

        <div class="form-row form-row-2">
          ${this.field(id, 'clientLocation', d.clientLocation, 'Ubicación del cliente', 'Michigan · Portage SC')}
          ${this.field(id, 'tourPeriod', d.tourPeriod, 'Periodo (portada)', 'Julio 2027')}
        </div>

        <div class="form-row form-row-3">
          ${this.field(id, 'tagline', d.tagline, 'Bajada de portada', 'Gira de fútbol base')}
          ${this.field(id, 'titleLine1', d.titleLine1, 'Título línea 1', 'Spanish')}
          ${this.field(id, 'titleLine2Plain', d.titleLine2Plain, 'Línea 2 (negro)', 'Soccer &')}
          ${this.field(id, 'titleLine2Gold', d.titleLine2Gold, 'Línea 2 (oro)', 'Culture')}
        </div>

        <div class="form-row form-row-4">
          ${this.field(id, 'arriveInto', d.arriveInto, 'Llegada a', 'Barcelona (BCN)')}
          ${this.field(id, 'departFrom', d.departFrom, 'Salida desde', 'Barcelona (BCN)')}
          ${this.field(id, 'minAge', d.minAge, 'Edades', 'SUB12 – SUB16')}
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'coverPhoto', d.coverPhoto, 'Foto de portada')}</div>
        </div>

        ${this.field(id, 'coverSub', d.coverSub, 'Subtítulo de portada', 'Una frase que resuma la gira')}
        ${this.field(id, 'welcomePara1', d.welcomePara1, 'Bienvenida · párrafo 1', '', 'textarea')}
        ${this.field(id, 'welcomePara2', d.welcomePara2, 'Bienvenida · párrafo 2', '', 'textarea')}
        ${this.field(id, 'overviewPara', d.overviewPara, 'Resumen de la gira', '', 'textarea')}
      </div>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Capítulos <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— una slide de apertura por ciudad</span></h4>
      ${chapterRows || '<p style="color:var(--gray-400);font-size:0.82rem">Añade días al itinerario y aquí aparecerá el reparto por ciudad.</p>'}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addChapter(${id})">+ Añadir capítulo</button>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Escudos de portada
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— dónde entrena el grupo. Nunca lenguaje de "partner oficial"</span></h4>
      ${(d.crests || []).map((c, i) => `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.35rem">
          <div style="width:150px;flex-shrink:0">${this.photoSelect(id, 'crests.' + i + '.logo', c.logo, '', 'logo')}</div>
          <input value="${E(c.top || '')}" placeholder="Sobretítulo (La Liga)" style="width:130px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'crests.${i}.top',this.value)">
          <input value="${E(c.name || '')}" placeholder="Nombre (FC Barcelona)" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'crests.${i}.name',this.value)">
          <input value="${E(c.sub || '')}" placeholder="Pie (Joan Gamper · BCN)" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'crests.${i}.sub',this.value)">
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem" onclick="DeckEditor.removeCrest(${id},${i})">&#10005;</button>
        </div>`).join('')}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addCrest(${id})">+ Añadir escudo</button>

      ${days.length ? `
      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Días <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— la agenda sale del itinerario; aquí solo el resumen y la foto</span></h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.8rem">${dayRows}</div>` : ''}

      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:1rem">
        <h4 style="font-size:0.88rem;margin-bottom:0.4rem">Cierre</h4>
        <div class="form-row form-row-3">
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'closingPhoto', d.closingPhoto, 'Foto de cierre')}</div>
          ${this.field(id, 'closingPhotoEyebrow', d.closingPhotoEyebrow, 'Sobretítulo de la foto', 'Camp Nou · Barcelona')}
          ${this.field(id, 'closingPhotoTitle', d.closingPhotoTitle, 'Título sobre la foto', 'Donde empieza el siguiente recuerdo.')}
        </div>
        ${this.field(id, 'closingLede', d.closingLede, 'Frase de cierre', '', 'textarea')}
        <div class="form-row form-row-3">
          ${this.field(id, 'leadName', d.leadName || 'Juan Sánchez', 'Responsable')}
          ${this.field(id, 'leadEmail', d.leadEmail || 'juan@odisea-tours.com', 'Correo')}
          ${this.field(id, 'leadPhone', d.leadPhone || '+34 670 059 797', 'Teléfono')}
        </div>
      </div>`;
  },

  /* -- Guardado --------------------------------------------------------------
   * Un solo punto de escritura. path admite 'campo' y 'coleccion.N.campo'. */
  save(tourId, path, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};

    const parts = String(path).split('.');
    let node = t.deck;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const nextIsIndex = /^\d+$/.test(parts[i + 1]);
      if (node[key] == null) node[key] = nextIsIndex ? [] : {};
      node = node[key];
    }
    node[parts[parts.length - 1]] = value;
    DB.saveTour(t);
  },

  saveChapter(tourId, i, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    // La primera edición congela el reparto que el motor había deducido, para
    // que tocar una ciudad no reordene todo lo demás.
    if (!t.deck.chapters || !t.deck.chapters.length) {
      t.deck.chapters = Deck.chapters(t, t.itinerary || [], t.deck.lang || 'en')
        .map(c => ({ city: c.city, from: c.from, to: c.to, lede: c.lede || '', highlights: c.highlights || '', photo: c.photo || '' }));
    }
    if (!t.deck.chapters[i]) t.deck.chapters[i] = { city: '', from: 0, to: 0 };
    t.deck.chapters[i][field] = (field === 'from' || field === 'to') ? Math.max(0, +value || 0) : value;
    DB.saveTour(t);
    if (field === 'from' || field === 'to') Tours.viewTour(tourId);
  },

  addChapter(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.chapters) t.deck.chapters = [];
    const last = t.deck.chapters[t.deck.chapters.length - 1];
    const from = last ? Math.min((last.to || 0) + 1, Math.max(0, (t.itinerary || []).length - 1)) : 0;
    t.deck.chapters.push({ city: '', from: from, to: from, lede: '', highlights: '', photo: '' });
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  removeChapter(tourId, i) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.deck || !t.deck.chapters) return;
    t.deck.chapters.splice(i, 1);
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  saveDay(tourId, i, field, value) {
    this.save(tourId, 'days.' + i + '.' + field, value);
  },

  addCrest(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.crests) t.deck.crests = [];
    t.deck.crests.push({ logo: '', top: '', name: '', sub: '' });
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  removeCrest(tourId, i) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.deck || !t.deck.crests) return;
    t.deck.crests.splice(i, 1);
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  /* Pasa el linter y enseña el resultado sin generar nada. */
  lint(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    this.loadPhotos().then(() => {
      const problems = DeckLint.check(t, {});
      if (!problems.length) {
        alert('Sin problemas. El deck cumple las reglas de Odisea.');
        return;
      }
      const lines = problems.map(p => (p.level === 'error' ? '✖  ' : '⚠  ') + p.msg);
      alert(problems.filter(p => p.level === 'error').length
        ? 'Hay que corregir esto antes de enviarlo:\n\n' + lines.join('\n\n')
        : 'Avisos:\n\n' + lines.join('\n\n'));
    });
  }
};

// El banco de fotos se precarga en cuanto arranca la app, para que los
// desplegables ya estén llenos la primera vez que se abre un tour.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => { DeckEditor.loadPhotos(); });
}
