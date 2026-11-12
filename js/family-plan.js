// ── Family payment plan with Confirmed / TBC travelers ──
// Shared by the family portal (portal.html) and the CRM (index.html).
//
// accessCodes/{code}.payment (written by Odisea only) may carry:
//   places:  [{ id, role: 'player'|'sibling'|'adult', label, free? }]  the family's travelers
//   prices:  { player, sibling, adult }   euros per traveler
//   depositPerTraveler: 500
//   tbcDeadline: 'YYYY-MM-DD'              last day a TBC traveler can be confirmed
//   installments: deposit / second / final (+ extraN / balanceN once paid)
// tours/{tourId}/familyChoices/{familyId} (written by the family) carries:
//   status: { placeId: 'confirmed'|'tbc' }, added: [{ id, role, label }]
//
// Money rules (agreed with Juan, 9-Nov-2026):
//   - only Confirmed travelers are charged; TBC shows the price but costs nothing;
//   - deposit = 500 x confirmed paying travelers (free places pay nothing);
//   - confirmed after the deposit was paid -> an extra 500 deposit per new
//     traveler is due straight away, the rest goes into the second/final payments;
//   - a confirmed traveler can go back to TBC only while their deposit is unpaid;
//   - after tbcDeadline, TBC travelers are not travelling and nothing can change
//     from the portal (the family messages us).
// A plan without `places` is a fixed plan and is shown exactly as stored.
//
// Payments of any amount (agreed with Juan, 12-Nov-2026):
//   payment.payments: [{ id, amount, on: 'YYYY-MM-DD', via: card|wise|bank|cash, markedBy, stripeSession? }]
//   Families may pay whatever they have, whenever they want; only the totals
//   by each due date matter. These payments fill the unpaid instalments in
//   order (deposit, extras, second, final): an instalment fully filled shows
//   as paid ("covered"), one partly filled carries paidPart. Instalments
//   themselves keep their amounts, so totals stay right whichever way a family
//   pays (old fixed links, any amount, transfers).
const FamilyPlan = {
  ROLES: ['player', 'sibling', 'adult'],

  r2(v) { return Math.round((Number(v) || 0) * 100) / 100; },

  isDynamic(plan) { return !!(plan && Array.isArray(plan.places) && plan.places.length && plan.prices); },

  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // All travelers with their status, price and lock state.
  places(plan, choices, today) {
    choices = choices || {};
    const st = choices.status || {};
    const closed = !!(plan.tbcDeadline && (today || this.today()) > plan.tbcDeadline);
    const base = (plan.places || []).map(p => ({ id: String(p.id), role: p.role, label: p.label || '', free: !!p.free, added: false }));
    const added = (Array.isArray(choices.added) ? choices.added : [])
      .filter(p => p && p.id && this.ROLES.includes(p.role) && !base.some(b => b.id === String(p.id)))
      .slice(0, 10)
      .map(p => ({ id: String(p.id), role: p.role, label: String(p.label || '').slice(0, 60), free: false, added: true }));
    return base.concat(added).map(p => {
      const s = st[p.id] === 'tbc' || st[p.id] === 'confirmed' ? st[p.id] : (p.added ? 'tbc' : 'confirmed');
      const price = p.free ? 0 : this.r2((plan.prices || {})[p.role]);
      return Object.assign(p, { status: s, price, closed });
    });
  },

  // Organiser / Odisea view of one family's travelers, without prices:
  // basePlaces is the copy kept in tours/{id}/familyPaid/{familyId}.places.
  people(basePlaces, choices, tbcDeadline, today) {
    if (!Array.isArray(basePlaces) || !basePlaces.length) return [];
    return this.places({ places: basePlaces, prices: {}, tbcDeadline: tbcDeadline || '' }, choices, today);
  },

  // Pairs registered passengers with travelers: first by first name, then by role.
  // Returns { byPax: Map(passengerId -> traveler), unmatched: [travelers] }.
  match(people, passengers) {
    const left = (people || []).slice();
    const byPax = new Map();
    const first = v => String(v || '').trim().split(/\s+/)[0].toLowerCase();
    const role = v => { v = String(v || 'player').toLowerCase(); return v === 'student' ? 'player' : (v === 'coach' ? 'adult' : v); };
    const pax = passengers || [];
    pax.forEach(p => {
      const i = left.findIndex(x => x.label && first(x.label) && first(x.label) === first(p.firstName));
      if (i >= 0) byPax.set(p.id, left.splice(i, 1)[0]);
    });
    pax.forEach(p => {
      if (byPax.has(p.id)) return;
      let i = left.findIndex(x => x.role === role(p.role) && x.status === 'confirmed');
      if (i < 0) i = left.findIndex(x => x.role === role(p.role));
      if (i >= 0) byPax.set(p.id, left.splice(i, 1)[0]);
    });
    return { byPax, unmatched: left };
  },

  // Valid any-amount payments, oldest first.
  payments(plan) {
    return (Array.isArray(plan && plan.payments) ? plan.payments : [])
      .filter(p => p && (Number(p.amount) || 0) > 0)
      .map(p => Object.assign({}, p, { amount: this.r2(p.amount) }))
      .sort((a, b) => String(a.on || '').localeCompare(String(b.on || '')));
  },

  // Pours the any-amount payments into the unpaid instalments, in order.
  // Returns the money that did not fit (credit) and the deposit money covered.
  _applyPayments(items, pays) {
    let pool = this.r2(pays.reduce((s, p) => s + p.amount, 0));
    let used = 0, coveredDeposits = 0;
    // Date the running total of payments first reached `amount`.
    const reachedOn = amount => {
      let run = 0;
      for (const p of pays) { run = this.r2(run + p.amount); if (run >= amount - 0.005) return p.on || ''; }
      return '';
    };
    const out = items.map(i => {
      const amount = this.r2(i.amount);
      if (i.status === 'paid' || amount <= 0 || pool <= 0.005) return i;
      const take = this.r2(Math.min(pool, amount));
      pool = this.r2(pool - take);
      used = this.r2(used + take);
      if (i.key === 'deposit' || /^extra\d+$/.test(i.key)) coveredDeposits = this.r2(coveredDeposits + take);
      if (take >= amount - 0.005) return Object.assign({}, i, { status: 'paid', covered: true, paidPart: amount, paidVia: 'payments', paidOn: reachedOn(used) });
      return Object.assign({}, i, { paidPart: take });
    });
    return { items: out, credit: pool, coveredDeposits };
  },

  // Live instalments: paid ones stay exactly as paid, the rest follow the
  // confirmed travelers; then any-amount payments fill them in order.
  compute(plan, choices, today) {
    today = today || this.today();
    const stored = Array.isArray(plan.installments) ? plan.installments : [];
    const pays = this.payments(plan);
    const paysSum = this.r2(pays.reduce((s, p) => s + p.amount, 0));
    if (!this.isDynamic(plan)) {
      const total = this.r2(stored.reduce((s, i) => s + (Number(i.amount) || 0), 0));
      const paid = this.r2(stored.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0) + paysSum);
      const a = this._applyPayments(stored, pays);
      return { dynamic: false, items: a.items, total, paid, balance: this.r2(total - paid), credit: a.credit, places: [], payments: pays };
    }
    const dep = Number(plan.depositPerTraveler) || 500;
    const places = this.places(plan, choices, today);
    const going = places.filter(p => p.status === 'confirmed');
    const paying = going.filter(p => !p.free).length;
    const total = this.r2(going.reduce((s, p) => s + p.price, 0));

    const isDep = i => i.key === 'deposit' || /^extra\d+$/.test(i.key);
    const paidItems = stored.filter(i => i.status === 'paid');
    const paid = this.r2(paidItems.reduce((s, i) => s + (Number(i.amount) || 0), 0));
    const paidDeposits = this.r2(paidItems.filter(isDep).reduce((s, i) => s + (Number(i.amount) || 0), 0));
    const depositDue = this.r2(paying * dep);
    const ref = k => {
      const d = stored.find(i => i.key === 'deposit');
      const baseRef = String((d && d.reference) || '').replace(/-DEP$/, '');
      return baseRef ? baseRef + '-' + k : '';
    };

    const items = [];
    let open = 0;   // unpaid deposit money already shown
    const deposit = stored.find(i => i.key === 'deposit');
    if (deposit) {
      if (deposit.status === 'paid') items.push(deposit);
      else { items.push(Object.assign({}, deposit, { amount: depositDue })); open += depositDue; }
    }
    // Earlier extra deposits that were paid.
    stored.filter(i => /^extra\d+$/.test(i.key) && i.status === 'paid').forEach(i => items.push(i));
    if (deposit && deposit.status === 'paid' && depositDue > paidDeposits + 0.005) {
      const n = stored.filter(i => /^extra\d+$/.test(i.key)).length + 1;
      const amount = this.r2(depositDue - paidDeposits);
      items.push({ key: 'extra' + n, label: 'Deposit for added travelers', due: today, amount, reference: ref('ADD' + n),
                   status: 'due', extraQty: Math.round(amount / dep) });
      open += amount;
    }
    let rest = this.r2(total - paid - open);
    const later = ['second', 'final'].map(k => stored.find(i => i.key === k)).filter(Boolean);
    const unpaidLater = later.filter(i => i.status !== 'paid');
    later.forEach(i => {
      if (i.status === 'paid') { items.push(i); return; }
      const last = i === unpaidLater[unpaidLater.length - 1];
      const share = last ? rest : this.r2(Math.max(rest, 0) / unpaidLater.length);
      items.push(Object.assign({}, i, { amount: this.r2(Math.max(share, 0)) }));
      rest = this.r2(rest - share);
    });
    stored.filter(i => /^balance\d+$/.test(i.key) && i.status === 'paid').forEach(i => items.push(i));
    if (!unpaidLater.length && rest > 0.005) {
      const n = stored.filter(i => /^balance\d+$/.test(i.key)).length + 1;
      items.push({ key: 'balance' + n, label: 'Balance for added travelers', due: today, amount: rest, reference: ref('BAL' + n), status: 'due' });
    }
    const a = this._applyPayments(items, pays);
    const credit = this.r2((rest < -0.005 ? -rest : 0) + a.credit);
    // Confirmed paying travelers whose deposit is already paid (by a deposit
    // payment or by any-amount payments) cannot go back to TBC.
    const lockedPaying = Math.floor((paidDeposits + a.coveredDeposits) / dep + 0.0001);
    places.forEach(p => {
      p.canTbc = !p.closed && p.status === 'confirmed' && (p.free || paying > lockedPaying);
      p.canConfirm = !p.closed && p.status === 'tbc';
    });
    const shownTotal = this.r2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
    const allPaid = this.r2(paid + paysSum);
    return { dynamic: true, items: a.items, total: shownTotal, paid: allPaid, balance: this.r2(shownTotal - allPaid), credit, places,
             confirmed: going.length, tbc: places.length - going.length, paying, depositDue, tbcDeadline: plan.tbcDeadline || '', payments: pays };
  }
};
if (typeof window !== 'undefined') window.FamilyPlan = FamilyPlan;
if (typeof module !== 'undefined') module.exports = FamilyPlan;
