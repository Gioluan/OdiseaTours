/* === ODISEA DECK · linter de reglas ==========================================
 *
 * Las reglas de Odisea que hasta ahora vivian en la cabeza de quien escribia el
 * deck, y en unos 40 assert al final de cada _fill_<cliente>.py. Un assert que
 * hay que reescribir en cada tour no es una regla: es una costumbre. Esto si es
 * una regla.
 *
 * Cada entrada de RULES mira el texto plano del deck ya generado, o el modelo
 * del tour, y devuelve un problema o nada.
 *
 *   level 'error'  no puede salir asi hacia un cliente
 *   level 'warn'   probablemente esta mal, pero puede haber motivo
 *
 * DeckLint.check(tour, opts) -> [{level, msg}]
 *
 * Anadir una regla nueva: una entrada mas en RULES. No hay que tocar nada mas,
 * y a partir de ese momento aplica a TODOS los decks, tambien a los antiguos
 * cuando se regeneran.
 */
const DeckLint = {

  /* Texto visible del deck, sin etiquetas, en minusculas y sin acentos, para
   * poder buscar sin preocuparse de como se escribio. */
  plainText(html) {
    const txt = String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&middot;/g, '·').replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '’')
      .replace(/\s+/g, ' ');
    return txt;
  },

  fold(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  RULES: [

    /* -- Reglas duras de producto -------------------------------------------- */
    {
      id: 'media-pension',
      run(ctx) {
        // Media pension SIEMPRE: desayuno y cena en el alojamiento, comida del
        // mediodia por cuenta propia. Vender pension completa compromete un
        // coste que no esta comprado.
        if (/pension completa|full board|three meals|tres comidas/.test(ctx.flat)) {
          return { level: 'error', msg: 'Aparece pensión completa. Odisea vende SIEMPRE media pensión: la comida del mediodía va por cuenta propia.' };
        }
        if (/(comidas?|almuerzos?|lunch(es)?) incluid|included lunch|lunch included/.test(ctx.flat)) {
          return { level: 'error', msg: 'La comida del mediodía figura como incluida. Va siempre por cuenta propia.' };
        }
      }
    },
    {
      id: 'seguro',
      run(ctx) {
        // El seguro NO lo pone Odisea, lo trae cada club, y es obligatorio.
        // El sitio web dijo lo contrario en 17 sitios hasta julio de 2026.
        const mentions = /seguro|insurance/.test(ctx.flat);
        if (!mentions) {
          return { level: 'error', msg: 'El deck no dice nada del seguro. Tiene que constar como NO incluido y obligatorio, lo aporta cada club.' };
        }
        if (/seguro (de viaje |medico |)incluid|insurance included|includes? (travel |medical )?insurance/.test(ctx.flat)) {
          return { level: 'error', msg: 'El seguro aparece como incluido. Odisea NO lo incluye: es obligatorio y lo trae cada club.' };
        }
        if (!/obligatori|mandatory|required/.test(ctx.flat)) {
          return { level: 'warn', msg: 'El seguro se menciona pero no queda marcado como obligatorio.' };
        }
      }
    },
    {
      id: 'partner-oficial',
      run(ctx) {
        if (/partner oficial|socio oficial|official partner|officially partnered|partner of fc barcelona|partner del/.test(ctx.flat)) {
          return { level: 'error', msg: 'Hay lenguaje de "partner oficial". Odisea no es partner oficial del FCB, del Valencia CF ni de la RFEF. Describe dónde entrena el grupo, no una alianza.' };
        }
      }
    },
    {
      id: 'grabacion-partidos',
      run(ctx) {
        if (/grabacion de (los )?partidos|match filming|film(ing|ed) (the |every |each )?match|video analysis per player|etiquetado por jugador|per-player tagging/.test(ctx.flat)) {
          return { level: 'error', msg: 'Se promete grabación de partidos o etiquetado por jugador. Eso no es un servicio de Odisea.' };
        }
      }
    },
    {
      id: 'academia-la-liga',
      run(ctx) {
        // No prometer entrenamiento con academias de La Liga en grupos
        // masculinos: no esta comprado y no siempre se consigue.
        if (/(academia|academy) (de |del |of )?(la liga|laliga)/.test(ctx.flat)) {
          return { level: 'error', msg: 'Se promete academia de La Liga. En grupos masculinos no se compromete: usa "club español de categoría equivalente".' };
        }
      }
    },
    {
      id: 'rival-local',
      run(ctx) {
        if (/strong local (team|side|opposition)|equipo local fuerte/.test(ctx.flat)) {
          return { level: 'warn', msg: 'Dice "strong local team". La fórmula de casa es "competitive game vs Spanish opposition".' };
        }
      }
    },
    {
      id: 'certificacion-menores',
      run(ctx) {
        if (/certificad[oa] (oficial )?(de |para )?(trabajo con )?menores|minors certification|certificate of insurance/.test(ctx.flat)) {
          return { level: 'error', msg: 'Se afirma una certificación española de trabajo con menores o un certificate of insurance. Odisea no tiene esas acreditaciones que reclamar.' };
        }
      }
    },

    /* -- Estilo de casa ------------------------------------------------------ */
    {
      id: 'raya-larga',
      run(ctx) {
        if (ctx.text.indexOf('—') !== -1) {
          return { level: 'error', msg: 'Hay una raya larga (—) en el texto. En los materiales de Odisea no se usan.' };
        }
      }
    },
    {
      id: 'soccer-football',
      run(ctx) {
        // soccer para publico de EE.UU., football para el resto. En un deck en
        // castellano no pinta ninguna de las dos.
        //
        // Se mira sobre el texto SIN nombres propios: "Portage Soccer Club" es
        // como se llama el club, no una decision de idioma nuestra.
        const s = ctx.flatNoNames;
        if (ctx.lang === 'es' && /\bsoccer\b/.test(s)) {
          return { level: 'error', msg: 'El deck está en castellano y aparece "soccer" fuera del nombre del club.' };
        }
        if (ctx.lang !== 'es') {
          const aud = ctx.audience;
          if (aud === 'us' && /\bfootball\b/.test(s) && !/\bsoccer\b/.test(s)) {
            return { level: 'warn', msg: 'Cliente de EE.UU. y el deck dice "football". Para público estadounidense se escribe "soccer".' };
          }
          if ((aud === 'uk' || aud === 'au' || aud === 'ie') && /\bsoccer\b/.test(s)) {
            return { level: 'warn', msg: 'Cliente de UK/Irlanda/Australia y el deck dice "soccer". Ahí se escribe "football".' };
          }
        }
      }
    },
    {
      id: 'castellano-no-rioplatense',
      run(ctx) {
        if (ctx.lang !== 'es') return;
        const m = ctx.flat.match(/\b(uds\.|ustedes van|acomodacion|boletos|remera|pileta|cancha de futbol 11|celular)\b/);
        if (m) {
          return { level: 'warn', msg: 'Vocabulario no peninsular: "' + m[0] + '". Los decks en español van en castellano de España aunque el cliente sea de LatAm.' };
        }
      }
    },

    /* -- Coherencia de los datos --------------------------------------------- */
    {
      id: 'dias-noches',
      run(ctx) {
        const days = ctx.m.days.length, nights = ctx.m.nights;
        if (days && nights && nights !== days - 1) {
          return { level: 'warn', msg: 'El itinerario tiene ' + days + ' días y el tour ' + nights + ' noches. Lo normal es ' + (days - 1) + '. Revisa si falta un día o sobra una noche.' };
        }
      }
    },
    {
      id: 'dias-vacios',
      run(ctx) {
        const empty = ctx.m.days
          .map((d, i) => ({ n: i + 1, items: (d.items || []).filter(x => x.description) }))
          .filter(x => !x.items.length);
        if (empty.length) {
          return { level: 'error', msg: 'Días sin agenda: ' + empty.map(x => x.n).join(', ') + '. Saldrían con el horario en blanco.' };
        }
      }
    },
    {
      id: 'titulares-dia',
      run(ctx) {
        const missing = ctx.m.days
          .map((d, i) => ({ n: i + 1, t: (((ctx.m.d.days || [])[i] || {}).titleLine1 || d.title || '').trim() }))
          .filter(x => !x.t);
        if (missing.length) {
          return { level: 'warn', msg: 'Días sin titular: ' + missing.map(x => x.n).join(', ') + '. La slide sale con el hueco del titular vacío.' };
        }
      }
    },
    {
      id: 'precios',
      run(ctx) {
        if (ctx.noPricing) return;
        const tiers = Deck.tiers(ctx.m);
        if (!tiers.length) {
          return { level: 'error', msg: 'No hay ningún precio cargado y el deck no es la versión "a consultar". Pon precios o genera la versión sin precios.' };
        }
      }
    },
    {
      id: 'margen',
      run(ctx) {
        // Aviso comercial, no de producto: un deck que se manda por debajo del
        // coste es un error caro y silencioso.
        const t = ctx.m.t, c = t.costs || {};
        const paying = (+t.numStudents || 0) + (+t.numSiblings || 0) + (+t.numAdults || 0);
        const price = +t.priceStudent || 0;
        if (ctx.noPricing || !c.costPerPerson || !price) return;
        const margin = (price - c.costPerPerson) / price;
        if (margin < 0) {
          return { level: 'error', msg: 'El precio por jugador (' + price + ') está POR DEBAJO del coste por persona (' + Math.round(c.costPerPerson) + ').' };
        }
        if (margin < 0.15) {
          return { level: 'warn', msg: 'Margen del ' + Math.round(margin * 100) + '% sobre el precio de jugador. Por debajo del 15% conviene revisarlo antes de enviar.' };
        }
      }
    },

    /* -- Fotos ---------------------------------------------------------------- */
    {
      id: 'fotos-con-aviso',
      run(ctx) {
        const bad = ctx.usedPhotos
          .map(f => ({ f: f, meta: (ctx.manifest.photos || {})[f] }))
          .filter(x => x.meta && x.meta.caution);
        if (bad.length) {
          return { level: 'error', msg: bad.map(x => x.f + ': ' + x.meta.caution).join(' | ') };
        }
      }
    },
    {
      id: 'fotos-que-faltan',
      run(ctx) {
        const noPhoto = ctx.m.chapters.filter(c => !c.photo).length;
        if (noPhoto) {
          return { level: 'warn', msg: noPhoto + ' capítulo(s) sin foto de fondo. La slide de capítulo sale en negro.' };
        }
      }
    }
  ],

  /* Cache del manifiesto: se lee una vez por sesion. */
  _manifest: null,
  loadManifest() {
    if (this._manifest) return Promise.resolve(this._manifest);
    return fetch('assets/photos.json')
      .then(r => r.json())
      .then(j => { this._manifest = j; return j; })
      .catch(() => { this._manifest = { photos: {}, logos: {} }; return this._manifest; });
  },

  check(t, opts) {
    opts = opts || {};
    const m = Deck.model(t, opts);
    const html = Deck.buildHTML(t, opts);
    const text = this.plainText(html);

    // Fotos realmente usadas en este deck, por nombre de fichero.
    const used = [];
    (html.match(/assets\/photos\/([^"')]+)/g) || []).forEach(u => {
      const f = u.split('/').pop();
      if (used.indexOf(f) === -1) used.push(f);
    });

    // Los nombres propios (club, tour) se apartan para las reglas de idioma:
    // el club se llama como se llama y eso no lo decide Odisea.
    const flat = this.fold(text);
    let flatNoNames = flat;
    [t.clientName, t.tourName].filter(Boolean).forEach(n => {
      const f = this.fold(n).trim();
      if (f.length > 2) flatNoNames = flatNoNames.split(f).join(' ');
    });

    const ctx = {
      m: m, text: text, flat: flat, flatNoNames: flatNoNames,
      lang: m.lang, noPricing: m.noPricing,
      audience: (t.deck && t.deck.audience) || this.guessAudience(t),
      usedPhotos: used,
      manifest: this._manifest || { photos: {}, logos: {} }
    };

    const out = [];
    this.RULES.forEach(rule => {
      let r;
      try { r = rule.run(ctx); }
      catch (e) { r = { level: 'warn', msg: 'La regla "' + rule.id + '" falló: ' + e.message }; }
      if (r) { r.id = rule.id; out.push(r); }
    });
    // Errores primero.
    return out.sort((a, b) => (a.level === b.level) ? 0 : (a.level === 'error' ? -1 : 1));
  },

  /* Sin campo explicito, se deduce del pais o la ubicacion del cliente. */
  guessAudience(t) {
    const s = this.fold([(t.deck && t.deck.clientLocation) || '', t.clientCountry || '', t.clientName || ''].join(' '));
    if (/\b(usa|u\.s\.|united states|america|texas|california|florida|michigan|new jersey|hawaii)\b/.test(s)) return 'us';
    if (/\b(uk|england|scotland|wales|united kingdom)\b/.test(s)) return 'uk';
    if (/\b(australia|adelaide|perth|sydney|melbourne)\b/.test(s)) return 'au';
    if (/\b(ireland|irish|cork|dublin)\b/.test(s)) return 'ie';
    return '';
  }
};
