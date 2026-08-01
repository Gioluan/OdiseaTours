/* === ODISEA DECK · selector visual de imágenes ================================
 *
 * Un desplegable con nombres de fichero no sirve para elegir una foto: nadie
 * recuerda qué se ve en "aerial-pitches.jpg". Esto abre una rejilla con las
 * miniaturas de verdad.
 *
 * Tres orígenes en la misma rejilla:
 *   1. El banco del repo    assets/photos/ + assets/logos/, descrito en photos.json
 *   2. Lo subido            Firebase Storage, indexado en la colección deckAssets
 *   3. Una URL pegada       para una foto que el club manda por correo
 *
 * Lo que se sube se queda en el banco para los siguientes tours. Es la
 * diferencia entre una carpeta y una biblioteca: cada tour deja el sitio mejor
 * de como lo encontró.
 *
 * Las fotos con aviso (el caso de fcb-stadium.jpg, que NO es el Camp Nou) salen
 * marcadas en rojo y piden confirmación al elegirlas. La advertencia deja de
 * depender de que alguien se acuerde.
 *
 * DeckPicker.open(tourId, path, kind)   kind: 'photo' | 'logo'
 */
const DeckPicker = {

  _uploaded: null,
  _ctx: null,
  _filter: '',

  MODAL_ID: 'deck-picker-modal',

  /* -- Datos ----------------------------------------------------------------- */

  /* Lo subido vive en Firestore para que el banco crezca entre tours. Si no hay
   * conexión se sigue pudiendo elegir del banco del repo. */
  loadUploaded() {
    if (this._uploaded) return Promise.resolve(this._uploaded);
    if (!DB._firebaseReady || !DB.firestore) { this._uploaded = []; return Promise.resolve([]); }
    return DB.firestore.collection('deckAssets').orderBy('uploadedAt', 'desc').get()
      .then(snap => {
        const out = [];
        snap.forEach(doc => out.push(Object.assign({ id: doc.id }, doc.data())));
        this._uploaded = out;
        return out;
      })
      .catch(e => { console.warn('deckAssets:', e.message); this._uploaded = []; return []; });
  },

  /* Todo lo elegible para este tipo, ya normalizado. */
  items(kind) {
    const bank = (DeckEditor._photos) || { photos: {}, logos: {} };
    const src = kind === 'logo' ? (bank.logos || {}) : (bank.photos || {});
    const dir = kind === 'logo' ? 'assets/logos/' : 'assets/photos/';

    const fromRepo = Object.keys(src).sort().map(f => ({
      value: f,
      url: dir + f,
      label: (src[f] && src[f].label) || f,
      caution: (src[f] && src[f].caution) || '',
      verified: !!(src[f] && src[f].verified),
      source: 'repo'
    }));

    const fromUpload = (this._uploaded || [])
      .filter(a => a.kind === kind)
      .map(a => ({
        value: a.url, url: a.url, label: a.label || a.name || 'Subida',
        caution: '', verified: true, source: 'upload', id: a.id
      }));

    return fromRepo.concat(fromUpload);
  },

  /* -- Modal ------------------------------------------------------------------ */

  ensureModal() {
    let el = document.getElementById(this.MODAL_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = this.MODAL_ID;
    el.className = 'modal-overlay';
    el.style.display = 'none';
    el.innerHTML = '<div class="modal" id="' + this.MODAL_ID + '-content" style="max-width:960px"></div>';
    el.addEventListener('click', (e) => { if (e.target === el) DeckPicker.close(); });
    document.body.appendChild(el);
    return el;
  },

  open(tourId, path, kind) {
    kind = kind || 'photo';
    this._ctx = { tourId: tourId, path: path, kind: kind };
    this._filter = '';
    this.ensureModal().style.display = 'flex';
    document.getElementById(this.MODAL_ID + '-content').innerHTML =
      '<p style="padding:1rem;color:var(--gray-400)">Cargando el banco de imágenes…</p>';

    Promise.all([DeckEditor.loadPhotos(), this.loadUploaded()]).then(() => this.render());
  },

  close() {
    const el = document.getElementById(this.MODAL_ID);
    if (el) el.style.display = 'none';
    this._ctx = null;
  },

  esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  render() {
    const c = this._ctx;
    if (!c) return;
    const E = this.esc.bind(this);
    const all = this.items(c.kind);
    const f = this._filter.toLowerCase();
    const list = f ? all.filter(x => (x.label + ' ' + x.value).toLowerCase().indexOf(f) !== -1) : all;

    const t = DB.getTours().find(x => x.id === c.tourId);
    const current = this.currentValue(t, c.path);

    const tiles = list.map((x, i) => {
      const sel = current && current === x.value;
      const isLogo = c.kind === 'logo';
      return '<div onclick="DeckPicker.pick(' + i + ')" title="' + E(x.label) + '" ' +
        'style="cursor:pointer;border:3px solid ' + (sel ? 'var(--amber)' : (x.caution ? 'var(--red)' : 'transparent')) +
        ';border-radius:var(--radius);overflow:hidden;background:' + (isLogo ? '#f4f4f4' : '#111') + ';position:relative">' +
        '<div style="width:100%;height:110px;background-image:url(\'' + E(x.url) + '\');background-size:' +
        (isLogo ? 'contain' : 'cover') + ';background-position:center;background-repeat:no-repeat"></div>' +
        (x.caution ? '<div style="position:absolute;top:4px;right:4px;background:var(--red);color:#fff;font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:3px">⚠</div>' : '') +
        (x.source === 'upload' ? '<div style="position:absolute;top:4px;left:4px;background:var(--green);color:#fff;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:3px">SUBIDA</div>' : '') +
        '<div style="padding:0.3rem 0.4rem;font-size:0.7rem;background:#fff;color:#111;line-height:1.25;height:2.6em;overflow:hidden">' + E(x.label) + '</div>' +
        '</div>';
    }).join('');

    // El índice del tile tiene que corresponder con la lista filtrada.
    this._visible = list;

    document.getElementById(this.MODAL_ID + '-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
        <h3 style="margin:0">${c.kind === 'logo' ? 'Elegir logo' : 'Elegir foto'}</h3>
        <button style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--gray-400)" onclick="DeckPicker.close()">&times;</button>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:0.7rem;flex-wrap:wrap">
        <input id="deck-picker-search" value="${E(this._filter)}" placeholder="Buscar…" style="flex:1;min-width:180px;padding:0.4rem 0.6rem;border:1.5px solid var(--gray-200);border-radius:var(--radius)" oninput="DeckPicker.filter(this.value)">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('deck-picker-file').click()">Subir ${c.kind === 'logo' ? 'logo' : 'foto'}</button>
        <button class="btn btn-sm btn-outline" onclick="DeckPicker.fromUrl()">Pegar URL</button>
        ${current ? '<button class="btn btn-sm btn-outline" style="border-color:var(--red);color:var(--red)" onclick="DeckPicker.clear()">Quitar</button>' : ''}
        <input type="file" id="deck-picker-file" accept="image/*" style="display:none" onchange="DeckPicker.upload(this.files[0])">
      </div>

      <div id="deck-picker-status" style="font-size:0.8rem;color:var(--gray-400);margin-bottom:0.5rem"></div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.6rem;max-height:60vh;overflow-y:auto;padding:0.2rem">
        ${tiles || '<p style="color:var(--gray-400);font-size:0.85rem">Nada coincide con la búsqueda.</p>'}
      </div>

      <p style="font-size:0.75rem;color:var(--gray-400);margin-top:0.7rem;margin-bottom:0">
        Las marcadas con ⚠ tienen un aviso registrado y piden confirmación. Lo que subas queda en el banco para los próximos tours.
      </p>`;

    const s = document.getElementById('deck-picker-search');
    if (s && this._filter) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  },

  currentValue(t, path) {
    if (!t || !t.deck) return '';
    let node = t.deck;
    const parts = String(path).split('.');
    for (let i = 0; i < parts.length; i++) {
      if (node == null) return '';
      node = node[parts[i]];
    }
    return node || '';
  },

  filter(v) { this._filter = v || ''; this.render(); },

  pick(i) {
    const x = (this._visible || [])[i];
    const c = this._ctx;
    if (!x || !c) return;
    if (x.caution && !confirm('AVISO sobre esta imagen:\n\n' + x.caution + '\n\n¿Usarla de todas formas?')) return;
    DeckEditor.save(c.tourId, c.path, x.value);
    this.close();
    Tours.viewTour(c.tourId);
  },

  clear() {
    const c = this._ctx;
    if (!c) return;
    DeckEditor.save(c.tourId, c.path, '');
    this.close();
    Tours.viewTour(c.tourId);
  },

  fromUrl() {
    const c = this._ctx;
    if (!c) return;
    const url = prompt('Pega la URL de la imagen:');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { alert('Tiene que ser una URL http(s).'); return; }
    DeckEditor.save(c.tourId, c.path, url);
    this.close();
    Tours.viewTour(c.tourId);
  },

  status(msg) {
    const el = document.getElementById('deck-picker-status');
    if (el) el.textContent = msg || '';
  },

  /* -- Subida ---------------------------------------------------------------- */

  upload(file) {
    const c = this._ctx;
    if (!file || !c) return;
    if (!/^image\//.test(file.type)) { alert('Eso no es una imagen.'); return; }
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen pesa ' + Math.round(file.size / 1024 / 1024) + ' MB. Máximo 8 MB: un deck con fotos de 10 MB tarda una eternidad en abrir.');
      return;
    }
    if (!DB._firebaseReady || !DB.storage) {
      alert('No hay conexión con Firebase, así que no se puede subir ahora. Puedes pegar una URL o elegir del banco.');
      return;
    }

    this.status('Subiendo ' + file.name + '…');
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = 'deck/' + c.kind + 's/' + Date.now() + '_' + clean;
    const ref = DB.storage.ref(path);

    ref.put(file)
      .then(() => ref.getDownloadURL())
      .then(url => {
        const meta = {
          kind: c.kind, url: url, storagePath: path,
          name: file.name, label: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          size: file.size, uploadedAt: new Date().toISOString()
        };
        return DB.firestore.collection('deckAssets').add(meta)
          .then(doc => { this._uploaded.unshift(Object.assign({ id: doc.id }, meta)); return url; });
      })
      .then(url => {
        this.status('');
        DeckEditor.save(c.tourId, c.path, url);
        this.close();
        Tours.viewTour(c.tourId);
      })
      .catch(e => {
        console.warn('deck upload failed:', e);
        this.status('');
        alert('No se pudo subir: ' + (e.code ? e.code + ' — ' : '') + (e.message || 'error desconocido'));
      });
  }
};
