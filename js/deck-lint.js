/* === ODISEA DECK · rule linter ===============================================
 *
 * The Odisea rules that until now lived in the head of whoever wrote the deck,
 * and in some 40 asserts at the bottom of every _fill_<client>.py. An assert
 * that has to be rewritten for each tour is not a rule: it is a habit. This is
 * a rule.
 *
 * Each RULES entry looks at the plain text of the generated deck, or at the
 * model, and returns a problem or nothing.
 *
 *   level 'error'  cannot go out to a client like this
 *   level 'warn'   probably wrong, but there may be a reason
 *
 * DeckLint.check(record, opts) -> [{level, msg}]
 *
 * To add a rule: one more entry in RULES. Nothing else to touch, and from that
 * moment it applies to EVERY deck, including old ones when regenerated.
 *
 * The rules search in BOTH languages on purpose: a Spanish deck has to catch
 * "pension completa" exactly as an English one catches "full board". Only the
 * messages are in English.
 */
const DeckLint = {

  /* The visible text of the deck, without tags, lowercased and unaccented, so
   * searching does not depend on how something was typed. */
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

    /* -- Hard product rules --------------------------------------------------- */
    {
      id: 'half-board',
      run(ctx) {
        // Half board ALWAYS: breakfast and dinner at the accommodation, lunch
        // at own cost. Selling full board commits a cost that was never bought.
        if (/pension completa|full board|three meals|tres comidas/.test(ctx.flat)) {
          return { level: 'error', msg: 'Full board appears in the deck. Odisea always sells half board: lunch is at own cost.' };
        }
        if (/(comidas?|almuerzos?|lunch(es)?) incluid|included lunch|lunch included/.test(ctx.flat)) {
          return { level: 'error', msg: 'Lunch is listed as included. It is always at own cost.' };
        }
      }
    },
    {
      id: 'insurance',
      run(ctx) {
        // Odisea does NOT provide insurance, each club brings their own, and
        // it is mandatory. The website said otherwise in 17 places until July
        // 2026.
        const mentions = /seguro|insurance/.test(ctx.flat);
        if (!mentions) {
          return { level: 'error', msg: 'The deck says nothing about insurance. It must appear as NOT included and mandatory, arranged by each club.' };
        }
        if (/seguro (de viaje |medico |)incluid|insurance included|includes? (travel |medical )?insurance/.test(ctx.flat)) {
          return { level: 'error', msg: 'Insurance appears as included. Odisea does NOT include it: it is mandatory and each club brings their own.' };
        }
        if (!/obligatori|mandatory|required/.test(ctx.flat)) {
          return { level: 'warn', msg: 'Insurance is mentioned but not flagged as mandatory.' };
        }
      }
    },
    {
      id: 'official-partner',
      run(ctx) {
        if (/partner oficial|socio oficial|official partner|officially partnered|partner of fc barcelona|partner del/.test(ctx.flat)) {
          return { level: 'error', msg: '"Official partner" language found. Odisea is not an official partner of FCB, Valencia CF or the RFEF. Describe where the group trains, not a partnership.' };
        }
      }
    },
    {
      id: 'match-filming',
      run(ctx) {
        if (/grabacion de (los )?partidos|match filming|film(ing|ed) (the |every |each )?match|video analysis per player|etiquetado por jugador|per-player tagging/.test(ctx.flat)) {
          return { level: 'error', msg: 'Match filming or per-player tagging is being promised. That is not an Odisea service.' };
        }
      }
    },
    {
      id: 'la-liga-academy',
      run(ctx) {
        // Never promise training with La Liga academies for boys' groups: it
        // is not bought and cannot always be arranged.
        if (/(academia|academy) (de |del |of )?(la liga|laliga)/.test(ctx.flat)) {
          return { level: 'error', msg: 'A La Liga academy is being promised. Never committed for boys\' groups: use "Spanish club of equivalent level".' };
        }
      }
    },
    {
      id: 'local-opposition',
      run(ctx) {
        if (/strong local (team|side|opposition)|equipo local fuerte/.test(ctx.flat)) {
          return { level: 'warn', msg: 'Says "strong local team". The house wording is "competitive game vs Spanish opposition".' };
        }
      }
    },
    {
      id: 'minors-certification',
      run(ctx) {
        if (/certificad[oa] (oficial )?(de |para )?(trabajo con )?menores|minors certification|certificate of insurance/.test(ctx.flat)) {
          return { level: 'error', msg: 'Claims a Spanish minors-certification or a certificate of insurance. Odisea has no such accreditation to claim.' };
        }
      }
    },

    /* -- House style ---------------------------------------------------------- */
    {
      id: 'em-dash',
      run(ctx) {
        if (ctx.text.indexOf('—') !== -1) {
          return { level: 'error', msg: 'There is an em dash (—) in the text. Odisea materials do not use them.' };
        }
      }
    },
    {
      id: 'soccer-football',
      run(ctx) {
        // soccer for a US audience, football for everyone else. In a Spanish
        // deck neither belongs.
        //
        // Checked against the text WITHOUT proper nouns: "Portage Soccer Club"
        // is what the club is called, not a language decision of ours.
        const s = ctx.flatNoNames;
        if (ctx.lang === 'es' && /\bsoccer\b/.test(s)) {
          return { level: 'error', msg: 'The deck is in Spanish but "soccer" appears outside the club name.' };
        }
        if (ctx.lang !== 'es') {
          const aud = ctx.audience;
          if (aud === 'us' && /\bfootball\b/.test(s) && !/\bsoccer\b/.test(s)) {
            return { level: 'warn', msg: 'US client but the deck says "football". For a US audience it should be "soccer".' };
          }
          if ((aud === 'uk' || aud === 'au' || aud === 'ie') && /\bsoccer\b/.test(s)) {
            return { level: 'warn', msg: 'UK/Ireland/Australia client but the deck says "soccer". There it should be "football".' };
          }
        }
      }
    },
    {
      id: 'castilian-not-latam',
      run(ctx) {
        if (ctx.lang !== 'es') return;
        const m = ctx.flat.match(/\b(uds\.|ustedes van|acomodacion|boletos|remera|pileta|cancha de futbol 11|celular)\b/);
        if (m) {
          return { level: 'warn', msg: 'Non-peninsular wording: "' + m[0] + '". Spanish decks use Castilian Spanish even when the client is from Latin America.' };
        }
      }
    },

    /* -- Data coherence ------------------------------------------------------- */
    {
      id: 'days-vs-nights',
      run(ctx) {
        const days = ctx.m.days.length, nights = ctx.m.nights;
        if (days && nights && nights !== days - 1) {
          return { level: 'warn', msg: 'The itinerary has ' + days + ' days and the tour ' + nights + ' nights. Normally it would be ' + (days - 1) + '. Check for a missing day or an extra night.' };
        }
      }
    },
    {
      id: 'empty-days',
      run(ctx) {
        const empty = ctx.m.days
          .map((d, i) => ({ n: i + 1, items: (d.items || []).filter(x => x.description) }))
          .filter(x => !x.items.length);
        if (empty.length) {
          return { level: 'error', msg: 'Days with no schedule: ' + empty.map(x => x.n).join(', ') + '. They would come out blank.' };
        }
      }
    },
    {
      id: 'day-headlines',
      run(ctx) {
        const missing = ctx.m.days
          .map((d, i) => ({ n: i + 1, t: (((ctx.m.d.days || [])[i] || {}).titleLine1 || d.title || '').trim() }))
          .filter(x => !x.t);
        if (missing.length) {
          return { level: 'warn', msg: 'Days with no headline: ' + missing.map(x => x.n).join(', ') + '. The slide comes out with an empty headline.' };
        }
      }
    },
    {
      id: 'pricing',
      run(ctx) {
        if (ctx.noPricing) return;
        const tiers = Deck.tiers(ctx.m);
        if (!tiers.length) {
          return { level: 'error', msg: 'No pricing set and this is not the "On request" version. Add prices or generate the deck without pricing.' };
        }
      }
    },
    {
      id: 'margin',
      run(ctx) {
        // A commercial warning, not a product one: a deck sent out below cost
        // is an expensive, silent mistake.
        const t = ctx.m.t, c = t.costs || {};
        const paying = (+t.numStudents || 0) + (+t.numSiblings || 0) + (+t.numAdults || 0);
        const price = +t.priceStudent || 0;
        if (ctx.noPricing || !c.costPerPerson || !price) return;
        const margin = (price - c.costPerPerson) / price;
        if (margin < 0) {
          return { level: 'error', msg: 'The player price (' + price + ') is BELOW the cost per person (' + Math.round(c.costPerPerson) + ').' };
        }
        if (margin < 0.15) {
          return { level: 'warn', msg: 'Margin is ' + Math.round(margin * 100) + '% on the player price. Below 15% is worth a second look before sending.' };
        }
      }
    },

    /* -- Photos --------------------------------------------------------------- */
    {
      id: 'photos-with-warning',
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
      id: 'photos-with-note',
      run(ctx) {
        // Soft warning: the photo is usable, but there is something to check.
        const con = ctx.usedPhotos
          .map(f => ({ f: f, meta: (ctx.manifest.photos || {})[f] }))
          .filter(x => x.meta && x.meta.note);
        if (con.length) {
          return { level: 'warn', msg: con.map(x => x.f + ': ' + x.meta.note).join(' | ') };
        }
      }
    },
    {
      id: 'missing-photos',
      run(ctx) {
        const noPhoto = ctx.m.chapters.filter(c => !c.photo).length;
        if (noPhoto) {
          return { level: 'warn', msg: noPhoto + ' chapter(s) with no background photo. The chapter slide comes out black.' };
        }
      }
    }
  ],

  /* Manifest cache: read once per session. */
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

    // Photos actually used in this deck, by filename.
    const used = [];
    (html.match(/assets\/photos\/([^"')]+)/g) || []).forEach(u => {
      const f = u.split('/').pop();
      if (used.indexOf(f) === -1) used.push(f);
    });

    // Proper nouns (club, tour) are set aside for the language rules: the club
    // is called what it is called and Odisea does not decide that.
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
      catch (e) { r = { level: 'warn', msg: 'Rule "' + rule.id + '" failed: ' + e.message }; }
      if (r) { r.id = rule.id; out.push(r); }
    });
    // Errors first.
    return out.sort((a, b) => (a.level === b.level) ? 0 : (a.level === 'error' ? -1 : 1));
  },

  /* With no explicit field, inferred from the client's country or location. */
  guessAudience(t) {
    const s = this.fold([(t.deck && t.deck.clientLocation) || '', t.clientCountry || '', t.clientName || ''].join(' '));
    if (/\b(usa|u\.s\.|united states|america|texas|california|florida|michigan|new jersey|hawaii)\b/.test(s)) return 'us';
    if (/\b(uk|england|scotland|wales|united kingdom)\b/.test(s)) return 'uk';
    if (/\b(australia|adelaide|perth|sydney|melbourne)\b/.test(s)) return 'au';
    if (/\b(ireland|irish|cork|dublin)\b/.test(s)) return 'ie';
    return '';
  }
};
