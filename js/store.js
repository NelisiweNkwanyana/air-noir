/* AIR NOIR — demo data layer.
   Everything here runs in the visitor's browser and is saved to localStorage, so the full platform can be
   tried without a server. Each function mirrors a backend endpoint (noted beside it) so the layer can be
   replaced by real API calls (e.g. FastAPI + PostgreSQL) without touching the views. */
(function () {
  const D = window.AN_DATA;
  const KEY = 'airnoir.platform.v1';

  /* ---------- small utils ---------- */
  const DAY = 864e5;
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  const day = (n) => iso(Date.now() + n * DAY);
  const now = () => new Date().toISOString();
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Compact synchronous SHA-256 (demo only: a real deployment hashes server-side with Argon2/bcrypt).
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const mp = Math.pow, maxWord = mp(2, 32); let result = '', words = [], asciiBitLength = ascii.length * 8;
    let hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], primeCounter = k.length; const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) { for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mp(candidate, .5) * maxWord) | 0; k[primeCounter++] = (mp(candidate, 1 / 3) * maxWord) | 0; }
    }
    hash = hash.slice(0, 8); ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) { const j = ascii.charCodeAt(i); if (j >> 8) return ''; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((asciiBitLength / maxWord) | 0); words[words.length] = (asciiBitLength);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), oldHash = hash; hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2]; const a = hash[0], e = hash[4];
        const temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash); hash[4] = (hash[4] + temp1) | 0; hash.length = 8;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }
  const hashPw = (email, pw) => sha256(unescape(encodeURIComponent('an::' + email.toLowerCase() + '::' + pw)));

  /* ---------- geography & pricing ---------- */
  const airport = (code) => D.AIRPORTS.find((a) => a.iata === code || a.icao === code);
  function distNm(a, b) {
    const A = airport(a), B = airport(b); if (!A || !B) return 0;
    const r = Math.PI / 180, dLat = (B.lat - A.lat) * r, dLon = (B.lon - A.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) / 1.852);
  }
  const hours = (nm, kt) => nm ? nm / kt + 0.4 : 0;
  const FEE_FACTOR = { light: 0.6, midsize: 0.8, 'super-midsize': 1, heavy: 1.4, 'ultra-long-range': 1.8 };
  const isDomesticZA = (legs) => legs.every((l) => airport(l.from)?.country === 'South Africa' && airport(l.to)?.country === 'South Africa');

  /* Price estimate in USD for an aircraft and itinerary. Returns line items. */
  function estimate(ac, legs) {
    const lines = []; let flightH = 0;
    legs.forEach((l) => { flightH += hours(distNm(l.from, l.to), ac.cruiseKt); });
    lines.push({ label: `Flight time (${flightH.toFixed(1)} h × ${fmtUSD(ac.hourlyUSD)})`, usd: Math.round(flightH * ac.hourlyUSD), kind: 'flight' });
    const first = legs[0]?.from, last = legs[legs.length - 1]?.to;
    const posNm = (ac.base !== first ? distNm(ac.base, first) : 0) + (last !== ac.base ? distNm(last, ac.base) : 0);
    if (posNm) { const h = hours(posNm, ac.cruiseKt) - (ac.base !== first && last !== ac.base ? 0 : 0.0); lines.push({ label: `Positioning (${h.toFixed(1)} h)`, usd: Math.round(h * ac.hourlyUSD * 0.85), kind: 'positioning' }); }
    const fees = Math.round(legs.length * 650 * (FEE_FACTOR[ac.category] || 1));
    lines.push({ label: `Landing, handling & navigation (${legs.length} leg${legs.length > 1 ? 's' : ''})`, usd: fees, kind: 'fees' });
    let nights = 0;
    for (let i = 1; i < legs.length; i++) { const gap = Math.round((new Date(legs[i].date) - new Date(legs[i - 1].date)) / DAY); if (gap >= 1) nights += Math.min(gap, 7); }
    if (nights) lines.push({ label: `Crew overnight (${nights} night${nights > 1 ? 's' : ''})`, usd: nights * 480, kind: 'crew' });
    const sub = lines.reduce((s, l) => s + l.usd, 0);
    const vat = isDomesticZA(legs) ? Math.round(sub * 0.15) : 0;
    if (vat) lines.push({ label: 'VAT 15% (domestic South Africa)', usd: vat, kind: 'tax' });
    return { lines, total: sub + vat, flightH };
  }

  /* ---------- money ---------- */
  const RATES = { USD: 1, ZAR: 18.2, EUR: 0.92, GBP: 0.79 };
  const SYMB = { USD: '$', ZAR: 'R ', EUR: '€', GBP: '£' };
  function fmtUSD(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function money(usd, cur) { cur = cur || 'USD'; const v = usd * (RATES[cur] || 1); return (SYMB[cur] || '') + Math.round(v).toLocaleString('en-ZA').replace(/ /g, ' '); }

  /* ---------- seed ---------- */
  function seed() {
    const users = [
      { id: 'u-client', role: 'customer', name: 'Thandi Mokoena', email: 'client@airnoir.demo', phone: '+27 82 555 0143', company: 'Mokoena Capital',
        homeAirport: 'HLA', prefs: { currency: 'ZAR', emailUpdates: true, smsUpdates: false, catering: 'Pescatarian, no shellfish' },
        passengers: [
          { id: 'p1', name: 'Thandi Mokoena', nationality: 'South African', docExpiry: day(1400), notes: 'Lead passenger' },
          { id: 'p2', name: 'Sipho Mokoena', nationality: 'South African', docExpiry: day(900), notes: '' },
          { id: 'p3', name: 'Lerato Mokoena', nationality: 'South African', docExpiry: day(600), notes: 'Travels with a French bulldog, Bijou' }
        ], favourites: ['zs-noa', 'zs-c35'], viewed: ['zs-p60', 'zs-fsx'], created: day(-220) },
      { id: 'u-ops-hv', role: 'operator', operatorId: 'op-highveld', name: 'Pieter van Wyk', email: 'ops@highveld.demo', phone: '+27 11 555 0170', created: day(-600) },
      { id: 'u-ops-cape', role: 'operator', operatorId: 'op-cape', name: 'Amira Jacobs', email: 'ops@capeexec.demo', phone: '+27 21 555 0122', created: day(-600) },
      { id: 'u-ops-atlas', role: 'operator', operatorId: 'op-atlas', name: 'Omar Haddad', email: 'ops@atlasglobal.demo', phone: '+971 4 555 0190', created: day(-600) },
      { id: 'u-admin', role: 'admin', name: 'AIR NOIR Operations', email: 'admin@airnoir.demo', phone: '+27 10 555 0101', created: day(-700) }
    ];
    users.forEach((u) => { u.pw = hashPw(u.email, 'noir2026'); });

    const aircraft = clone(D.AIRCRAFT);
    aircraft.find((a) => a.id === 'zs-cl6').unavailable.push({ id: uid('un'), from: day(8), to: day(14), kind: 'maintenance', note: 'C-check, Lanseria MRO' });
    aircraft.find((a) => a.id === 'zs-fsx').unavailable.push({ id: uid('un'), from: day(20), to: day(23), kind: 'unavailable', note: 'Owner use' });
    aircraft.push(Object.assign(clone(D.AIRCRAFT[7]), { id: 'zs-pc24', reg: 'ZS-PCX', name: 'Klipspringer', manufacturer: 'Pilatus', model: 'PC-24', category: 'light', operator: 'op-cape', base: 'CPT', year: 2024,
      pax: 8, rangeNm: 2000, cruiseKt: 440, cabin: { length: 7.0, width: 1.69, height: 1.55 }, luggageM3: 2.5, hourlyUSD: 3400, amenities: ['Wi-Fi', 'Enclosed lavatory', 'Pet friendly'],
      blurb: 'Lands on gravel and short strips. Opens lodges no other jet can reach.', status: 'pending', active: false, docs: [{ name: 'Certificate of Airworthiness.pdf', added: day(-2) }] }));

    const reqs = [], quotes = [], bookings = [], payments = [], legsEL = [];
    // R1 — quoted, two proposals awaiting the client
    reqs.push({ id: 'REQ-2611', customer: 'u-client', created: day(-3), trip: 'return', pax: 4, category: 'super-midsize', preferred: 'zs-c35',
      legs: [{ from: 'HLA', to: 'MRU', date: day(12), time: '09:30' }, { from: 'MRU', to: 'HLA', date: day(19), time: '15:00' }],
      passengers: ['p1', 'p2', 'p3'], services: [{ id: 'transfer', note: 'Sandton to Lanseria', status: 'approved' }, { id: 'catering', note: 'Light lunch outbound', status: 'approved' }, { id: 'pet', note: 'French bulldog in cabin', status: 'pending' }],
      requirements: 'Pet travels in cabin. Prefer a quiet cabin for a work session outbound.', status: 'quoted', log: [] });
    const q1 = mkQuote('Q-2611-A', 'REQ-2611', 'op-highveld', 'zs-c35', aircraft, reqs[0], { expires: day(3), sent: day(-2) });
    const q2 = mkQuote('Q-2611-B', 'REQ-2611', 'op-cape', 'zs-p60', aircraft, reqs[0], { expires: day(4), sent: day(-1), discountPct: 4 });
    quotes.push(q1, q2);
    // R2 — new request from client awaiting operators
    reqs.push({ id: 'REQ-2618', customer: 'u-client', created: day(-1), trip: 'one-way', pax: 6, category: 'heavy', preferred: null,
      legs: [{ from: 'CPT', to: 'NCE', date: day(31), time: '18:00' }], passengers: ['p1', 'p2'], services: [{ id: 'ground', note: 'Car to Saint-Jean-Cap-Ferrat', status: 'pending' }, { id: 'accommodation', note: 'Villa, 5 nights', status: 'pending' }],
      requirements: 'Overnight flight, flat beds for all six.', status: 'submitted', log: [] });
    // R3 — accepted, booking awaiting payment
    reqs.push({ id: 'REQ-2597', customer: 'u-client', created: day(-9), trip: 'return', pax: 3, category: 'light', preferred: 'zs-cj4',
      legs: [{ from: 'HLA', to: 'VFA', date: day(6), time: '08:00' }, { from: 'VFA', to: 'HLA', date: day(9), time: '16:30' }], passengers: ['p1', 'p2'],
      services: [{ id: 'transfer', note: 'Victoria Falls lodge transfer', status: 'approved' }], requirements: '', status: 'accepted', log: [] });
    const q3 = mkQuote('Q-2597-A', 'REQ-2597', 'op-highveld', 'zs-cj4', aircraft, reqs[2], { expires: day(-4), sent: day(-8), status: 'accepted' });
    quotes.push(q3);
    bookings.push({ id: 'AN-48213', request: 'REQ-2597', quote: 'Q-2597-A', customer: 'u-client', operator: 'op-highveld', aircraft: 'zs-cj4', created: day(-6),
      status: 'awaiting-payment', operatorApproved: true, total: q3.total, depositPct: 30, legs: clone(reqs[2].legs), journey: { crew: 'Capt. N. Dube, F/O R. Naidoo', fbo: 'Lanseria Executive Terminal' }, log: [{ at: day(-6), text: 'Booking created from accepted quotation Q-2597-A' }] });
    // R4 — completed past journey
    reqs.push({ id: 'REQ-2540', customer: 'u-client', created: day(-58), trip: 'one-way', pax: 2, category: 'midsize', preferred: 'zs-lat',
      legs: [{ from: 'HLA', to: 'CPT', date: day(-41), time: '07:15' }], passengers: ['p1', 'p2'], services: [], requirements: '', status: 'accepted', log: [] });
    const q4 = mkQuote('Q-2540-A', 'REQ-2540', 'op-highveld', 'zs-lat', aircraft, reqs[3], { expires: day(-50), sent: day(-55), status: 'accepted' });
    quotes.push(q4);
    bookings.push({ id: 'AN-47720', request: 'REQ-2540', quote: 'Q-2540-A', customer: 'u-client', operator: 'op-highveld', aircraft: 'zs-lat', created: day(-52),
      status: 'completed', operatorApproved: true, total: q4.total, depositPct: 30, legs: clone(reqs[3].legs), journey: { crew: 'Capt. L. Botha', fbo: 'Lanseria Executive Terminal', blockTime: '2 h 04 min' }, log: [{ at: day(-41), text: 'Flight completed' }] });
    payments.push({ id: 'PAY-9012', booking: 'AN-47720', kind: 'deposit', usd: Math.round(q4.total * 0.3), provider: 'payfast', ref: 'PF-77310452', status: 'succeeded', at: day(-51) });
    payments.push({ id: 'PAY-9050', booking: 'AN-47720', kind: 'balance', usd: q4.total - Math.round(q4.total * 0.3), provider: 'ozow', ref: 'OZ-5530019', status: 'succeeded', at: day(-45) });

    // Empty legs
    const el = (o) => legsEL.push(Object.assign({ id: uid('EL'), created: day(-1), status: 'published' }, o));
    el({ operator: 'op-cape', aircraft: 'zs-fsx', from: 'CPT', to: 'HLA', date: day(4), time: '14:00', seats: 14, usd: 9800, flexible: 'Departure may move ±3 hours', expires: day(3) });
    el({ operator: 'op-atlas', aircraft: 'zs-noa', from: 'HLA', to: 'DWC', date: day(10), time: '22:30', seats: 16, usd: 38500, flexible: 'Subject to original charter schedule', expires: day(8) });
    el({ operator: 'op-highveld', aircraft: 'zs-lat', from: 'MQP', to: 'HLA', date: day(2), time: '11:00', seats: 9, usd: 3200, flexible: 'Same-day only', expires: day(1) });
    el({ operator: 'op-cape', aircraft: 'zs-p3e', from: 'GRJ', to: 'CPT', date: day(7), time: '17:45', seats: 7, usd: 2100, flexible: 'Departure may move ±2 hours', expires: day(6) });
    el({ operator: 'op-highveld', aircraft: 'zs-c35', from: 'MRU', to: 'HLA', date: day(13), time: '10:00', seats: 9, usd: 11900, flexible: 'Tied to an inbound charter; can be cancelled up to 48 h before', expires: day(11) });

    return {
      version: 1, users, operators: clone(D.OPERATORS), aircraft, requests: reqs, quotes, bookings, payments, refunds: [], emptyLegs: legsEL,
      activity: [
        { at: day(-1), user: 'u-client', text: 'Request REQ-2618 submitted: Cape Town to Nice' },
        { at: day(-1), user: 'u-client', text: 'New quotation from Cape Executive Air for REQ-2611' },
        { at: day(-2), user: 'u-client', text: 'New quotation from Highveld Jet Charter for REQ-2611' },
        { at: day(-6), user: 'u-client', text: 'Booking AN-48213 created, deposit due' }
      ],
      resets: {}, session: null, compare: []
    };
  }

  function mkQuote(id, reqId, opId, acId, aircraft, req, o) {
    const ac = aircraft.find((a) => a.id === acId);
    const est = estimate(ac, req.legs);
    const lines = est.lines.map((l) => ({ label: l.label, usd: l.usd }));
    (req.services || []).forEach((s) => { const svc = { transfer: 450, catering: 620, pet: 380, ground: 900, accommodation: 0, assistance: 300, luggage: 250, corporate: 0 }[s.id] || 0; if (svc) lines.push({ label: 'Service: ' + D.SERVICES.find((x) => x.id === s.id).label, usd: svc }); });
    if (o.discountPct) { const sub = lines.reduce((s, l) => s + l.usd, 0); lines.push({ label: `Loyalty discount (${o.discountPct}%)`, usd: -Math.round(sub * o.discountPct / 100) }); }
    const total = lines.reduce((s, l) => s + l.usd, 0);
    return { id, request: reqId, operator: opId, aircraft: acId, version: 1, lines, total, expires: o.expires, sent: o.sent, status: o.status || 'sent',
      conditions: { depositPct: 30, balanceDueDays: 3, cancellation: 'More than 14 days before departure: 90% refund. 7–14 days: 50% refund. Under 7 days: non-refundable.', notes: 'Price includes crew, fuel and standard catering. Subject to slot and permit approval.' },
      message: o.message || '', history: [] };
  }

  /* ---------- persistence ---------- */
  let db;
  function load() { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.version === 1) return d; } } catch (e) { /* storage unavailable */ } return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* keep in memory */ } }
  db = load() || seed();
  expireQuotes();
  function reset() { db = seed(); save(); }

  function expireQuotes() {
    const t = iso(Date.now());
    db.quotes.forEach((q) => { if (q.status === 'sent' && q.expires < t) q.status = 'expired'; });
  }

  /* ---------- auth  (POST /auth/register, /auth/login, /auth/logout, /auth/reset) ---------- */
  const err = (m) => { const e = new Error(m); e.user = true; throw e; };
  function currentUser() { return db.session ? db.users.find((u) => u.id === db.session.userId) || null : null; }
  function login(email, pw) {
    const u = db.users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.pw !== hashPw(u.email, pw)) err('That email and password don’t match an account. Check both and try again.');
    if (u.disabled) err('This account is suspended. Contact AIR NOIR operations.');
    db.session = { userId: u.id, at: now() }; save(); return u;
  }
  function logout() { db.session = null; save(); }
  function register(f) {
    const email = String(f.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('Enter a valid email address.');
    if (db.users.some((u) => u.email === email)) err('An account with this email already exists. Sign in instead.');
    if (String(f.password || '').length < 8) err('Use a password of at least 8 characters.');
    if (!f.name || f.name.trim().length < 2) err('Enter your full name.');
    const role = f.role === 'operator' ? 'operator' : 'customer';
    const u = { id: uid('u'), role, name: f.name.trim(), email, phone: f.phone || '', company: f.company || '', created: iso(Date.now()), prefs: { currency: 'ZAR', emailUpdates: true, smsUpdates: false }, passengers: [], favourites: [], viewed: [] };
    if (role === 'operator') {
      const op = { id: uid('op'), name: (f.company || f.name).trim(), base: f.base || 'HLA', aoc: f.aoc || 'Pending', verified: false, since: new Date().getFullYear() };
      db.operators.push(op); u.operatorId = op.id;
    } else { u.passengers.push({ id: uid('p'), name: u.name, nationality: '', docExpiry: '', notes: 'Lead passenger' }); }
    u.pw = hashPw(email, f.password); db.users.push(u); db.session = { userId: u.id, at: now() }; log(u.id, 'Account created'); save(); return u;
  }
  function requestReset(email) {
    const u = db.users.find((x) => x.email === String(email).trim().toLowerCase());
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (u) { db.resets[u.email] = { code, exp: Date.now() + 15 * 60e3 }; save(); }
    return u ? code : null; // A real backend emails this code and never returns it.
  }
  function completeReset(email, code, pw) {
    email = String(email).trim().toLowerCase(); const r = db.resets[email];
    if (!r || r.code !== String(code).trim() || r.exp < Date.now()) err('That code is wrong or has expired. Request a new one.');
    if (String(pw).length < 8) err('Use a password of at least 8 characters.');
    const u = db.users.find((x) => x.email === email); u.pw = hashPw(email, pw); delete db.resets[email]; save();
  }
  function changePassword(u, oldPw, pw) {
    if (u.pw !== hashPw(u.email, oldPw)) err('Your current password is incorrect.');
    if (String(pw).length < 8) err('Use a password of at least 8 characters.');
    u.pw = hashPw(u.email, pw); save();
  }
  function updateProfile(u, f) { Object.assign(u, { name: f.name || u.name, phone: f.phone, company: f.company, homeAirport: f.homeAirport }); u.prefs = Object.assign(u.prefs || {}, f.prefs || {}); save(); }

  /* ---------- catalogue & search  (GET /aircraft, GET /search) ---------- */
  const operator = (id) => db.operators.find((o) => o.id === id);
  const aircraftById = (id) => db.aircraft.find((a) => a.id === id);
  const listed = () => db.aircraft.filter((a) => a.status === 'verified' && a.active && operator(a.operator)?.verified !== false);
  function overlaps(a1, a2, b1, b2) { return a1 <= b2 && b1 <= a2; }
  function availableOn(ac, dates) {
    const busy = ac.unavailable.map((u) => [u.from, u.to]);
    db.bookings.filter((b) => b.aircraft === ac.id && !['cancelled'].includes(b.status)).forEach((b) => busy.push([b.legs[0].date, b.legs[b.legs.length - 1].date]));
    return dates.every((d) => !busy.some(([f, t]) => overlaps(d, d, f, t)));
  }
  function conflicts(ac, legs) {
    const out = []; const d1 = legs[0].date, d2 = legs[legs.length - 1].date;
    ac.unavailable.forEach((u) => { if (overlaps(d1, d2, u.from, u.to)) out.push(`${u.kind === 'maintenance' ? 'Maintenance' : 'Unavailable'} ${u.from} to ${u.to}${u.note ? ' (' + u.note + ')' : ''}`); });
    db.bookings.filter((b) => b.aircraft === ac.id && b.status !== 'cancelled' && b.status !== 'completed').forEach((b) => { if (overlaps(d1, d2, b.legs[0].date, b.legs[b.legs.length - 1].date)) out.push(`Booked on ${b.id} (${b.legs[0].date})`); });
    return out;
  }
  function search(q) {
    const legs = q.legs.filter((l) => l.from && l.to);
    const res = [], hidden = { range: 0, availability: 0, capacity: 0 };
    listed().forEach((ac) => {
      if (ac.pax < q.pax) { hidden.capacity++; return; }
      const longest = Math.max(...legs.map((l) => distNm(l.from, l.to)));
      if (longest > ac.rangeNm * 0.9) { hidden.range++; return; }
      if (!availableOn(ac, legs.map((l) => l.date).filter(Boolean))) { hidden.availability++; return; }
      const est = estimate(ac, legs);
      res.push({ ac, est, longest });
    });
    return { results: res, hidden, legs };
  }

  /* ---------- favourites / compare ---------- */
  function toggleFav(u, id) { u.favourites = u.favourites || []; const i = u.favourites.indexOf(id); if (i >= 0) u.favourites.splice(i, 1); else u.favourites.push(id); save(); return i < 0; }
  function markViewed(u, id) { if (!u || u.role !== 'customer') return; u.viewed = [id].concat((u.viewed || []).filter((x) => x !== id)).slice(0, 8); save(); }
  function toggleCompare(id) { const c = db.compare; const i = c.indexOf(id); if (i >= 0) c.splice(i, 1); else { if (c.length >= 3) err('Compare up to three aircraft at a time. Remove one first.'); c.push(id); } save(); return i < 0; }

  /* ---------- requests & quotations  (POST /requests, /quotes, PATCH /quotes/:id) ---------- */
  function log(user, text) { db.activity.unshift({ at: now(), user, text }); db.activity = db.activity.slice(0, 80); }
  function createRequest(u, f) {
    if (!f.legs.length || f.legs.some((l) => !airport(l.from) || !airport(l.to))) err('Choose a departure and destination airport for every leg.');
    if (f.legs.some((l) => l.from === l.to)) err('Departure and destination must be different airports.');
    if (f.legs.some((l) => !l.date)) err('Choose a date for every leg.');
    if (f.legs.some((l) => l.date < iso(Date.now()))) err('Travel dates must be today or later.');
    for (let i = 1; i < f.legs.length; i++) if (f.legs[i].date < f.legs[i - 1].date) err('Each leg must depart on or after the previous leg.');
    if (!(f.pax >= 1 && f.pax <= 19)) err('Enter between 1 and 19 passengers.');
    const id = 'REQ-' + (2620 + db.requests.length + Math.floor(Math.random() * 30));
    const r = { id, customer: u.id, created: now(), trip: f.trip, pax: +f.pax, category: f.category || null, preferred: f.preferred || null, legs: f.legs,
      passengers: f.passengers || [], services: (f.services || []).map((s) => ({ id: s.id, note: s.note || '', status: 'pending' })), requirements: f.requirements || '',
      emptyLeg: f.emptyLeg || null, status: 'submitted', log: [] };
    db.requests.unshift(r); log(u.id, `Request ${id} submitted: ${cityOf(r.legs[0].from)} to ${cityOf(r.legs[r.legs.length - 1].to)}`); save(); return r;
  }
  const cityOf = (c) => airport(c)?.city || c;
  function requestsForOperator(opId) {
    const fleet = db.aircraft.filter((a) => a.operator === opId);
    return db.requests.filter((r) => {
      if (r.emptyLeg) { const el = db.emptyLegs.find((e) => e.id === r.emptyLeg); return el && el.operator === opId; }
      if (r.preferred) return fleet.some((a) => a.id === r.preferred) || r.status === 'submitted' || db.quotes.some((q) => q.request === r.id && q.operator === opId);
      return true; // open request visible to every operator
    });
  }
  function markUnderReview(r, opUser) { if (r.status === 'submitted') { r.status = 'under-review'; r.log.push({ at: now(), text: `Under review by ${operator(opUser.operatorId).name}` }); save(); } }
  function sendQuote(opUser, f) {
    const r = db.requests.find((x) => x.id === f.request); const ac = aircraftById(f.aircraft);
    if (!r || !ac || ac.operator !== opUser.operatorId) err('Choose one of your own aircraft for this quotation.');
    if (!f.expires || f.expires < iso(Date.now())) err('Set an expiry date in the future.');
    const lines = f.lines.filter((l) => l.label && !isNaN(l.usd));
    if (!lines.length) err('Add at least one price line.');
    const total = lines.reduce((s, l) => s + Number(l.usd), 0); if (total <= 0) err('The quotation total must be more than zero.');
    let q = f.replaces ? db.quotes.find((x) => x.id === f.replaces) : null;
    const base = { request: r.id, operator: opUser.operatorId, aircraft: ac.id, lines: lines.map((l) => ({ label: l.label, usd: Math.round(+l.usd) })), total: Math.round(total), expires: f.expires, sent: now(), status: 'sent',
      conditions: { depositPct: +f.depositPct || 30, balanceDueDays: +f.balanceDueDays || 3, cancellation: f.cancellation, notes: f.notes }, message: f.message || '' };
    if (q) { q.history.push({ at: now(), version: q.version, total: q.total }); Object.assign(q, base, { version: q.version + 1 }); }
    else { q = Object.assign({ id: 'Q-' + r.id.slice(4) + '-' + String.fromCharCode(65 + db.quotes.filter((x) => x.request === r.id).length), version: 1, history: [] }, base); db.quotes.push(q); }
    r.status = 'quoted'; r.log.push({ at: now(), text: `Quotation ${q.id} v${q.version} issued by ${operator(opUser.operatorId).name}` });
    log(r.customer, `New quotation ${q.id} from ${operator(opUser.operatorId).name} for ${r.id}`); save(); return q;
  }
  function withdrawQuote(q) { q.status = 'withdrawn'; const r = db.requests.find((x) => x.id === q.request); r.log.push({ at: now(), text: `Quotation ${q.id} withdrawn` }); if (!db.quotes.some((x) => x.request === r.id && x.status === 'sent')) r.status = 'under-review'; log(r.customer, `Quotation ${q.id} was withdrawn by the operator`); save(); }
  function declineQuote(u, q, reason) { q.status = 'declined'; q.declineReason = reason || ''; const r = db.requests.find((x) => x.id === q.request); r.log.push({ at: now(), text: `Quotation ${q.id} declined` }); log(u.id, `You declined ${q.id}`); save(); }
  function amendQuote(u, q, msg) { if (!msg || msg.trim().length < 5) err('Tell the operator what to change.'); q.status = 'amendment-requested'; q.amendment = msg.trim(); const r = db.requests.find((x) => x.id === q.request); r.status = 'under-review'; r.log.push({ at: now(), text: `Amendment requested on ${q.id}: ${msg.trim()}` }); save(); }
  function acceptQuote(u, q) {
    if (q.status !== 'sent') err('Only open quotations can be accepted.');
    if (q.expires < iso(Date.now())) { q.status = 'expired'; save(); err('This quotation has expired. Ask the operator for a new one.'); }
    const r = db.requests.find((x) => x.id === q.request); const ac = aircraftById(q.aircraft);
    const c = conflicts(ac, r.legs); if (c.length) err('This aircraft is no longer available for your dates. The operator has been told; please choose another proposal.');
    q.status = 'accepted';
    db.quotes.filter((x) => x.request === r.id && x.id !== q.id && x.status === 'sent').forEach((x) => { x.status = 'superseded'; });
    r.status = 'accepted';
    const b = { id: 'AN-' + (48214 + db.bookings.length + Math.floor(Math.random() * 50)), request: r.id, quote: q.id, customer: u.id, operator: q.operator, aircraft: q.aircraft, created: now(),
      status: 'awaiting-payment', operatorApproved: false, total: q.total, depositPct: q.conditions.depositPct, legs: clone(r.legs), journey: {}, log: [{ at: now(), text: `Booking created from accepted quotation ${q.id}` }] };
    db.bookings.unshift(b); r.log.push({ at: now(), text: `Quotation ${q.id} accepted, booking ${b.id} created` }); log(u.id, `Booking ${b.id} created, deposit due`); save(); return b;
  }

  /* ---------- bookings & payments  (POST /payments, PATCH /bookings/:id) ---------- */
  const GATEWAYS = {
    payfast: { label: 'PayFast', note: 'Card, Instant EFT, SnapScan, Mobicred · ZAR', region: 'ZA' },
    ozow: { label: 'Ozow', note: 'Instant EFT from South African banks · ZAR', region: 'ZA' },
    stripe: { label: 'Stripe', note: 'International cards, Apple Pay, Google Pay · USD/EUR/GBP', region: 'INT' },
    eft: { label: 'Bank transfer', note: 'Manual EFT or SWIFT. Confirmed by our finance team', region: 'ANY' }
  };
  function paid(bId) { return db.payments.filter((p) => p.booking === bId && p.status === 'succeeded').reduce((s, p) => s + p.usd, 0); }
  function refunded(bId) { return db.refunds.filter((r) => r.booking === bId && r.status === 'processed').reduce((s, r) => s + r.usd, 0); }
  function balance(b) { return Math.max(0, b.total - paid(b.id)); }
  function depositDue(b) { return Math.round(b.total * b.depositPct / 100); }
  /* Simulates a hosted-checkout redirect. No card details ever reach this page: the provider collects them. */
  function recordPayment(u, b, provider, kind) {
    if (!GATEWAYS[provider]) err('Choose a payment method.');
    if (['cancelled', 'completed'].includes(b.status)) err('This booking can’t take payments.');
    const usd = kind === 'deposit' ? Math.max(0, depositDue(b) - paid(b.id)) : balance(b);
    if (usd <= 0) err('Nothing is outstanding on this booking.');
    const p = { id: 'PAY-' + (9100 + db.payments.length), booking: b.id, kind, usd, provider, ref: provider.slice(0, 2).toUpperCase() + '-' + Math.floor(1e6 + Math.random() * 9e6), status: provider === 'eft' ? 'pending' : 'succeeded', at: now() };
    db.payments.push(p);
    b.log.push({ at: now(), text: p.status === 'pending' ? `Bank transfer of ${fmtUSD(usd)} awaiting confirmation (${p.ref})` : `Payment received: ${fmtUSD(usd)} via ${GATEWAYS[provider].label} (${p.ref})` });
    log(u.id, `Payment ${p.id} ${p.status === 'pending' ? 'initiated' : 'confirmed'} for ${b.id}`); save(); return p;
  }
  function confirmEft(p) { p.status = 'succeeded'; const b = db.bookings.find((x) => x.id === p.booking); b.log.push({ at: now(), text: `Bank transfer ${p.ref} confirmed` }); save(); }
  /* A booking is confirmed only when the operator has approved it and the deposit has cleared. */
  function canConfirm(b) { const why = []; if (!b.operatorApproved) why.push('operator approval'); if (paid(b.id) < depositDue(b)) why.push('deposit payment'); return why; }
  function setBookingStatus(actor, b, status) {
    const order = ['awaiting-payment', 'confirmed', 'in-preparation', 'completed'];
    if (status === 'confirmed') { const why = canConfirm(b); if (why.length) err('Can’t confirm yet. Still waiting for: ' + why.join(' and ') + '.'); }
    if (status === 'in-preparation') { if (b.status !== 'confirmed') err('Confirm the booking first.'); if (balance(b) > 0) err('The balance must be paid before preparation starts.'); }
    if (status === 'completed' && b.status !== 'in-preparation') err('Only bookings in preparation can be completed.');
    if (order.indexOf(status) < 0) err('Unknown status.');
    b.status = status; b.log.push({ at: now(), text: `Status changed to ${STATUS_LABEL[status]}` }); log(b.customer, `${b.id} is now ${STATUS_LABEL[status].toLowerCase()}`); save();
  }
  function approveBooking(b) { b.operatorApproved = true; b.log.push({ at: now(), text: 'Operator approved the booking (crew, slots and permits in hand)' }); if (!canConfirm(b).length && b.status === 'awaiting-payment') { b.status = 'confirmed'; b.log.push({ at: now(), text: 'Booking confirmed' }); log(b.customer, `${b.id} is confirmed`); } save(); }
  function autoConfirm(b) { if (b.status === 'awaiting-payment' && !canConfirm(b).length) { b.status = 'confirmed'; b.log.push({ at: now(), text: 'Booking confirmed' }); log(b.customer, `${b.id} is confirmed`); save(); return true; } return false; }
  function requestChange(u, b, kind, text) {
    if (!text || text.trim().length < 5) err('Describe the change you need.');
    b.changeRequest = { kind, text: text.trim(), at: now(), status: 'open' }; b.log.push({ at: now(), text: (kind === 'cancel' ? 'Cancellation requested: ' : 'Modification requested: ') + text.trim() }); log(u.id, `${kind === 'cancel' ? 'Cancellation' : 'Change'} requested for ${b.id}`); save();
  }
  function refundFor(b) {
    const days = Math.round((new Date(b.legs[0].date) - Date.now()) / DAY); const p = paid(b.id);
    const pct = days > 14 ? 0.9 : days >= 7 ? 0.5 : 0; return { days, pct, usd: Math.round(p * pct) };
  }
  function resolveChange(b, approve, note) {
    const cr = b.changeRequest; if (!cr) return;
    cr.status = approve ? 'approved' : 'declined'; cr.reply = note || '';
    if (approve && cr.kind === 'cancel') {
      const r = refundFor(b); b.status = 'cancelled';
      if (r.usd > 0) db.refunds.push({ id: 'RF-' + (300 + db.refunds.length), booking: b.id, usd: r.usd, reason: `Cancellation ${r.days} days before departure (${Math.round(r.pct * 100)}% policy)`, status: 'processed', at: now() });
      b.log.push({ at: now(), text: `Cancelled. Refund ${fmtUSD(r.usd)} under the cancellation policy` });
    } else b.log.push({ at: now(), text: `${cr.kind === 'cancel' ? 'Cancellation' : 'Modification'} ${approve ? 'approved' : 'declined'}${note ? ': ' + note : ''}` });
    log(b.customer, `Your ${cr.kind === 'cancel' ? 'cancellation' : 'change'} request on ${b.id} was ${approve ? 'approved' : 'declined'}`); save();
  }

  const STATUS_LABEL = { 'submitted': 'Request submitted', 'under-review': 'Under review', 'quoted': 'Quotation issued', 'awaiting-acceptance': 'Awaiting customer acceptance',
    'awaiting-payment': 'Awaiting payment', 'confirmed': 'Confirmed', 'in-preparation': 'In preparation', 'completed': 'Completed', 'cancelled': 'Cancelled', 'accepted': 'Accepted' };
  const LIFECYCLE = ['submitted', 'under-review', 'quoted', 'awaiting-acceptance', 'awaiting-payment', 'confirmed', 'in-preparation', 'completed'];
  function lifecycleOf(r) {
    const b = db.bookings.find((x) => x.request === r.id);
    if (b) return b.status;
    if (r.status === 'quoted') return 'awaiting-acceptance';
    return r.status;
  }

  /* ---------- operator: fleet, availability, empty legs ---------- */
  function saveAircraft(opUser, f) {
    const isNew = !f.id; const ac = isNew ? { id: uid('ac'), operator: opUser.operatorId, status: 'draft', active: false, photos: [], docs: [], unavailable: [], amenities: [] } : aircraftById(f.id);
    if (!ac || ac.operator !== opUser.operatorId) err('You can only edit your own aircraft.');
    ['reg', 'name', 'manufacturer', 'model', 'category', 'base', 'blurb'].forEach((k) => { if (f[k] !== undefined) ac[k] = String(f[k]).trim(); });
    ['year', 'pax', 'rangeNm', 'cruiseKt', 'luggageM3', 'hourlyUSD'].forEach((k) => { if (f[k] !== undefined && f[k] !== '') ac[k] = Number(f[k]); });
    ac.cabin = { length: +f.cabinLength || ac.cabin?.length || 0, width: +f.cabinWidth || ac.cabin?.width || 0, height: +f.cabinHeight || ac.cabin?.height || 0 };
    if (f.amenities) ac.amenities = f.amenities;
    if (!ac.reg || !ac.manufacturer || !ac.model) err('Registration, manufacturer and model are required.');
    if (!(ac.pax > 0) || !(ac.rangeNm > 0) || !(ac.cruiseKt > 0) || !(ac.hourlyUSD > 0)) err('Capacity, range, cruise speed and hourly rate must all be more than zero.');
    if (!ac.name) ac.name = ac.model;
    if (!isNew && ac.status === 'verified' && f.specChanged) { ac.status = 'pending'; }
    if (isNew) db.aircraft.push(ac); save(); return ac;
  }
  function submitForVerification(ac) { if (!ac.docs.length) err('Upload at least the Certificate of Airworthiness before submitting.'); ac.status = 'pending'; save(); }
  function setListing(ac, active) { if (active && ac.status !== 'verified') err('Only verified aircraft can be listed.'); ac.active = active; save(); }
  function addUnavailable(ac, f) { if (!f.from || !f.to || f.to < f.from) err('Choose a start date and an end date on or after it.'); ac.unavailable.push({ id: uid('un'), from: f.from, to: f.to, kind: f.kind || 'unavailable', note: f.note || '' }); ac.unavailable.sort((a, b) => a.from.localeCompare(b.from)); save(); }
  function removeUnavailable(ac, id) { ac.unavailable = ac.unavailable.filter((u) => u.id !== id); save(); }
  function saveEmptyLeg(opUser, f) {
    const ac = aircraftById(f.aircraft); if (!ac || ac.operator !== opUser.operatorId) err('Choose one of your aircraft.');
    if (!airport(f.from) || !airport(f.to) || f.from === f.to) err('Choose two different airports.');
    if (!f.date || f.date < iso(Date.now())) err('Choose a future departure date.');
    if (!(+f.seats > 0 && +f.seats <= ac.pax)) err(`Seats must be between 1 and ${ac.pax} for this aircraft.`);
    if (!(+f.usd > 0)) err('Set an advertised price.');
    db.emptyLegs.unshift({ id: uid('EL'), operator: opUser.operatorId, aircraft: ac.id, from: f.from, to: f.to, date: f.date, time: f.time || '', seats: +f.seats, usd: +f.usd, flexible: f.flexible || '', expires: f.expires || f.date, status: 'published', created: now() });
    save();
  }
  function setServiceStatus(r, idx, status) { r.services[idx].status = status; r.log.push({ at: now(), text: `Service ${D.SERVICES.find((s) => s.id === r.services[idx].id).label}: ${status}` }); save(); }

  /* ---------- enquiries (POST /enquiries) ---------- */
  function addEnquiry(f) {
    db.enquiries = db.enquiries || [];
    const e = { id: 'ENQ-' + (1040 + db.enquiries.length), name: String(f.name).trim(), email: String(f.email).trim(), phone: String(f.phone).trim(), arriving: String(f.arriving).trim(), code: f.code || '', at: now(), status: 'new' };
    db.enquiries.unshift(e); save(); return e;
  }

  /* ---------- admin ---------- */
  function verifyAircraft(ac, ok) { ac.status = ok ? 'verified' : 'rejected'; if (ok) ac.active = true; save(); }
  function verifyOperator(op, ok) { op.verified = ok; save(); }
  function setRole(u, role) { u.role = role; save(); }
  function setDisabled(u, v) { u.disabled = v; save(); }

  window.AN_STORE = {
    get db() { return db; }, save, reset, iso, day, uid, now, airport, distNm, estimate, money, fmtUSD, RATES, GATEWAYS, STATUS_LABEL, LIFECYCLE, lifecycleOf, cityOf,
    currentUser, login, logout, register, requestReset, completeReset, changePassword, updateProfile,
    operator, aircraftById, listed, search, conflicts, availableOn, toggleFav, markViewed, toggleCompare,
    createRequest, requestsForOperator, markUnderReview, sendQuote, withdrawQuote, declineQuote, amendQuote, acceptQuote,
    paid, refunded, balance, depositDue, recordPayment, confirmEft, canConfirm, setBookingStatus, approveBooking, autoConfirm, requestChange, refundFor, resolveChange,
    saveAircraft, submitForVerification, setListing, addUnavailable, removeUnavailable, saveEmptyLeg, setServiceStatus,
    verifyAircraft, verifyOperator, setRole, setDisabled, expireQuotes, addEnquiry
  };
})();
