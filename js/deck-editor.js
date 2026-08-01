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
        <button class="btn btn-sm btn-outline" style="border-color:var(--gray-400);color:var(--gray-500)" onclick="DeckEditor.duplicate(${id})">Duplicar este tour</button>
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

      ${this.renderSlides(t)}
      ${this.renderPricing(t)}

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

  /* -- Duplicar --------------------------------------------------------------
   * Empezar un tour desde otro que ya funcionó, en vez de desde un folio en
   * blanco. Se copia la parte reutilizable (itinerario, capítulos, fotos,
   * textos, estructura de costes) y se deja fuera lo que pertenece SOLO al tour
   * original: pasajeros, facturas, costes reales, código de acceso.
   *
   * Las fechas se recalculan manteniendo la separación entre días, así que un
   * itinerario de 2027 sirve para 2028 sin repasar día por día. */
  DONT_COPY: ['id', 'createdAt', 'updatedAt', 'accessCode', 'passengers',
              'providerExpenses', 'documents', 'invoices', 'messages',
              'guideExpenses', 'guideNotes', 'roomPlan', '_deleted'],

  duplicate(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;

    const nombre = prompt('Nombre del tour nuevo:', (t.tourName || 'Tour') + ' (copia)');
    if (!nombre) return;
    const nuevaFecha = prompt(
      'Fecha de salida del tour nuevo (AAAA-MM-DD).\n\n' +
      'Las fechas del itinerario se recalculan manteniendo los días de separación.\n' +
      'Déjalo vacío para conservar las fechas originales.',
      t.startDate || '');

    const copia = JSON.parse(JSON.stringify(t));
    this.DONT_COPY.forEach(k => { delete copia[k]; });
    copia.tourName = nombre;
    copia.status = 'Preparing';

    if (nuevaFecha && /^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
      const vieja = Deck.parseDate(t.startDate);
      const nueva = Deck.parseDate(nuevaFecha);
      if (vieja && nueva) {
        const dias = Math.round((nueva - vieja) / 86400000);
        const corre = (iso) => {
          const d0 = Deck.parseDate(iso);
          if (!d0) return iso;
          const d1 = new Date(d0.getTime());
          d1.setDate(d1.getDate() + dias);
          return d1.getFullYear() + '-' +
                 String(d1.getMonth() + 1).padStart(2, '0') + '-' +
                 String(d1.getDate()).padStart(2, '0');
        };
        copia.startDate = corre(t.startDate);
        copia.endDate = corre(t.endDate);
        (copia.itinerary || []).forEach(d => { if (d.date) d.date = corre(d.date); });
        // Las fechas de pago del deck eran texto ya formateado de las fechas
        // viejas: se borran para que se recalculen solas con las nuevas.
        if (copia.deck) delete copia.deck.payments;
      }
    }

    const guardado = DB.saveTour(copia);
    alert('Creado "' + nombre + '".\n\nLos pasajeros, las facturas y los costes reales NO se han copiado: son del tour original.');
    Tours.viewTour(guardado.id);
  },

  /* -- Slides ---------------------------------------------------------------
   * Qué slides salen, en qué orden, y slides libres para lo que no cabe en las
   * fijas. "Capítulos y días" no es una slide: es el hueco donde se meten. */
  renderSlides(t) {
    const id = t.id;
    const E = this.esc.bind(this);
    const slides = Deck.slideList(t);

    const rows = slides.map((s, i) => {
      const label = s.type === 'custom'
        ? (s.title || 'Slide libre')
        : (Deck.SLIDE_LABELS[s.type] || s.type);
      const fixed = s.type === 'cover' || s.type === 'itinerary';
      const count = s.type === 'itinerary'
        ? ' <span style="color:var(--gray-400);font-weight:400">(' +
          (t.itinerary || []).length + ' días + ' + Deck.chapters(t, t.itinerary || [], 'es').length + ' capítulos)</span>'
        : '';
      return `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem;background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:0.3rem 0.5rem">
          <label style="display:flex;align-items:center;gap:0.35rem;cursor:${fixed ? 'not-allowed' : 'pointer'};flex:1;font-size:0.82rem">
            <input type="checkbox" ${s.on !== false ? 'checked' : ''} ${fixed ? 'disabled' : ''}
                   onchange="DeckEditor.toggleSlide(${id},${i},this.checked)">
            <span style="${s.on === false ? 'opacity:0.45;text-decoration:line-through' : 'font-weight:600'}">${E(label)}</span>${count}
          </label>
          <button title="Subir" ${i === 0 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:0 0.25rem" onclick="DeckEditor.moveSlide(${id},${i},-1)">&#9650;</button>
          <button title="Bajar" ${i === slides.length - 1 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:0 0.25rem" onclick="DeckEditor.moveSlide(${id},${i},1)">&#9660;</button>
          ${s.type === 'custom' ? `<button style="background:none;border:none;color:var(--red);cursor:pointer" onclick="DeckEditor.removeSlide(${id},${i})">&#10005;</button>` : '<span style="width:14px"></span>'}
        </div>
        ${s.type === 'custom' ? `
        <div style="margin:0 0 0.5rem 1.6rem;padding:0.5rem 0.6rem;background:var(--gray-50);border-radius:var(--radius)">
          <div style="display:flex;gap:0.4rem;margin-bottom:0.3rem">
            <input value="${E(s.eyebrow || '')}" placeholder="Sobretítulo" style="width:150px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'slides.${i}.eyebrow',this.value)">
            <input value="${E(s.title || '')}" placeholder="Titular" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'slides.${i}.title',this.value)">
            <input value="${E(s.title2 || '')}" placeholder="Segunda línea" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(${id},'slides.${i}.title2',this.value)">
            <div style="width:150px">${this.photoSelect(id, 'slides.' + i + '.photo', s.photo, '')}</div>
          </div>
          <textarea rows="2" placeholder="Texto. Un párrafo por línea." style="width:100%;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit" onchange="DeckEditor.save(${id},'slides.${i}.body',this.value)">${E(s.body || '')}</textarea>
        </div>` : ''}`;
    }).join('');

    return `
      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Slides
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— qué sale, en qué orden. Portada y días no se pueden quitar</span></h4>
      ${rows}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addSlide(${id})">+ Añadir slide libre</button>`;
  },

  /* La primera edición congela la lista por defecto, para que a partir de ahí
   * mande lo que hay guardado y no el orden del motor. */
  _slides(t) {
    if (!t.deck) t.deck = {};
    if (!t.deck.slides || !t.deck.slides.length) t.deck.slides = Deck.slideList(t);
    return t.deck.slides;
  },

  toggleSlide(tourId, i, on) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const s = this._slides(t);
    if (!s[i]) return;
    s[i].on = !!on;
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  moveSlide(tourId, i, delta) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const s = this._slides(t);
    const j = i + delta;
    if (j < 0 || j >= s.length) return;
    const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  addSlide(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const s = this._slides(t);
    // Antes del cierre, que es donde casi siempre se quiere.
    const at = s.map(x => x.type).lastIndexOf('closing');
    const nueva = { type: 'custom', on: true, eyebrow: '', title: '', title2: '', body: '', photo: '' };
    if (at >= 0) s.splice(at, 0, nueva); else s.push(nueva);
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  removeSlide(tourId, i) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    const s = this._slides(t);
    if (!s[i] || s[i].type !== 'custom') return;
    s.splice(i, 1);
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  /* -- Precios y pagos -------------------------------------------------------
   * Por defecto salen de los precios del tour y de un calendario 25/35/40. En
   * cuanto se toca algo aquí, manda lo de aquí. */
  renderPricing(t) {
    const id = t.id;
    const d = t.deck || {};
    const E = this.esc.bind(this);
    const m = Deck.model(t, {});
    const tiers = (d.tiers && d.tiers.length) ? d.tiers : Deck.tiers(m);
    const pagos = d.payments || Deck.defaultPayments(m);

    const tierRows = tiers.map((x, i) => `
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
        <input value="${E(x.label || '')}" placeholder="Concepto" style="width:150px;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier(${id},${i},'label',this.value)">
        <input value="${E(x.desc || '')}" placeholder="Descripción" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier(${id},${i},'desc',this.value)">
        <input type="number" value="${x.price != null ? x.price : ''}" placeholder="0" style="width:95px;padding:0.28rem 0.45rem;font-size:0.8rem;text-align:right;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier(${id},${i},'price',this.value)">
        <button style="background:none;border:none;color:var(--red);cursor:pointer" onclick="DeckEditor.removeTier(${id},${i})">&#10005;</button>
      </div>`).join('');

    const pagoRows = pagos.slice(0, 3).map((p, i) => `
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
        <span style="width:22px;font-size:0.78rem;color:var(--gray-400)">${i + 1}</span>
        <input value="${E(p.desc || '')}" placeholder="Descripción" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment(${id},${i},'desc',this.value)">
        <input value="${E(p.due || '')}" placeholder="Vence" style="width:170px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment(${id},${i},'due',this.value)">
        <input type="number" value="${p.amount != null ? p.amount : ''}" placeholder="0" style="width:95px;padding:0.28rem 0.45rem;font-size:0.8rem;text-align:right;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment(${id},${i},'amount',this.value)">
      </div>`).join('');

    return `
      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Precios
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— por defecto los del tour; edítalos para que manden estos</span></h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.5rem">
        ${tierRows || '<p style="color:var(--gray-400);font-size:0.8rem;margin:0">Sin precios. El deck saldrá "a consultar".</p>'}
        <button class="btn btn-sm btn-outline" style="font-size:0.72rem;padding:0.15rem 0.45rem;margin-top:0.3rem" onclick="DeckEditor.addTier(${id})">+ Añadir línea</button>
        ${this.field(id, 'pricingNote', d.pricingNote, 'Nota bajo la tabla de precios', 'Precio por persona, basado en el grupo confirmado')}
      </div>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Calendario de pagos</h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.8rem">
        ${pagoRows}
        ${this.field(id, 'paymentNote', d.paymentNote, 'Nota bajo el calendario', '')}
        ${this.field(id, 'reservationIntro', d.reservationIntro, 'Texto de la página de reservas', '', 'textarea')}
      </div>`;
  },

  saveTier(tourId, i, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    if (!t.deck.tiers[i]) t.deck.tiers[i] = { label: '', desc: '', price: null };
    t.deck.tiers[i][field] = field === 'price' ? (value === '' ? null : +value) : value;
    DB.saveTour(t);
  },

  addTier(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    t.deck.tiers.push({ label: '', desc: '', price: null });
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  removeTier(tourId, i) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t || !t.deck) return;
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    t.deck.tiers.splice(i, 1);
    DB.saveTour(t);
    Tours.viewTour(tourId);
  },

  savePayment(tourId, i, field, value) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.payments || !t.deck.payments.length) t.deck.payments = Deck.defaultPayments(Deck.model(t, {}));
    if (!t.deck.payments[i]) t.deck.payments[i] = { desc: '', due: '', amount: null };
    t.deck.payments[i][field] = field === 'amount' ? (value === '' ? null : +value) : value;
    DB.saveTour(t);
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
