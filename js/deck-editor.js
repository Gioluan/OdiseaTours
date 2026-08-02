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
  photoSelect(ref, path, value, label, kind) {
    kind = kind || 'photo';
    const url = this.resolve(value, kind);
    const bank = (this._photos && (kind === 'logo' ? this._photos.logos : this._photos.photos)) || {};
    const meta = bank[value] || {};
    const caption = value
      ? (meta.label || (String(value).indexOf('http') === 0 ? 'Uploaded image' : value))
      : 'Choose…';

    return (label ? '<label style="font-size:0.75rem;color:var(--gray-400);display:block;margin-bottom:0.15rem">' + this.esc(label) + '</label>' : '') +
      '<button type="button" onclick="DeckPicker.open(&quot;' + ref + '&quot;,&quot;' + path + '&quot;,&quot;' + kind + '&quot;)" ' +
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

  field(ref, path, value, label, placeholder, type) {
    return '<div class="form-group" style="margin-bottom:0.6rem">' +
      '<label style="font-size:0.75rem;color:var(--gray-400)">' + this.esc(label) + '</label>' +
      (type === 'textarea'
        ? '<textarea rows="2" placeholder="' + this.esc(placeholder || '') + '" style="width:100%;padding:0.35rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit" onchange="DeckEditor.save(&quot;' + ref + '&quot;,&quot;' + path + '&quot;,this.value)">' + this.esc(value) + '</textarea>'
        : '<input type="' + (type || 'text') + '" value="' + this.esc(value) + '" placeholder="' + this.esc(placeholder || '') + '" style="width:100%;padding:0.35rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save(&quot;' + ref + '&quot;,&quot;' + path + '&quot;,this.value)">') +
      '</div>';
  },

  /* kind: 'tour' (por defecto) o 'quote'. El deck es material de venta, así que
   * esta misma sección se pinta en la ficha del presupuesto, antes de que el
   * tour exista. */
  render(t, kind) {
    const d = t.deck || {};
    const ref = (kind === 'quote' ? 'quote:' : 'tour:') + t.id;
    const id = ref;
    const days = Deck.normalizeDays(t);
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
          <input value="${E(c.city)}" placeholder="City" style="flex:1;padding:0.3rem 0.45rem;font-weight:600;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter('${ref}',${i},'city',this.value)">
          <input type="number" min="1" value="${(c.from || 0) + 1}" title="First day" style="width:52px;padding:0.3rem;font-size:0.8rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter('${ref}',${i},'from',this.value-1)">
          <span style="color:var(--gray-400);font-size:0.8rem">→</span>
          <input type="number" min="1" value="${(c.to != null ? c.to : 0) + 1}" title="Last day" style="width:52px;padding:0.3rem;font-size:0.8rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter('${ref}',${i},'to',this.value-1)">
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem" onclick="DeckEditor.removeChapter('${ref}',${i})">&#10005;</button>
        </div>
        <input value="${E(c.lede || '')}" placeholder="One sentence about the city" style="width:100%;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);margin-bottom:0.35rem" onchange="DeckEditor.saveChapter('${ref}',${i},'lede',this.value)">
        <div style="display:flex;gap:0.4rem">
          <input value="${E(c.highlights || '')}" placeholder="Highlights · separated by ·" style="flex:1;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveChapter('${ref}',${i},'highlights',this.value)">
          <div style="flex:1">${this.photoSelect(id, 'chapters.' + i + '.photo', c.photo, '')}</div>
        </div>
      </div>`).join('');

    // El día completo: cabecera, agenda y lo editorial. Un presupuesto guarda
    // los días como {day, title, description}; aquí se le puede poner ya la
    // agenda con horas, que es lo que el deck necesita, sin esperar a que el
    // tour exista.
    const raw = t.itinerary || [];
    const dayRows = days.map((day, i) => {
      const dd = (d.days && d.days[i]) || {};
      const items = (raw[i] && raw[i].items) || day.items || [];
      const itemRows = items.map((it, j) => `
          <div style="display:flex;gap:0.35rem;align-items:center;margin-bottom:0.2rem">
            <input value="${E(it.time || '')}" placeholder="0900" style="width:52px;padding:0.22rem;font-size:0.78rem;text-align:center;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveItem('${ref}',${i},${j},'time',this.value)">
            <input value="${E(it.description || '')}" placeholder="What happens" style="flex:1;padding:0.22rem 0.4rem;font-size:0.78rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);${it.highlight ? 'font-weight:600;background:rgba(255,180,0,0.08)' : ''}" onchange="DeckEditor.saveItem('${ref}',${i},${j},'description',this.value)">
            <label style="font-size:0.72rem;white-space:nowrap;cursor:pointer;color:${it.highlight ? 'var(--amber)' : 'var(--gray-400)'}"><input type="checkbox" ${it.highlight ? 'checked' : ''} onchange="DeckEditor.saveItem('${ref}',${i},${j},'highlight',this.checked)"> Bold</label>
            <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.8rem" onclick="DeckEditor.removeItem('${ref}',${i},${j})">&#10005;</button>
          </div>`).join('');

      return `
      <div style="background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:0.5rem 0.6rem;margin-bottom:0.5rem">
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.35rem">
          <span style="background:var(--amber);color:#111;font-weight:700;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;flex-shrink:0">${day.day || i + 1}</span>
          <input value="${E(day.title || '')}" placeholder="Day headline · use | to split two lines" style="flex:2;padding:0.28rem 0.45rem;font-weight:600;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveItinDay('${ref}',${i},'title',this.value)">
          <input type="date" value="${E(day.date || '')}" style="padding:0.24rem;font-size:0.78rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveItinDay('${ref}',${i},'date',this.value)">
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem" onclick="DeckEditor.removeItinDay('${ref}',${i})">&#10005;</button>
        </div>
        <div style="padding-left:1.5rem">
          ${itemRows}
          <button class="btn btn-sm btn-outline" style="font-size:0.72rem;padding:0.15rem 0.4rem;margin:0.15rem 0 0.4rem" onclick="DeckEditor.addItem('${ref}',${i})">+ Add time slot</button>
          <div style="display:flex;gap:0.4rem;align-items:center">
            <input value="${E(dd.summary || '')}" placeholder="Day summary (one sentence)" style="flex:2;padding:0.24rem 0.4rem;font-size:0.78rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveDay('${ref}',${i},'summary',this.value)">
            <input value="${E(dd.city || day.city || '')}" placeholder="City" style="flex:1;padding:0.24rem 0.4rem;font-size:0.78rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveDay('${ref}',${i},'city',this.value)">
            <div style="flex:1">${this.photoSelect(id, 'days.' + i + '.photo', dd.photo, '')}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    return `
      <h3 style="margin-top:1.5rem">Deck <span style="font-weight:400;font-size:0.82rem;color:var(--gray-400)">— client-facing itinerary presentation</span></h3>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.8rem">
        <button class="btn btn-sm" style="background:var(--amber);color:#111;font-weight:700" onclick="Deck.generate('${ref}')">Generate Deck</button>
        <button class="btn btn-sm btn-outline" onclick="Deck.generate('${ref}',{noPricing:true})">Deck without pricing</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--green);color:var(--green)" onclick="DeckCosting.export('${ref}')">Cost Sheet (Excel)</button>
        <button class="btn btn-sm btn-outline" onclick="DeckEditor.lint('${ref}')">Check Rules</button>
        <button class="btn btn-sm btn-outline" style="border-color:var(--gray-400);color:var(--gray-500)" onclick="DeckEditor.duplicate('${ref}')">Duplicate This Tour</button>
      </div>

      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:0.8rem">
        <div class="form-row form-row-4">
          <div class="form-group" style="margin-bottom:0.6rem">
            <label style="font-size:0.75rem;color:var(--gray-400)">Language</label>
            <select style="width:100%;padding:0.35rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','lang',this.value)">
              <option value="en"${d.lang !== 'es' ? ' selected' : ''}>English</option>
              <option value="es"${d.lang === 'es' ? ' selected' : ''}>Spanish</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0.6rem">
            <label style="font-size:0.75rem;color:var(--gray-400)">Audience</label>
            <select style="width:100%;padding:0.35rem;font-size:0.82rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','audience',this.value)">
              <option value=""${!d.audience ? ' selected' : ''}>— detect —</option>
              <option value="us"${d.audience === 'us' ? ' selected' : ''}>USA (soccer)</option>
              <option value="uk"${d.audience === 'uk' ? ' selected' : ''}>United Kingdom (football)</option>
              <option value="au"${d.audience === 'au' ? ' selected' : ''}>Australia (football)</option>
              <option value="ie"${d.audience === 'ie' ? ' selected' : ''}>Ireland (football)</option>
            </select>
          </div>
          ${this.field(id, 'clientAccent', d.clientAccent || '#FFB400', 'Club colour', '#FFB400', 'color')}
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'clientLogo', d.clientLogo, 'Client logo', 'logo')}</div>
        </div>

        <div class="form-row form-row-2">
          ${this.field(id, 'clientLocation', d.clientLocation, 'Client location', 'Michigan · Portage SC')}
          ${this.field(id, 'tourPeriod', d.tourPeriod, 'Period (cover)', 'July 2027')}
        </div>

        <div class="form-row form-row-3">
          ${this.field(id, 'tagline', d.tagline, 'Cover strapline', 'Youth soccer tour')}
          ${this.field(id, 'titleLine1', d.titleLine1, 'Title line 1', 'Spanish')}
          ${this.field(id, 'titleLine2Plain', d.titleLine2Plain, 'Line 2 (black)', 'Soccer &')}
          ${this.field(id, 'titleLine2Gold', d.titleLine2Gold, 'Line 2 (gold)', 'Culture')}
        </div>

        <div class="form-row form-row-4">
          ${this.field(id, 'arriveInto', d.arriveInto, 'Arrive into', 'Barcelona (BCN)')}
          ${this.field(id, 'departFrom', d.departFrom, 'Depart from', 'Barcelona (BCN)')}
          ${this.field(id, 'minAge', d.minAge, 'Ages', 'U12 – U16')}
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'coverPhoto', d.coverPhoto, 'Cover photo')}</div>
        </div>

        ${this.field(id, 'coverSub', d.coverSub, 'Cover subtitle', 'One sentence summing up the tour')}
        ${this.field(id, 'welcomePara1', d.welcomePara1, 'Welcome · paragraph 1', '', 'textarea')}
        ${this.field(id, 'welcomePara2', d.welcomePara2, 'Welcome · paragraph 2', '', 'textarea')}
        ${this.field(id, 'overviewPara', d.overviewPara, 'Tour overview', '', 'textarea')}
      </div>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Chapters <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— one opening slide per city</span></h4>
      ${chapterRows || '<p style="color:var(--gray-400);font-size:0.82rem">Add days to the itinerary and the split by city will appear here.</p>'}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addChapter('${ref}')">+ Add chapter</button>

      ${this.renderSlides(t, ref)}
      ${this.renderPricing(t, ref)}

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Cover crests
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— where the group trains. Never "official partner" language</span></h4>
      ${(d.crests || []).map((c, i) => `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.35rem">
          <div style="width:150px;flex-shrink:0">${this.photoSelect(id, 'crests.' + i + '.logo', c.logo, '', 'logo')}</div>
          <input value="${E(c.top || '')}" placeholder="Eyebrow (La Liga)" style="width:130px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','crests.${i}.top',this.value)">
          <input value="${E(c.name || '')}" placeholder="Name (FC Barcelona)" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','crests.${i}.name',this.value)">
          <input value="${E(c.sub || '')}" placeholder="Caption (Joan Gamper · BCN)" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','crests.${i}.sub',this.value)">
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem" onclick="DeckEditor.removeCrest('${ref}',${i})">&#10005;</button>
        </div>`).join('')}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addCrest('${ref}')">+ Add crest</button>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Days
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— the day-by-day schedule the deck is built from</span></h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.4rem">
        ${dayRows || '<p style="color:var(--gray-400);font-size:0.82rem;margin:0">No days yet. Add the first one to start building the deck.</p>'}
      </div>
      <div style="display:flex;gap:0.5rem;margin-bottom:0.8rem">
        <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem" onclick="DeckEditor.addItinDay('${ref}')">+ Add day</button>
        ${t.startDate && !days.length ? `<button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;border-color:var(--amber);color:var(--amber)" onclick="DeckEditor.autoDays('${ref}')">Auto-generate from tour dates</button>` : ''}
      </div>

      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:1rem">
        <h4 style="font-size:0.88rem;margin-bottom:0.4rem">Closing</h4>
        <div class="form-row form-row-3">
          <div class="form-group" style="margin-bottom:0.6rem">${this.photoSelect(id, 'closingPhoto', d.closingPhoto, 'Closing photo')}</div>
          ${this.field(id, 'closingPhotoEyebrow', d.closingPhotoEyebrow, 'Photo eyebrow', 'Camp Nou · Barcelona')}
          ${this.field(id, 'closingPhotoTitle', d.closingPhotoTitle, 'Photo title', 'Where the next memory begins.')}
        </div>
        ${this.field(id, 'closingLede', d.closingLede, 'Closing line', '', 'textarea')}
        <div class="form-row form-row-3">
          ${this.field(id, 'leadName', d.leadName || 'Juan Sánchez', 'Tour lead')}
          ${this.field(id, 'leadEmail', d.leadEmail || 'juan@odisea-tours.com', 'Email')}
          ${this.field(id, 'leadPhone', d.leadPhone || '+34 670 059 797', 'Phone')}
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

  duplicate(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;

    const nombre = prompt('Name for the new tour:', (t.tourName || 'Tour') + ' (copy)');
    if (!nombre) return;
    const nuevaFecha = prompt(
      'Departure date for the new tour (YYYY-MM-DD).\n\n' +
      'Itinerary dates are recalculated keeping the gaps between days.\n' +
      'Leave empty to keep the original dates.',
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

    const r = this.rec(ref);
    const guardado = r.kind === 'quote' ? DB.saveQuote(copia) : DB.saveTour(copia);
    alert('Created "' + nombre + '".\n\nPassengers, invoices and actual costs were NOT copied: those belong to the original tour.');
    this.refresh(r.kind + ':' + guardado.id);
  },

  /* -- Slides ---------------------------------------------------------------
   * Qué slides salen, en qué orden, y slides libres para lo que no cabe en las
   * fijas. "Capítulos y días" no es una slide: es el hueco donde se meten. */
  renderSlides(t, ref) {
    const id = ref;
    const E = this.esc.bind(this);
    const slides = Deck.slideList(t);

    const rows = slides.map((s, i) => {
      const label = s.type === 'custom'
        ? (s.title || 'Custom slide')
        : (Deck.SLIDE_LABELS[s.type] || s.type);
      const fixed = s.type === 'cover' || s.type === 'itinerary';
      const count = s.type === 'itinerary'
        ? ' <span style="color:var(--gray-400);font-weight:400">(' +
          (t.itinerary || []).length + ' days + ' + Deck.chapters(t, t.itinerary || [], 'es').length + ' chapters)</span>'
        : '';
      return `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem;background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:0.3rem 0.5rem">
          <label style="display:flex;align-items:center;gap:0.35rem;cursor:${fixed ? 'not-allowed' : 'pointer'};flex:1;font-size:0.82rem">
            <input type="checkbox" ${s.on !== false ? 'checked' : ''} ${fixed ? 'disabled' : ''}
                   onchange="DeckEditor.toggleSlide('${ref}',${i},this.checked)">
            <span style="${s.on === false ? 'opacity:0.45;text-decoration:line-through' : 'font-weight:600'}">${E(label)}</span>${count}
          </label>
          <button title="Move up" ${i === 0 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:0 0.25rem" onclick="DeckEditor.moveSlide('${ref}',${i},-1)">&#9650;</button>
          <button title="Move down" ${i === slides.length - 1 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:0 0.25rem" onclick="DeckEditor.moveSlide('${ref}',${i},1)">&#9660;</button>
          ${s.type === 'custom' ? `<button style="background:none;border:none;color:var(--red);cursor:pointer" onclick="DeckEditor.removeSlide('${ref}',${i})">&#10005;</button>` : '<span style="width:14px"></span>'}
        </div>
        ${s.type === 'custom' ? `
        <div style="margin:0 0 0.5rem 1.6rem;padding:0.5rem 0.6rem;background:var(--gray-50);border-radius:var(--radius)">
          <div style="display:flex;gap:0.4rem;margin-bottom:0.3rem">
            <input value="${E(s.eyebrow || '')}" placeholder="Eyebrow" style="width:150px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','slides.${i}.eyebrow',this.value)">
            <input value="${E(s.title || '')}" placeholder="Headline" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','slides.${i}.title',this.value)">
            <input value="${E(s.title2 || '')}" placeholder="Second line" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.save('${ref}','slides.${i}.title2',this.value)">
            <div style="width:150px">${this.photoSelect(id, 'slides.' + i + '.photo', s.photo, '')}</div>
          </div>
          <textarea rows="2" placeholder="Text. One paragraph per line." style="width:100%;padding:0.3rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit" onchange="DeckEditor.save('${ref}','slides.${i}.body',this.value)">${E(s.body || '')}</textarea>
        </div>` : ''}`;
    }).join('');

    return `
      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Slides
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— what appears and in what order. Cover and days cannot be removed</span></h4>
      ${rows}
      <button class="btn btn-sm btn-outline" style="font-size:0.75rem;padding:0.2rem 0.5rem;margin-bottom:0.8rem" onclick="DeckEditor.addSlide('${ref}')">+ Add custom slide</button>`;
  },

  /* La primera edición congela la lista por defecto, para que a partir de ahí
   * mande lo que hay guardado y no el orden del motor. */
  _slides(t) {
    if (!t.deck) t.deck = {};
    if (!t.deck.slides || !t.deck.slides.length) t.deck.slides = Deck.slideList(t);
    return t.deck.slides;
  },

  toggleSlide(ref, i, on) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const s = this._slides(t);
    if (!s[i]) return;
    s[i].on = !!on;
    this.commit(ref, t);
    this.refresh(ref);
  },

  moveSlide(ref, i, delta) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const s = this._slides(t);
    const j = i + delta;
    if (j < 0 || j >= s.length) return;
    const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    this.commit(ref, t);
    this.refresh(ref);
  },

  addSlide(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const s = this._slides(t);
    // Antes del cierre, que es donde casi siempre se quiere.
    const at = s.map(x => x.type).lastIndexOf('closing');
    const nueva = { type: 'custom', on: true, eyebrow: '', title: '', title2: '', body: '', photo: '' };
    if (at >= 0) s.splice(at, 0, nueva); else s.push(nueva);
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeSlide(ref, i) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const s = this._slides(t);
    if (!s[i] || s[i].type !== 'custom') return;
    s.splice(i, 1);
    this.commit(ref, t);
    this.refresh(ref);
  },

  /* -- Precios y pagos -------------------------------------------------------
   * Por defecto salen de los precios del tour y de un calendario 25/35/40. En
   * cuanto se toca algo aquí, manda lo de aquí. */
  renderPricing(t, ref) {
    const id = ref;
    const d = t.deck || {};
    const E = this.esc.bind(this);
    const m = Deck.model(t, {});
    const tiers = (d.tiers && d.tiers.length) ? d.tiers : Deck.tiers(m);
    const pagos = d.payments || Deck.defaultPayments(m);

    const tierRows = tiers.map((x, i) => `
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
        <input value="${E(x.label || '')}" placeholder="Label" style="width:150px;padding:0.28rem 0.45rem;font-size:0.8rem;font-weight:600;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier('${ref}',${i},'label',this.value)">
        <input value="${E(x.desc || '')}" placeholder="Description" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier('${ref}',${i},'desc',this.value)">
        <input type="number" value="${x.price != null ? x.price : ''}" placeholder="0" style="width:95px;padding:0.28rem 0.45rem;font-size:0.8rem;text-align:right;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.saveTier('${ref}',${i},'price',this.value)">
        <button style="background:none;border:none;color:var(--red);cursor:pointer" onclick="DeckEditor.removeTier('${ref}',${i})">&#10005;</button>
      </div>`).join('');

    const pagoRows = pagos.slice(0, 3).map((p, i) => `
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem">
        <span style="width:22px;font-size:0.78rem;color:var(--gray-400)">${i + 1}</span>
        <input value="${E(p.desc || '')}" placeholder="Description" style="flex:1;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment('${ref}',${i},'desc',this.value)">
        <input value="${E(p.due || '')}" placeholder="Due" style="width:170px;padding:0.28rem 0.45rem;font-size:0.8rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment('${ref}',${i},'due',this.value)">
        <input type="number" value="${p.amount != null ? p.amount : ''}" placeholder="0" style="width:95px;padding:0.28rem 0.45rem;font-size:0.8rem;text-align:right;border:1.5px solid var(--gray-200);border-radius:var(--radius)" onchange="DeckEditor.savePayment('${ref}',${i},'amount',this.value)">
      </div>`).join('');

    return `
      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Pricing
        <span style="font-weight:400;font-size:0.78rem;color:var(--gray-400)">— defaults to the tour prices; edit these to override</span></h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.5rem">
        ${tierRows || '<p style="color:var(--gray-400);font-size:0.8rem;margin:0">No pricing set. The deck will show "On request".</p>'}
        <button class="btn btn-sm btn-outline" style="font-size:0.72rem;padding:0.15rem 0.45rem;margin-top:0.3rem" onclick="DeckEditor.addTier('${ref}')">+ Add row</button>
        ${this.field(id, 'pricingNote', d.pricingNote, 'Note under the pricing table', 'Per person, based on the confirmed group')}
      </div>

      <h4 style="font-size:0.88rem;margin:0.8rem 0 0.4rem">Payment schedule</h4>
      <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:0.6rem 0.8rem;margin-bottom:0.8rem">
        ${pagoRows}
        ${this.field(id, 'paymentNote', d.paymentNote, 'Note under the schedule', '')}
        ${this.field(id, 'reservationIntro', d.reservationIntro, 'Reservations page text', '', 'textarea')}
      </div>`;
  },

  saveTier(ref, i, field, value) {
    const t = this.rec(ref).rec;
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    if (!t.deck.tiers[i]) t.deck.tiers[i] = { label: '', desc: '', price: null };
    t.deck.tiers[i][field] = field === 'price' ? (value === '' ? null : +value) : value;
    this.commit(ref, t);
  },

  addTier(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    t.deck.tiers.push({ label: '', desc: '', price: null });
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeTier(ref, i) {
    const t = this.rec(ref).rec;
    if (!t || !t.deck) return;
    if (!t.deck.tiers || !t.deck.tiers.length) t.deck.tiers = Deck.tiers(Deck.model(t, {}));
    t.deck.tiers.splice(i, 1);
    this.commit(ref, t);
    this.refresh(ref);
  },

  savePayment(ref, i, field, value) {
    const t = this.rec(ref).rec;
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.payments || !t.deck.payments.length) t.deck.payments = Deck.defaultPayments(Deck.model(t, {}));
    if (!t.deck.payments[i]) t.deck.payments[i] = { desc: '', due: '', amount: null };
    t.deck.payments[i][field] = field === 'amount' ? (value === '' ? null : +value) : value;
    this.commit(ref, t);
  },

  /* -- Acceso al registro ----------------------------------------------------
   * Todo pasa por aqui, para que el editor funcione igual sobre un presupuesto
   * (antes de vender) que sobre un tour confirmado. La referencia lleva el tipo
   * dentro ('quote:12'), asi que no hay estado que se pueda quedar viejo. */
  rec(ref) { return Deck.resolve(ref); },

  commit(ref, rec) { Deck.save(ref, rec); },

  /* Vuelve a pintar la ficha que corresponda. */
  refresh(ref) {
    const r = Deck.resolve(ref);
    if (r.kind === 'quote') { if (typeof CRM !== 'undefined') CRM.viewQuote(r.id); }
    else if (typeof Tours !== 'undefined') Tours.viewTour(r.id);
  },

  /* -- Guardado --------------------------------------------------------------
   * Un solo punto de escritura. path admite 'campo' y 'coleccion.N.campo'. */
  save(ref, path, value) {
    const r = this.rec(ref);
    const t = r.rec;
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
    this.commit(ref, t);
  },

  saveChapter(ref, i, field, value) {
    const t = this.rec(ref).rec;
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
    this.commit(ref, t);
    if (field === 'from' || field === 'to') this.refresh(ref);
  },

  addChapter(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.chapters) t.deck.chapters = [];
    const last = t.deck.chapters[t.deck.chapters.length - 1];
    const from = last ? Math.min((last.to || 0) + 1, Math.max(0, (t.itinerary || []).length - 1)) : 0;
    t.deck.chapters.push({ city: '', from: from, to: from, lede: '', highlights: '', photo: '' });
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeChapter(ref, i) {
    const t = this.rec(ref).rec;
    if (!t || !t.deck || !t.deck.chapters) return;
    t.deck.chapters.splice(i, 1);
    this.commit(ref, t);
    this.refresh(ref);
  },

  saveDay(ref, i, field, value) {
    this.save(ref, 'days.' + i + '.' + field, value);
  },

  /* -- Itinerario ------------------------------------------------------------
   * Escribe en rec.itinerary, el mismo campo que usan el editor de tours y el
   * asistente de presupuestos. Un presupuesto guarda los días con title y
   * description; aquí se les añade items[] con horas, que es lo que el deck
   * necesita. Es aditivo: no rompe lo que ya escribía el asistente. */
  _itin(t) {
    if (!t.itinerary) t.itinerary = [];
    return t.itinerary;
  },

  saveItinDay(ref, i, field, value) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const it = this._itin(t);
    if (!it[i]) return;
    it[i][field] = value;
    this.commit(ref, t);
  },

  addItinDay(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const it = this._itin(t);
    // La fecha se encadena con la del día anterior. Los días de un presupuesto
    // suelen venir SIN fecha (el asistente solo guarda title y description),
    // así que en ese caso se cuenta desde la salida.
    let date = '';
    const prev = it[it.length - 1];
    if (prev && prev.date) {
      const base = Deck.parseDate(prev.date);
      base.setDate(base.getDate() + 1);
      date = this._iso(base);
    } else if (t.startDate) {
      const base = Deck.parseDate(t.startDate);
      base.setDate(base.getDate() + it.length);
      date = this._iso(base);
    }

    it.push({ day: it.length + 1, date: date, title: '', items: [{ time: '', description: '', highlight: false }] });
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeItinDay(ref, i) {
    const t = this.rec(ref).rec;
    if (!t || !t.itinerary) return;
    if (!confirm('Remove day ' + (i + 1) + ' from the itinerary?')) return;
    t.itinerary.splice(i, 1);
    t.itinerary.forEach((d, n) => { d.day = n + 1; });
    this.commit(ref, t);
    this.refresh(ref);
  },

  /* Un día por noche + 1, con las fechas ya puestas. Ahorra el trabajo tonto. */
  autoDays(ref) {
    const t = this.rec(ref).rec;
    if (!t || !t.startDate) { alert('Set a start date first.'); return; }
    if ((t.itinerary || []).length && !confirm('This replaces the current itinerary. Continue?')) return;
    const n = (+t.nights || 0) + 1;
    const start = Deck.parseDate(t.startDate);
    t.itinerary = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getTime());
      d.setDate(d.getDate() + i);
      t.itinerary.push({ day: i + 1, date: this._iso(d), title: '',
                         items: [{ time: '', description: '', highlight: false }] });
    }
    this.commit(ref, t);
    this.refresh(ref);
  },

  _iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  },

  saveItem(ref, i, j, field, value) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const day = this._itin(t)[i];
    if (!day) return;
    if (!day.items) day.items = [];
    if (!day.items[j]) day.items[j] = { time: '', description: '', highlight: false };
    day.items[j][field] = value;
    this.commit(ref, t);
  },

  addItem(ref, i) {
    const t = this.rec(ref).rec;
    if (!t) return;
    const day = this._itin(t)[i];
    if (!day) return;
    if (!day.items) day.items = [];
    day.items.push({ time: '', description: '', highlight: false });
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeItem(ref, i, j) {
    const t = this.rec(ref).rec;
    if (!t || !t.itinerary || !t.itinerary[i] || !t.itinerary[i].items) return;
    t.itinerary[i].items.splice(j, 1);
    this.commit(ref, t);
    this.refresh(ref);
  },

  addCrest(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    if (!t.deck) t.deck = {};
    if (!t.deck.crests) t.deck.crests = [];
    t.deck.crests.push({ logo: '', top: '', name: '', sub: '' });
    this.commit(ref, t);
    this.refresh(ref);
  },

  removeCrest(ref, i) {
    const t = this.rec(ref).rec;
    if (!t || !t.deck || !t.deck.crests) return;
    t.deck.crests.splice(i, 1);
    this.commit(ref, t);
    this.refresh(ref);
  },

  /* Pasa el linter y enseña el resultado sin generar nada. */
  lint(ref) {
    const t = this.rec(ref).rec;
    if (!t) return;
    this.loadPhotos().then(() => {
      const problems = DeckLint.check(t, {});
      if (!problems.length) {
        alert('All clear. The deck follows the Odisea rules.');
        return;
      }
      const lines = problems.map(p => (p.level === 'error' ? '✖  ' : '⚠  ') + p.msg);
      alert(problems.filter(p => p.level === 'error').length
        ? 'Fix this before sending it out:\n\n' + lines.join('\n\n')
        : 'Warnings:\n\n' + lines.join('\n\n'));
    });
  }
};

// El banco de fotos se precarga en cuanto arranca la app, para que los
// desplegables ya estén llenos la primera vez que se abre un tour.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => { DeckEditor.loadPhotos(); });
}
