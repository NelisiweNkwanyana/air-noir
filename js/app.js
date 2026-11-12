/* AIR NOIR — booking platform views (hash-routed overlay on top of the cinematic site). */
(function () {
  const S = window.AN_STORE, D = window.AN_DATA, ART = window.AN_ART;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = () => S.currentUser();
  let guestCurrency = 'ZAR';
  const cur = () => (user()?.prefs?.currency) || guestCurrency;
  const money = (usd) => S.money(usd, cur());
  const fmtDate = (d, withYear = true) => { if (!d) return '—'; const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: withYear ? 'numeric' : undefined }); };
  const fmtDT = (d) => { const x = new Date(d); return x.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' · ' + x.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }); };
  const ap = (c) => { const a = S.airport(c); return a ? `${a.city} <span class="code">${a.iata}</span>` : h(c); };
  const apText = (c) => { const a = S.airport(c); return a ? `${a.name} (${a.iata})` : c || ''; };
  const catLabel = (id) => D.CATEGORIES.find((c) => c.id === id)?.label || 'Any category';
  const svcLabel = (id) => D.SERVICES.find((s) => s.id === id)?.label || id;
  const opName = (id) => S.operator(id)?.name || '—';
  const route = (r) => r.legs.map((l) => S.airport(l.from)?.iata).concat(S.airport(r.legs[r.legs.length - 1].to)?.iata).join(' → ');

  const PILL = { 'submitted': 'info', 'under-review': 'info', 'quoted': 'gold', 'awaiting-acceptance': 'gold', 'awaiting-payment': 'warn', 'confirmed': 'ok', 'in-preparation': 'ok', 'completed': 'mute', 'cancelled': 'bad', 'accepted': 'ok',
    'sent': 'gold', 'declined': 'bad', 'withdrawn': 'mute', 'expired': 'mute', 'superseded': 'mute', 'amendment-requested': 'warn', 'verified': 'ok', 'pending': 'warn', 'draft': 'mute', 'rejected': 'bad',
    'approved': 'ok', 'succeeded': 'ok', 'processed': 'ok', 'published': 'ok', 'withdrawn-el': 'mute' };
  const QLABEL = { sent: 'Awaiting your decision', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired', superseded: 'Not selected', 'amendment-requested': 'Amendment requested' };
  const pill = (st, label) => `<span class="pill pill-${PILL[st] || 'mute'}">${h(label || S.STATUS_LABEL[st] || QLABEL[st] || st)}</span>`;

  /* ---------------- shell ---------------- */
  const app = $('#app'), main = $('#appMain'), scroller = $('#appScroll');
  const APP_ROUTES = /^(search|fleet|aircraft-.+|compare|empty-legs|signin|register|reset|new-request|account.*|request-.+|booking-.+|operator.*|admin.*)$/;
  let lastRoute = '', appOpen = false, closeT = 0;
  function current() { return decodeURIComponent(location.hash.slice(1)); }
  function go(r) { if (current() === r) render(); else location.hash = r; }
  function toast(msg, kind) {
    const t = document.createElement('div'); t.className = 'toast' + (kind ? ' toast-' + kind : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    $('#toasts').appendChild(t); requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 3600);
  }
  function modal(html, cls) {
    const m = $('#modal'); $('#modalBody').innerHTML = html; m.className = 'modal ' + (cls || ''); m.hidden = false;
    requestAnimationFrame(() => m.classList.add('on')); setTimeout(() => $('#modalBody [autofocus], #modalBody input, #modalBody button')?.focus(), 60);
  }
  function closeModal() { const m = $('#modal'); m.classList.remove('on'); setTimeout(() => { m.hidden = true; }, 250); }
  function attempt(fn, ok) { try { const r = fn(); if (ok) toast(ok); return r === undefined ? true : r; } catch (e) { if (e.user) toast(e.message, 'bad'); else { console.error(e); toast('Something went wrong. Please try again.', 'bad'); } return false; } }

  function render() {
    const r = current();
    document.body.classList.toggle('in-app', APP_ROUTES.test(r));
    if (!APP_ROUTES.test(r)) { if (appOpen) { appOpen = false; app.classList.remove('on'); clearTimeout(closeT); closeT = setTimeout(() => { app.hidden = true; }, 350); window.AN_LANDING?.resume(); } updateNav(); return; }
    clearTimeout(closeT);
    if (!appOpen) { appOpen = true; app.hidden = false; requestAnimationFrame(() => app.classList.add('on')); window.AN_LANDING?.pause(); }
    S.expireQuotes();
    let html;
    try { html = view(r); } catch (e) { console.error(e); html = `<div class="app-head"><h1>Page unavailable</h1><p class="muted">This page couldn’t be shown. <a href="#account">Go to your dashboard</a>.</p></div>`; }
    main.innerHTML = html;
    if (r !== lastRoute) scroller.scrollTop = 0; lastRoute = r;
    updateNav(); afterRender(r);
    $('#appMain h1')?.focus({ preventScroll: true });
  }
  function updateNav() {
    const u = user(); const el = $('#navAccount');
    if (!el) return;
    if (u) el.innerHTML = `<a class="nav-acct" href="#${u.role === 'operator' ? 'operator' : u.role === 'admin' ? 'admin' : 'account'}"><span class="dot"></span>${h(u.name.split(' ')[0])}</a>`;
    else el.innerHTML = `<a class="nav-acct" href="#signin">Sign in</a>`;
  }
  function need(role, r) {
    const u = user();
    if (!u) { sessionStorageSet('an-return', r); return { redirect: `<div class="app-head narrow"><p class="eyebrow">Members</p><h1 tabindex="-1">Sign in to continue</h1><p class="muted">This page belongs to your AIR NOIR account.</p><div class="row"><a class="btn btn-gold" href="#signin">Sign in</a><a class="btn" href="#register">Create an account</a></div></div>` }; }
    if (role && u.role !== role && !(role === 'customer' && u.role === 'admin')) return { redirect: `<div class="app-head narrow"><h1 tabindex="-1">Not available for this account</h1><p class="muted">You’re signed in as ${h(u.email)} (${h(u.role)}). This area is for ${role}s.</p><div class="row"><a class="btn" href="#${u.role === 'operator' ? 'operator' : u.role === 'admin' ? 'admin' : 'account'}">Go to my dashboard</a><button class="btn btn-ghost" data-act="logout">Sign out</button></div></div>` };
    return { u };
  }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  function view(r) {
    if (r === 'search') return vSearch();
    if (r === 'fleet') return vFleet();
    if (r.startsWith('aircraft-')) return vAircraft(r.slice(9));
    if (r === 'compare') return vCompare();
    if (r === 'empty-legs') return vEmptyLegs();
    if (r === 'signin') return vSignin();
    if (r === 'register') return vRegister();
    if (r === 'reset') return vReset();
    if (r === 'new-request') { const g = need(null, r); return g.redirect || vNewRequest(g.u); }
    if (r.startsWith('request-')) { const g = need(null, r); return g.redirect || vRequest(g.u, r.slice(8)); }
    if (r.startsWith('booking-')) { const g = need(null, r); return g.redirect || vBooking(g.u, r.slice(8)); }
    if (r.startsWith('account')) { const g = need('customer', r); return g.redirect || vAccount(g.u, r.slice(8) || 'overview'); }
    if (r.startsWith('operator')) { const g = need('operator', r); return g.redirect || vOperator(g.u, r.slice(9) || 'overview'); }
    if (r.startsWith('admin')) { const g = need('admin', r); return g.redirect || vAdmin(g.u, r.slice(6) || 'overview'); }
    return '';
  }

  /* ---------------- shared components ---------------- */
  function apField(id, code, label, attrs) {
    return `<div class="field ap"><label for="${id}">${label}</label><input id="${id}" class="ap-input" autocomplete="off" placeholder="City, airport or code" value="${h(code ? apText(code) : '')}" data-code="${h(code || '')}" ${attrs || ''}><div class="ap-menu" role="listbox" hidden></div></div>`;
  }
  function acArt(ac, cls) {
    if (ac.photos && ac.photos[0]) return `<div class="ac-art ${cls || ''} has-photo"><img src="${ac.photos[0]}" alt="${h(ac.manufacturer + ' ' + ac.model)} exterior" loading="lazy"></div>`;
    return `<div class="ac-art ${cls || ''}">${ART.jetTop({ label: ac.manufacturer + ' ' + ac.model + ', top view', small: true })}</div>`;
  }
  function specLine(ac) { return `<dl class="specs"><div><dt>Guests</dt><dd>${ac.pax}</dd></div><div><dt>Range</dt><dd>${ac.rangeNm.toLocaleString()} nm</dd></div><div><dt>Cruise</dt><dd>${ac.cruiseKt} kt</dd></div><div><dt>Cabin</dt><dd>${ac.cabin.height.toFixed(2)} m tall</dd></div></dl>`; }
  function favBtn(ac) { const on = user()?.favourites?.includes(ac.id); return `<button class="icon-btn ${on ? 'on' : ''}" data-act="fav" data-id="${ac.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved aircraft' : 'Save aircraft'}"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4"/></svg></button>`; }
  function cmpBtn(ac) { const on = S.db.compare.includes(ac.id); return `<button class="btn btn-sm ${on ? 'btn-on' : 'btn-ghost'}" data-act="compare" data-id="${ac.id}" aria-pressed="${on}">${on ? 'In comparison' : 'Compare'}</button>`; }
  function acCard(ac, extra) {
    return `<article class="ac-card">${acArt(ac)}<div class="ac-body"><div class="ac-top"><div><p class="eyebrow">${h(catLabel(ac.category))} · ${h(opName(ac.operator))}</p><h3><a href="#aircraft-${ac.id}">${h(ac.manufacturer)} ${h(ac.model)}</a></h3><p class="muted small">${h(ac.reg)} · based at ${ap(ac.base)}</p></div>${favBtn(ac)}</div>${specLine(ac)}${extra || ''}<div class="row"><a class="btn btn-sm" href="#aircraft-${ac.id}">View aircraft</a>${cmpBtn(ac)}</div></div></article>`;
  }
  function compareBar() {
    const c = S.db.compare; if (!c.length) return '';
    return `<div class="compare-bar"><span>${c.length} aircraft selected</span><span class="muted">${c.map((id) => h(S.aircraftById(id)?.model)).join(' · ')}</span><a class="btn btn-sm btn-gold" href="#compare">Compare side by side</a></div>`;
  }
  function timeline(state, cancelled) {
    const steps = S.LIFECYCLE; const idx = steps.indexOf(state);
    return `<ol class="timeline ${cancelled ? 'is-cancelled' : ''}">${steps.map((s, i) => `<li class="${i < idx || state === 'completed' ? 'done' : i === idx ? 'now' : ''}"><span>${S.STATUS_LABEL[s]}</span></li>`).join('')}${cancelled ? '<li class="now bad"><span>Cancelled</span></li>' : ''}</ol>`;
  }
  function itinerary(legs) {
    return `<ol class="legs">${legs.map((l) => `<li><div class="leg-route"><b>${ap(l.from)}</b><span class="leg-line" aria-hidden="true"></span><b>${ap(l.to)}</b></div><div class="muted small">${fmtDate(l.date)}${l.time ? ' · ' + h(l.time) + ' local' : ''} · ${S.distNm(l.from, l.to).toLocaleString()} nm</div></li>`).join('')}</ol>`;
  }
  function dashShell(kind, active, content, u) {
    const nav = {
      account: [['overview', 'Overview'], ['flights', 'My flights'], ['quotes', 'My quotations'], ['saved', 'Saved aircraft'], ['payments', 'Payments'], ['profile', 'Profile']],
      operator: [['overview', 'Overview'], ['requests', 'Requests'], ['bookings', 'Bookings'], ['fleet', 'Fleet'], ['availability', 'Availability'], ['empty-legs', 'Empty legs'], ['services', 'Services']],
      admin: [['overview', 'Overview'], ['verification', 'Verification'], ['users', 'Users']]
    }[kind];
    const who = kind === 'operator' ? opName(u.operatorId) : u.name;
    return `<div class="dash"><aside class="dash-side"><p class="eyebrow">${kind === 'account' ? 'Client' : kind === 'operator' ? 'Operator portal' : 'Administration'}</p><p class="dash-who">${h(who)}</p><nav aria-label="Dashboard">${nav.map(([k, l]) => `<a href="#${kind}${k === 'overview' ? '' : '-' + k}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav><button class="btn btn-ghost btn-sm" data-act="logout">Sign out</button></aside><section class="dash-main">${content}</section></div>`;
  }
  const kpi = (label, value, note) => `<div class="kpi"><span class="kpi-l">${label}</span><span class="kpi-v">${value}</span>${note ? `<span class="kpi-n">${note}</span>` : ''}</div>`;
  const empty = (title, body, action) => `<div class="empty"><p class="empty-t">${title}</p><p class="muted">${body}</p>${action || ''}</div>`;

  /* ---------------- search ---------------- */
  const SS = { trip: 'one-way', legs: [{ from: 'HLA', to: 'CPT', date: S.day(7), time: '09:00' }], pax: 2, category: '', requirements: '', sort: 'price', f: { cats: [], minRange: 0, maxPrice: 0, base: '', amenities: [] }, ran: true };
  window.AN_SEARCH_PREFILL = (o) => { Object.assign(SS, o); if (o.legs) SS.legs = o.legs; SS.ran = true; };
  function legsEditor(prefix, legs, trip) {
    return `<div class="legs-ed" data-legs="${prefix}">${legs.map((l, i) => `<div class="leg-row"><span class="leg-n">${trip === 'multi-city' ? 'Leg ' + (i + 1) : trip === 'return' ? (i ? 'Return' : 'Outbound') : 'Flight'}</span>
      ${apField(`${prefix}-from-${i}`, l.from, 'From', `data-leg="${i}" data-k="from" data-scope="${prefix}" ${trip === 'return' && i === 1 ? 'disabled' : ''}`)}
      ${apField(`${prefix}-to-${i}`, l.to, 'To', `data-leg="${i}" data-k="to" data-scope="${prefix}" ${trip === 'return' && i === 1 ? 'disabled' : ''}`)}
      <div class="field"><label for="${prefix}-date-${i}">Date</label><input type="date" id="${prefix}-date-${i}" value="${h(l.date)}" min="${S.day(0)}" data-leg="${i}" data-k="date" data-scope="${prefix}"></div>
      <div class="field f-time"><label for="${prefix}-time-${i}">Time</label><input type="time" id="${prefix}-time-${i}" value="${h(l.time || '')}" data-leg="${i}" data-k="time" data-scope="${prefix}"></div>
      ${trip === 'multi-city' && legs.length > 2 ? `<button type="button" class="icon-btn" data-act="leg-del" data-scope="${prefix}" data-i="${i}" aria-label="Remove leg ${i + 1}">×</button>` : ''}</div>`).join('')}
      ${trip === 'multi-city' && legs.length < 6 ? `<button type="button" class="btn btn-sm btn-ghost" data-act="leg-add" data-scope="${prefix}">Add a leg</button>` : ''}</div>`;
  }
  function tripSwitch(prefix, trip) {
    return `<div class="seg" role="radiogroup" aria-label="Journey type">${[['one-way', 'One way'], ['return', 'Return'], ['multi-city', 'Multi-city']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${trip === v}" class="${trip === v ? 'on' : ''}" data-act="trip" data-scope="${prefix}" data-v="${v}">${l}</button>`).join('')}</div>`;
  }
  function setTrip(state, v) {
    state.trip = v;
    if (v === 'one-way') state.legs = [state.legs[0]];
    if (v === 'return') { const a = state.legs[0]; state.legs = [a, { from: a.to, to: a.from, date: state.legs[1]?.date || S.day(14), time: state.legs[1]?.time || '' }]; }
    if (v === 'multi-city' && state.legs.length < 2) { const a = state.legs[0]; state.legs = [a, { from: a.to, to: '', date: '', time: '' }]; }
  }
  function syncReturn(state) { if (state.trip === 'return' && state.legs[1]) { state.legs[1].from = state.legs[0].to; state.legs[1].to = state.legs[0].from; } }

  function vSearch() {
    const res = SS.ran ? S.search({ pax: +SS.pax, legs: SS.legs }) : null;
    let list = res ? res.results.slice() : [];
    const f = SS.f;
    if (SS.category) list = list.filter((x) => x.ac.category === SS.category);
    if (f.cats.length) list = list.filter((x) => f.cats.includes(x.ac.category));
    if (f.minRange) list = list.filter((x) => x.ac.rangeNm >= f.minRange);
    if (f.maxPrice) list = list.filter((x) => x.est.total * S.RATES[cur()] <= f.maxPrice);
    if (f.base) list = list.filter((x) => x.ac.base === f.base);
    if (f.amenities.length) list = list.filter((x) => f.amenities.every((a) => x.ac.amenities.includes(a)));
    const sorters = { price: (a, b) => a.est.total - b.est.total, 'price-desc': (a, b) => b.est.total - a.est.total, range: (a, b) => b.ac.rangeNm - a.ac.rangeNm, capacity: (a, b) => b.ac.pax - a.ac.pax, speed: (a, b) => b.ac.cruiseKt - a.ac.cruiseKt };
    list.sort(sorters[SS.sort] || sorters.price);
    const bases = [...new Set(S.listed().map((a) => a.base))];
    const hiddenTxt = res ? Object.entries(res.hidden).filter(([, n]) => n).map(([k, n]) => `${n} hidden: ${k === 'range' ? 'not enough range' : k === 'capacity' ? 'too few seats' : 'not available on your dates'}`).join(' · ') : '';
    return `<div class="app-head"><p class="eyebrow">Charter search</p><h1 tabindex="-1">Find your aircraft</h1><p class="muted">Search airports by name, city or IATA/ICAO code. Results only include verified aircraft that are free on your dates and can fly your longest leg.</p></div>
    <form class="panel search-form" data-form="search" novalidate>
      <div class="row between">${tripSwitch('s', SS.trip)}<div class="row"><label class="inline" for="s-cur">Currency</label><select id="s-cur" data-act-change="currency">${Object.keys(S.RATES).map((c) => `<option ${c === cur() ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
      ${legsEditor('s', SS.legs, SS.trip)}
      <div class="grid-3">
        <div class="field"><label for="s-pax">Passengers</label><input type="number" id="s-pax" min="1" max="19" value="${h(SS.pax)}"></div>
        <div class="field"><label for="s-cat">Preferred aircraft category</label><select id="s-cat"><option value="">Any category</option>${D.CATEGORIES.map((c) => `<option value="${c.id}" ${SS.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
        <div class="field"><label for="s-req">Additional requirements</label><input id="s-req" value="${h(SS.requirements)}" placeholder="Pets, medical equipment, ski bags…"></div>
      </div>
      <div class="row end"><button class="btn btn-gold" type="submit">Search aircraft</button></div>
    </form>
    ${res ? `<div class="results">
      <aside class="filters panel" aria-label="Filter results">
        <p class="eyebrow">Filter</p>
        <fieldset><legend>Category</legend>${D.CATEGORIES.map((c) => `<label class="check"><input type="checkbox" data-filter="cats" value="${c.id}" ${f.cats.includes(c.id) ? 'checked' : ''}> ${c.label}</label>`).join('')}</fieldset>
        <div class="field"><label for="f-range">Minimum range (nm)</label><input type="number" id="f-range" step="250" min="0" data-filter="minRange" value="${f.minRange || ''}" placeholder="Any"></div>
        <div class="field"><label for="f-price">Maximum estimate (${cur()})</label><input type="number" id="f-price" step="10000" min="0" data-filter="maxPrice" value="${f.maxPrice || ''}" placeholder="Any"></div>
        <div class="field"><label for="f-base">Aircraft based at</label><select id="f-base" data-filter="base"><option value="">Anywhere</option>${bases.map((b) => `<option value="${b}" ${f.base === b ? 'selected' : ''}>${h(apText(b))}</option>`).join('')}</select></div>
        <fieldset><legend>Amenities</legend>${D.AMENITIES.map((a) => `<label class="check"><input type="checkbox" data-filter="amenities" value="${h(a)}" ${f.amenities.includes(a) ? 'checked' : ''}> ${h(a)}</label>`).join('')}</fieldset>
        <button class="btn btn-sm btn-ghost" data-act="clear-filters" type="button">Clear filters</button>
      </aside>
      <div class="result-list">
        <div class="row between result-head"><p><b>${list.length}</b> aircraft for ${h(route({ legs: res.legs }))} · ${SS.pax} passenger${SS.pax > 1 ? 's' : ''}${hiddenTxt ? `<br><span class="muted small">${hiddenTxt}</span>` : ''}</p>
          <div class="row"><label class="inline" for="s-sort">Sort by</label><select id="s-sort" data-act-change="sort">${[['price', 'Lowest estimate'], ['price-desc', 'Highest estimate'], ['range', 'Longest range'], ['capacity', 'Most seats'], ['speed', 'Fastest']].map(([v, l]) => `<option value="${v}" ${SS.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        ${list.length ? list.map((x) => acCard(x.ac, `<div class="estimate"><span class="muted small">Estimated total · ${x.est.flightH.toFixed(1)} h flying</span><b>${money(x.est.total * 0.95)} – ${money(x.est.total * 1.08)}</b><button class="btn btn-sm btn-gold" data-act="quote-from-search" data-id="${x.ac.id}">Request quotation</button></div>`)).join('')
        : empty('No aircraft match these filters', 'Clear a filter or change the dates. Empty-leg flights may also suit you.', '<a class="btn btn-sm" href="#empty-legs">See empty legs</a>')}
        <p class="muted small">Estimates include flight time, positioning, landing and handling fees${res.legs.length > 1 ? ', crew overnights' : ''} and VAT on domestic South African flights. The operator’s quotation is binding, the estimate is not.</p>
      </div></div>` : ''}${compareBar()}`;
  }

  /* ---------------- fleet ---------------- */
  let fleetCat = '';
  function vFleet() {
    const all = S.listed().filter((a) => !fleetCat || a.category === fleetCat);
    return `<div class="app-head"><p class="eyebrow">The fleet</p><h1 tabindex="-1">Aircraft catalogue</h1><p class="muted">${S.listed().length} verified aircraft from ${new Set(S.listed().map((a) => a.operator)).size} operators. Save the ones you like and compare up to three side by side.</p></div>
    <div class="chips" role="group" aria-label="Filter by category"><button class="chip ${!fleetCat ? 'on' : ''}" data-act="fleet-cat" data-v="">All</button>${D.CATEGORIES.map((c) => `<button class="chip ${fleetCat === c.id ? 'on' : ''}" data-act="fleet-cat" data-v="${c.id}">${c.label}</button>`).join('')}</div>
    <div class="ac-grid">${all.map((ac) => acCard(ac, `<p class="muted small">From ${money(ac.hourlyUSD)} per flight hour</p>`)).join('')}</div>${compareBar()}`;
  }
  function vAircraft(id) {
    const ac = S.aircraftById(id); if (!ac) return empty('Aircraft not found', 'It may have been withdrawn from the catalogue.', '<a class="btn btn-sm" href="#fleet">Back to the fleet</a>');
    const u = user(); if (u) S.markViewed(u, id);
    const op = S.operator(ac.operator);
    const sample = S.estimate(ac, [{ from: 'HLA', to: 'CPT', date: S.day(10) }]);
    const next = ac.unavailable.filter((x) => x.to >= S.day(0));
    const photos = ac.photos || [];
    return `<a class="back" href="#fleet">← Fleet</a>
    <div class="ac-hero"><div class="ac-hero-art">${photos[0] ? `<img src="${photos[0]}" alt="${h(ac.model)} exterior">` : ART.jetTop({ label: ac.manufacturer + ' ' + ac.model })}</div>
      <div class="ac-hero-txt"><p class="eyebrow">${h(catLabel(ac.category))} · ${h(ac.reg)}</p><h1 tabindex="-1">${h(ac.manufacturer)}<br>${h(ac.model)}</h1><p class="lead">${h(ac.blurb || '')}</p>
      <div class="row">${favBtn(ac)}${cmpBtn(ac)}<button class="btn btn-gold" data-act="quote-ac" data-id="${ac.id}">Request quotation</button></div>
      ${ac.status !== 'verified' ? `<p class="note">This aircraft is ${h(ac.status)} and not yet bookable.</p>` : ''}</div></div>
    <div class="grid-2 gap-l">
      <section class="panel"><h2>Specifications</h2><table class="kv"><tbody>
        ${[['Manufacturer', ac.manufacturer], ['Model', ac.model], ['Category', catLabel(ac.category)], ['Year of manufacture', ac.year], ['Passenger capacity', ac.pax + ' guests'], ['Maximum range', ac.rangeNm.toLocaleString() + ' nm (' + Math.round(ac.rangeNm * 1.852).toLocaleString() + ' km)'], ['Cruising speed', ac.cruiseKt + ' kt (' + Math.round(ac.cruiseKt * 1.852) + ' km/h)'], ['Cabin length × width × height', `${ac.cabin.length} × ${ac.cabin.width} × ${ac.cabin.height} m`], ['Luggage capacity', ac.luggageM3 + ' m³'], ['Home base', apText(ac.base)]].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${h(v)}</td></tr>`).join('')}
      </tbody></table></section>
      <section class="panel"><h2>Onboard</h2><ul class="amen">${D.AMENITIES.map((a) => `<li class="${ac.amenities.includes(a) ? 'yes' : 'no'}">${h(a)}</li>`).join('')}</ul>
        <h2 class="mt">Estimated charter pricing</h2><p class="price-big">${money(ac.hourlyUSD)} <span class="muted small">per flight hour</span></p>
        <p class="muted small">Example: Lanseria to Cape Town one way, about ${money(sample.total)} including positioning, fees and VAT.</p></section>
    </div>
    <section class="panel"><h2>Photography</h2><div class="gallery">
      ${photos.length ? photos.map((p, i) => `<figure><img src="${p}" alt="${h(ac.model)} photo ${i + 1}" loading="lazy"></figure>`).join('') : `<figure class="ph"><div class="ac-art">${ART.jetTop({ small: true })}</div><figcaption>Exterior</figcaption></figure><figure class="ph"><div class="ac-art bp">${ART.blueprint()}</div><figcaption>Cabin layout</figcaption></figure><figure class="ph ph-note"><figcaption>Interior photography is supplied by the operator after verification.</figcaption></figure>`}
    </div></section>
    <div class="grid-2 gap-l">
      <section class="panel"><h2>Operator</h2><p class="lead">${h(op?.name)}</p><p class="muted">Air operator certificate ${h(op?.aoc)} · flying since ${h(op?.since)} · based at ${ap(op?.base)}</p>${op?.verified ? pill('verified', 'Verified operator') : pill('pending', 'Verification pending')}</section>
      <section class="panel"><h2>Availability</h2>${next.length ? `<ul class="plain">${next.map((x) => `<li>${pill(x.kind === 'maintenance' ? 'pending' : 'mute', x.kind === 'maintenance' ? 'Maintenance' : 'Unavailable')} ${fmtDate(x.from, false)} – ${fmtDate(x.to)}</li>`).join('')}</ul>` : '<p class="muted">No blocked dates in the operator’s schedule.</p>'}<p class="muted small">Confirmed bookings also block dates. Search with your dates to check.</p></section>
    </div>${compareBar()}`;
  }
  function vCompare() {
    const list = S.db.compare.map(S.aircraftById).filter(Boolean);
    if (!list.length) return `<div class="app-head"><h1 tabindex="-1">Compare aircraft</h1></div>` + empty('Nothing to compare yet', 'Choose “Compare” on up to three aircraft in the fleet or in search results.', '<a class="btn btn-sm" href="#fleet">Browse the fleet</a>');
    const rows = [['Category', (a) => catLabel(a.category)], ['Operator', (a) => opName(a.operator)], ['Guests', (a) => a.pax], ['Range', (a) => a.rangeNm.toLocaleString() + ' nm'], ['Cruise speed', (a) => a.cruiseKt + ' kt'], ['Cabin (L × W × H)', (a) => `${a.cabin.length} × ${a.cabin.width} × ${a.cabin.height} m`], ['Luggage', (a) => a.luggageM3 + ' m³'], ['Hourly rate (est.)', (a) => money(a.hourlyUSD)], ['Base', (a) => apText(a.base)], ['Year', (a) => a.year]];
    const best = { Guests: Math.max(...list.map((a) => a.pax)), Range: Math.max(...list.map((a) => a.rangeNm)) };
    return `<div class="app-head"><p class="eyebrow">Side by side</p><h1 tabindex="-1">Compare aircraft</h1></div>
    <div class="table-wrap"><table class="cmp"><thead><tr><th></th>${list.map((a) => `<th scope="col"><div class="ac-art sm">${ART.jetTop({ small: true })}</div><a href="#aircraft-${a.id}">${h(a.manufacturer)} ${h(a.model)}</a><br><button class="link" data-act="compare" data-id="${a.id}">Remove</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([l, fn]) => `<tr><th scope="row">${l}</th>${list.map((a) => `<td class="${(l === 'Guests' && a.pax === best.Guests) || (l === 'Range' && a.rangeNm === best.Range) ? 'best' : ''}">${h(fn(a))}</td>`).join('')}</tr>`).join('')}
    <tr><th scope="row">Amenities</th>${list.map((a) => `<td><ul class="plain small">${a.amenities.map((x) => `<li>${h(x)}</li>`).join('')}</ul></td>`).join('')}</tr>
    <tr><th></th>${list.map((a) => `<td><button class="btn btn-sm btn-gold" data-act="quote-ac" data-id="${a.id}">Request quotation</button></td>`).join('')}</tr></tbody></table></div>`;
  }

  /* ---------------- empty legs ---------------- */
  const EL = { from: '', to: '', date: '', max: '' };
  function vEmptyLegs() {
    const t = S.day(0);
    let list = S.db.emptyLegs.filter((e) => e.status === 'published' && e.date >= t && (e.expires || e.date) >= t);
    if (EL.from) list = list.filter((e) => e.from === EL.from);
    if (EL.to) list = list.filter((e) => e.to === EL.to);
    if (EL.date) list = list.filter((e) => e.date >= EL.date);
    if (EL.max) list = list.filter((e) => e.usd * S.RATES[cur()] <= +EL.max);
    list.sort((a, b) => a.date.localeCompare(b.date));
    return `<div class="app-head"><p class="eyebrow">Empty legs</p><h1 tabindex="-1">One-way flights at a fraction of the charter price</h1><p class="muted">When an aircraft repositions without passengers, its seats go on sale here.</p></div>
    <p class="note"><b>Please read before booking.</b> Empty legs follow another client’s schedule. Departure times can move, and the flight can be cancelled if the original charter changes. The route and date are fixed, so they suit flexible travellers.</p>
    <form class="panel filter-row" data-form="el-filter">${apField('el-from', EL.from, 'From')}${apField('el-to', EL.to, 'To')}<div class="field"><label for="el-date">From date</label><input type="date" id="el-date" value="${h(EL.date)}"></div><div class="field"><label for="el-max">Max price (${cur()})</label><input type="number" id="el-max" value="${h(EL.max)}" placeholder="Any"></div><div class="row end"><button class="btn btn-sm btn-gold">Filter</button><button type="button" class="btn btn-sm btn-ghost" data-act="el-clear">Clear</button></div></form>
    <div class="el-list">${list.length ? list.map((e) => { const ac = S.aircraftById(e.aircraft); return `<article class="el-card"><div class="el-route"><span class="el-date">${fmtDate(e.date)}${e.time ? ' · ' + h(e.time) : ''}</span><b>${ap(e.from)}</b><span class="leg-line" aria-hidden="true"></span><b>${ap(e.to)}</b></div>
      <dl class="specs"><div><dt>Aircraft</dt><dd>${h(ac?.manufacturer)} ${h(ac?.model)}</dd></div><div><dt>Seats</dt><dd>${e.seats}</dd></div><div><dt>Operator</dt><dd>${h(opName(e.operator))}</dd></div><div><dt>Offer ends</dt><dd>${fmtDate(e.expires, false)}</dd></div></dl>
      <p class="muted small">${h(e.flexible || '')}</p><div class="row between"><span class="price-big">${money(e.usd)}</span><button class="btn btn-sm btn-gold" data-act="el-request" data-id="${e.id}">Request this flight</button></div></article>`; }).join('') : empty('No empty legs match', 'New repositioning flights are published daily. Clear the filters or check back soon.')}</div>`;
  }

  /* ---------------- auth ---------------- */
  const demoAccounts = () => `<div class="demo-accts"><p class="eyebrow">Demo accounts · password noir2026</p>${[['client@airnoir.demo', 'Client', 'Thandi Mokoena'], ['ops@highveld.demo', 'Operator', 'Highveld Jet Charter'], ['ops@capeexec.demo', 'Operator', 'Cape Executive Air'], ['admin@airnoir.demo', 'Administrator', 'Platform team']].map(([e, r, n]) => `<button class="demo" data-act="demo-login" data-email="${e}"><b>${r}</b><span>${n}</span></button>`).join('')}</div>`;
  function vSignin() {
    return `<div class="auth"><div class="auth-card panel"><p class="eyebrow">Members</p><h1 tabindex="-1">Sign in</h1>
      <form data-form="signin" novalidate><div class="field"><label for="si-email">Email</label><input id="si-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="si-pw">Password</label><input id="si-pw" type="password" autocomplete="current-password" required></div>
      <div class="row between"><a href="#reset" class="small">Forgot your password?</a><button class="btn btn-gold">Sign in</button></div></form>
      <p class="muted small">New to AIR NOIR? <a href="#register">Create an account</a></p></div>${demoAccounts()}</div>`;
  }
  function vRegister() {
    return `<div class="auth"><div class="auth-card panel wide"><p class="eyebrow">Join</p><h1 tabindex="-1">Create your account</h1>
      <form data-form="register" novalidate>
      <div class="seg" role="radiogroup" aria-label="Account type"><label><input type="radio" name="role" value="customer" checked> I want to fly</label><label><input type="radio" name="role" value="operator"> I operate aircraft</label></div>
      <div class="grid-2"><div class="field"><label for="rg-name">Full name</label><input id="rg-name" autocomplete="name" required></div><div class="field"><label for="rg-email">Email</label><input id="rg-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="rg-phone">Mobile number</label><input id="rg-phone" type="tel" autocomplete="tel" placeholder="+27"></div><div class="field"><label for="rg-company">Company <span class="muted">(optional for clients)</span></label><input id="rg-company" autocomplete="organization"></div>
      <div class="field"><label for="rg-pw">Password</label><input id="rg-pw" type="password" autocomplete="new-password" minlength="8" required><span class="hint">At least 8 characters</span></div>
      <div class="field op-only"><label for="rg-aoc">Air operator certificate number</label><input id="rg-aoc" placeholder="ZA-AOC-0000"></div></div>
      <label class="check"><input type="checkbox" id="rg-terms" required> I accept the terms of carriage and privacy notice (POPIA).</label>
      <div class="row end"><button class="btn btn-gold">Create account</button></div></form>
      <p class="muted small">Already a member? <a href="#signin">Sign in</a>. Operator accounts start unverified. Our team checks your certificate before your aircraft can be listed.</p></div></div>`;
  }
  let resetEmail = '';
  function vReset() {
    return `<div class="auth"><div class="auth-card panel"><p class="eyebrow">Account recovery</p><h1 tabindex="-1">Reset your password</h1>
      <form data-form="reset-1" novalidate><div class="field"><label for="rs-email">Email on your account</label><input id="rs-email" type="email" value="${h(resetEmail)}" required></div><div class="row end"><button class="btn">Send reset code</button></div></form>
      <form data-form="reset-2" novalidate class="mt"><div class="grid-2"><div class="field"><label for="rs-code">6-digit code</label><input id="rs-code" inputmode="numeric" maxlength="6"></div><div class="field"><label for="rs-pw">New password</label><input id="rs-pw" type="password" minlength="8"></div></div><div class="row end"><button class="btn btn-gold">Set new password</button></div></form>
      <p class="muted small"><a href="#signin">Back to sign in</a></p></div></div>`;
  }

  /* ---------------- new request ---------------- */
  const NR = { trip: 'one-way', legs: [{ from: '', to: '', date: S.day(10), time: '' }], pax: 2, category: '', preferred: '', services: {}, requirements: '', passengers: [], emptyLeg: null };
  function startRequest(o) { Object.assign(NR, { services: {}, requirements: '', emptyLeg: null, preferred: '' }, JSON.parse(JSON.stringify(o))); go('new-request'); }
  function vNewRequest(u) {
    if (u.role !== 'customer') return `<div class="app-head"><h1 tabindex="-1">Requests are made from client accounts</h1><p class="muted">Sign in as a client to request a charter.</p></div>`;
    if (!NR.passengers.length && u.passengers?.length) NR.passengers = [u.passengers[0].id];
    const el = NR.emptyLeg ? S.db.emptyLegs.find((e) => e.id === NR.emptyLeg) : null;
    const fleet = S.listed();
    return `<a class="back" href="#search">← Search</a><div class="app-head"><p class="eyebrow">${el ? 'Empty-leg request' : 'Charter request'}</p><h1 tabindex="-1">Request a quotation</h1><p class="muted">Operators reply with priced proposals, usually within two hours. Nothing is charged until you accept one.</p></div>
    <form class="panel stack" data-form="request" novalidate>
      ${el ? `<p class="note">You’re requesting the empty leg ${ap(el.from)} → ${ap(el.to)} on ${fmtDate(el.date)} (${el.seats} seats, advertised ${money(el.usd)}). The schedule may change at short notice.</p>${itinerary([{ from: el.from, to: el.to, date: el.date, time: el.time }])}`
      : `<h2>Itinerary</h2>${tripSwitch('r', NR.trip)}${legsEditor('r', NR.legs, NR.trip)}`}
      <div class="grid-3"><div class="field"><label for="r-pax">Passengers</label><input type="number" id="r-pax" min="1" max="${el ? el.seats : 19}" value="${h(NR.pax)}"></div>
      ${el ? '' : `<div class="field"><label for="r-cat">Aircraft category</label><select id="r-cat"><option value="">Operator’s recommendation</option>${D.CATEGORIES.map((c) => `<option value="${c.id}" ${NR.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      <div class="field"><label for="r-pref">Preferred aircraft</label><select id="r-pref"><option value="">No preference</option>${fleet.map((a) => `<option value="${a.id}" ${NR.preferred === a.id ? 'selected' : ''}>${h(a.manufacturer + ' ' + a.model)} · ${h(opName(a.operator))}</option>`).join('')}</select></div>`}</div>
      <h2>Passengers</h2>
      ${u.passengers?.length ? `<div class="checks">${u.passengers.map((p) => `<label class="check"><input type="checkbox" name="pax-list" value="${p.id}" ${NR.passengers.includes(p.id) ? 'checked' : ''}> ${h(p.name)}${p.notes ? ` <span class="muted small">· ${h(p.notes)}</span>` : ''}</label>`).join('')}</div>` : '<p class="muted">No saved passengers yet.</p>'}
      <p class="muted small">Add or edit saved passengers in <a href="#account-profile">your profile</a>. Travel documents are checked by the operator before departure.</p>
      <h2>Additional services</h2>
      <div class="svc-grid">${D.SERVICES.map((s) => `<div class="svc"><label class="check"><input type="checkbox" name="svc" value="${s.id}" ${NR.services[s.id] !== undefined ? 'checked' : ''}> <b>${s.label}</b></label><span class="muted small">${s.note}</span><input class="svc-note" data-svc="${s.id}" aria-label="${s.label} details" placeholder="Details" value="${h(NR.services[s.id] || '')}"></div>`).join('')}</div>
      <div class="field"><label for="r-reqs">Special requirements</label><textarea id="r-reqs" rows="3" placeholder="Dietary needs, mobility assistance, sports equipment, timing constraints…">${h(NR.requirements)}</textarea></div>
      <div class="row end"><button class="btn btn-gold">Send request to operators</button></div>
    </form>`;
  }

  /* ---------------- customer dashboard ---------------- */
  function myBookings(u) { return S.db.bookings.filter((b) => b.customer === u.id); }
  function myRequests(u) { return S.db.requests.filter((r) => r.customer === u.id); }
  function bookingRow(b) {
    const ac = S.aircraftById(b.aircraft);
    return `<tr><td><a href="#booking-${b.id}">${b.id}</a></td><td>${h(route(b))}</td><td>${fmtDate(b.legs[0].date)}</td><td>${h(ac?.model)}</td><td>${pill(b.status)}</td><td class="num">${money(S.balance(b))}</td></tr>`;
  }
  function vAccount(u, tab) {
    const bs = myBookings(u), rs = myRequests(u), t = S.day(0);
    const qs = S.db.quotes.filter((q) => rs.some((r) => r.id === q.request));
    let c = '';
    if (tab === 'overview') {
      const upcoming = bs.filter((b) => ['awaiting-payment', 'confirmed', 'in-preparation'].includes(b.status) && b.legs[b.legs.length - 1].date >= t).sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date));
      const pending = rs.filter((r) => ['submitted', 'under-review'].includes(r.status));
      const open = qs.filter((q) => q.status === 'sent');
      const outstanding = bs.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + S.balance(b), 0);
      const nx = upcoming[0];
      c = `<div class="app-head"><p class="eyebrow">Welcome back</p><h1 tabindex="-1">${h(u.name.split(' ')[0])}, here is your travel at a glance</h1></div>
      <div class="kpis">${kpi('Upcoming flights', upcoming.length)}${kpi('Pending requests', pending.length, 'with operators')}${kpi('Quotations to review', open.length, open.length ? 'decide before they expire' : '')}${kpi('Confirmed bookings', bs.filter((b) => ['confirmed', 'in-preparation'].includes(b.status)).length)}${kpi('Outstanding', money(outstanding))}</div>
      <div class="grid-2 gap-l">
        <section class="panel">${nx ? `<p class="eyebrow">Next departure</p><h2>${ap(nx.legs[0].from)} → ${ap(nx.legs[0].to)}</h2><p class="muted">${fmtDate(nx.legs[0].date)}${nx.legs[0].time ? ' at ' + h(nx.legs[0].time) : ''} · ${h(S.aircraftById(nx.aircraft)?.model)} · ${h(opName(nx.operator))}</p>${pill(nx.status)}<div class="row mt"><a class="btn btn-sm" href="#booking-${nx.id}">Open booking</a>${S.balance(nx) ? `<button class="btn btn-sm btn-gold" data-act="pay" data-id="${nx.id}">Pay ${money(S.balance(nx) && S.paid(nx.id) < S.depositDue(nx) ? S.depositDue(nx) - S.paid(nx.id) : S.balance(nx))}</button>` : ''}</div>` : empty('No upcoming flights', 'Search for aircraft or browse empty legs to plan your next journey.', '<a class="btn btn-sm btn-gold" href="#search">Search flights</a>')}</section>
        <section class="panel"><p class="eyebrow">Recent activity</p><ul class="activity">${S.db.activity.filter((a) => a.user === u.id).slice(0, 7).map((a) => `<li><span>${h(a.text)}</span><time class="muted small">${fmtDT(a.at)}</time></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul></section>
      </div>
      ${open.length ? `<section class="panel"><p class="eyebrow">Waiting for your decision</p>${open.map((q) => { const r = rs.find((x) => x.id === q.request); return `<div class="row between line"><span>${h(q.id)} · ${h(route(r))} · ${h(opName(q.operator))}</span><span>${money(q.total)} <a class="btn btn-sm" href="#request-${r.id}">Review</a></span></div>`; }).join('')}</section>` : ''}
      <div class="row"><a class="btn btn-gold" href="#search">New search</a><a class="btn" href="#empty-legs">Empty legs</a><button class="btn btn-ghost" data-act="new-blank-request">Request a quotation</button></div>`;
    }
    if (tab === 'flights') {
      const up = bs.filter((b) => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date));
      const past = bs.filter((b) => b.status === 'completed');
      const canc = bs.filter((b) => b.status === 'cancelled');
      const tbl = (arr, emptyTxt) => arr.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Route</th><th>Departure</th><th>Aircraft</th><th>Status</th><th class="num">Outstanding</th></tr></thead><tbody>${arr.map(bookingRow).join('')}</tbody></table></div>` : `<p class="muted">${emptyTxt}</p>`;
      c = `<div class="app-head"><h1 tabindex="-1">My flights</h1></div><section class="panel"><h2>Upcoming journeys</h2>${tbl(up, 'No upcoming journeys.')}</section><section class="panel"><h2>Past journeys</h2>${tbl(past, 'No completed journeys yet.')}</section><section class="panel"><h2>Cancelled</h2>${tbl(canc, 'No cancelled bookings.')}</section>`;
    }
    if (tab === 'quotes') {
      const pend = rs.filter((r) => ['submitted', 'under-review'].includes(r.status));
      const groups = [['Received quotations', qs.filter((q) => q.status === 'sent' || q.status === 'amendment-requested')], ['Accepted', qs.filter((q) => q.status === 'accepted')], ['Expired, declined or withdrawn', qs.filter((q) => ['expired', 'declined', 'withdrawn', 'superseded'].includes(q.status))]];
      const qrow = (q) => { const r = rs.find((x) => x.id === q.request); return `<tr><td><a href="#request-${r.id}">${q.id}</a> <span class="muted small">v${q.version}</span></td><td>${h(route(r))}</td><td>${h(opName(q.operator))}</td><td>${h(S.aircraftById(q.aircraft)?.model)}</td><td>${fmtDate(q.expires, false)}</td><td>${pill(q.status)}</td><td class="num">${money(q.total)}</td></tr>`; };
      c = `<div class="app-head"><h1 tabindex="-1">My quotations</h1></div>
      <section class="panel"><h2>Pending proposals</h2>${pend.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Route</th><th>Departure</th><th>Passengers</th><th>Status</th></tr></thead><tbody>${pend.map((r) => `<tr><td><a href="#request-${r.id}">${r.id}</a></td><td>${h(route(r))}</td><td>${fmtDate(r.legs[0].date)}</td><td>${r.pax}</td><td>${pill(r.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No requests waiting on operators.</p>'}</section>
      ${groups.map(([t2, arr]) => `<section class="panel"><h2>${t2}</h2>${arr.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Quotation</th><th>Route</th><th>Operator</th><th>Aircraft</th><th>Valid until</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>${arr.map(qrow).join('')}</tbody></table></div>` : '<p class="muted">None.</p>'}</section>`).join('')}`;
    }
    if (tab === 'saved') {
      const fav = (u.favourites || []).map(S.aircraftById).filter(Boolean), vw = (u.viewed || []).map(S.aircraftById).filter(Boolean);
      c = `<div class="app-head"><h1 tabindex="-1">Saved aircraft</h1></div><h2>Favourites</h2>${fav.length ? `<div class="ac-grid">${fav.map((a) => acCard(a)).join('')}</div>` : empty('No favourites yet', 'Tap the heart on any aircraft to keep it here.', '<a class="btn btn-sm" href="#fleet">Browse the fleet</a>')}
      <h2 class="mt">Recently viewed</h2>${vw.length ? `<div class="chips">${vw.map((a) => `<a class="chip" href="#aircraft-${a.id}">${h(a.manufacturer + ' ' + a.model)}</a>`).join('')}</div>` : '<p class="muted">Aircraft you open appear here.</p>'}${compareBar()}`;
    }
    if (tab === 'payments') {
      const live = bs.filter((b) => b.status !== 'cancelled');
      const pays = S.db.payments.filter((p) => bs.some((b) => b.id === p.booking)).sort((a, b) => b.at.localeCompare(a.at));
      const refs = S.db.refunds.filter((r) => bs.some((b) => b.id === r.booking));
      c = `<div class="app-head"><h1 tabindex="-1">Payments</h1><p class="muted">Card and bank details are entered on the payment provider’s secure page. AIR NOIR never sees or stores them.</p></div>
      <div class="kpis">${kpi('Outstanding', money(live.reduce((s, b) => s + S.balance(b), 0)))}${kpi('Paid to date', money(pays.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.usd, 0)))}${kpi('Refunded', money(refs.reduce((s, r) => s + r.usd, 0)))}</div>
      <section class="panel"><h2>Invoices</h2>${bs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Booking</th><th>Issued</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Outstanding</th><th></th></tr></thead><tbody>${bs.map((b) => `<tr><td>INV-${b.id.slice(3)}</td><td><a href="#booking-${b.id}">${b.id}</a></td><td>${fmtDate(b.created, false)}</td><td class="num">${money(b.total)}</td><td class="num">${money(S.paid(b.id))}</td><td class="num">${money(b.status === 'cancelled' ? 0 : S.balance(b))}</td><td>${b.status !== 'cancelled' && S.balance(b) ? `<button class="btn btn-sm btn-gold" data-act="pay" data-id="${b.id}">Pay</button>` : b.status === 'cancelled' ? pill('cancelled') : pill('succeeded', 'Settled')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No invoices yet.</p>'}</section>
      <section class="panel"><h2>Transaction history</h2>${pays.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Reference</th><th>Booking</th><th>Type</th><th>Method</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${pays.map((p) => `<tr><td>${fmtDate(p.at, false)}</td><td>${h(p.ref)}</td><td>${p.booking}</td><td>${p.kind === 'deposit' ? 'Deposit' : 'Balance'}</td><td>${h(S.GATEWAYS[p.provider]?.label)}</td><td>${pill(p.status, p.status === 'succeeded' ? 'Paid' : 'Awaiting bank')}</td><td class="num">${money(p.usd)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No payments yet.</p>'}</section>
      <section class="panel"><h2>Refunds</h2>${refs.length ? `<ul class="plain">${refs.map((r) => `<li>${r.id} · ${r.booking} · ${money(r.usd)} · ${h(r.reason)} ${pill(r.status, 'Processed')}</li>`).join('')}</ul>` : '<p class="muted">No refunds.</p>'}</section>`;
    }
    if (tab === 'profile') {
      const p = u.prefs || {};
      c = `<div class="app-head"><h1 tabindex="-1">Profile</h1></div>
      <form class="panel" data-form="profile" novalidate><h2>Personal details</h2><div class="grid-2">
        <div class="field"><label for="pf-name">Full name</label><input id="pf-name" value="${h(u.name)}"></div><div class="field"><label for="pf-email">Email</label><input id="pf-email" value="${h(u.email)}" disabled><span class="hint">Contact us to change your sign-in email</span></div>
        <div class="field"><label for="pf-phone">Mobile number</label><input id="pf-phone" value="${h(u.phone)}"></div><div class="field"><label for="pf-company">Company</label><input id="pf-company" value="${h(u.company || '')}"></div>
        <div class="field"><label for="pf-home">Home airport</label><select id="pf-home">${D.AIRPORTS.map((a) => `<option value="${a.iata}" ${u.homeAirport === a.iata ? 'selected' : ''}>${h(a.name)} (${a.iata})</option>`).join('')}</select></div>
        <div class="field"><label for="pf-cur">Display currency</label><select id="pf-cur">${Object.keys(S.RATES).map((c2) => `<option ${p.currency === c2 ? 'selected' : ''}>${c2}</option>`).join('')}</select><span class="hint">Conversions are indicative. Invoices are issued in the operator’s currency.</span></div>
        <div class="field"><label for="pf-cat">Catering preferences</label><input id="pf-cat" value="${h(p.catering || '')}"></div>
        <fieldset><legend>Notifications</legend><label class="check"><input type="checkbox" id="pf-em" ${p.emailUpdates ? 'checked' : ''}> Email updates on quotes and bookings</label><label class="check"><input type="checkbox" id="pf-sms" ${p.smsUpdates ? 'checked' : ''}> SMS on the day of travel</label></fieldset>
      </div><div class="row end"><button class="btn btn-gold">Save details</button></div></form>
      <section class="panel"><div class="row between"><h2>Saved passengers</h2><button class="btn btn-sm" data-act="pax-add">Add passenger</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Nationality</th><th>Passport expiry</th><th>Notes</th><th></th></tr></thead><tbody>${(u.passengers || []).map((x) => `<tr><td>${h(x.name)}</td><td>${h(x.nationality)}</td><td>${x.docExpiry ? fmtDate(x.docExpiry, true) : '—'}</td><td>${h(x.notes)}</td><td class="num"><button class="link" data-act="pax-edit" data-id="${x.id}">Edit</button> <button class="link" data-act="pax-del" data-id="${x.id}">Remove</button></td></tr>`).join('')}</tbody></table></div>
        <p class="muted small">Passport numbers are collected by the operator at check-in and are not stored on the platform.</p></section>
      <form class="panel" data-form="password" novalidate><h2>Account settings</h2><div class="grid-3"><div class="field"><label for="pw-old">Current password</label><input id="pw-old" type="password" autocomplete="current-password"></div><div class="field"><label for="pw-new">New password</label><input id="pw-new" type="password" autocomplete="new-password"></div><div class="row end"><button class="btn">Change password</button></div></div></form>
      <section class="panel"><h2>Demo data</h2><p class="muted">Everything on this platform is saved in this browser only. Restore the original sample data at any time.</p><button class="btn btn-ghost btn-sm" data-act="reset-demo">Restore sample data</button></section>`;
    }
    return dashShell('account', tab, c, u);
  }

  function vRequest(u, id) {
    const r = S.db.requests.find((x) => x.id === id);
    if (!r || (u.role === 'customer' && r.customer !== u.id)) return empty('Request not found', 'It may belong to another account.', '<a class="btn btn-sm" href="#account-quotes">My quotations</a>');
    const qs = S.db.quotes.filter((q) => q.request === r.id);
    const st = S.lifecycleOf(r); const b = S.db.bookings.find((x) => x.request === r.id);
    const owner = S.db.users.find((x) => x.id === r.customer);
    const pnames = (r.passengers || []).map((pid) => owner?.passengers?.find((p) => p.id === pid)?.name).filter(Boolean);
    return `<a class="back" href="#account-quotes">← My quotations</a><div class="app-head"><p class="eyebrow">${r.id} · ${r.trip.replace('-', ' ')}${r.emptyLeg ? ' · empty leg' : ''}</p><h1 tabindex="-1">${h(route(r))}</h1>${pill(st)}</div>
    ${timeline(st, b?.status === 'cancelled')}
    <div class="grid-2 gap-l"><section class="panel"><h2>Itinerary</h2>${itinerary(r.legs)}<p class="muted small">${r.pax} passengers${pnames.length ? ': ' + h(pnames.join(', ')) : ''}${r.category ? ' · ' + h(catLabel(r.category)) : ''}${r.preferred ? ' · prefers ' + h(S.aircraftById(r.preferred)?.model) : ''}</p>${r.requirements ? `<p><b>Requirements:</b> ${h(r.requirements)}</p>` : ''}</section>
    <section class="panel"><h2>Additional services</h2>${r.services.length ? `<ul class="plain">${r.services.map((s) => `<li>${pill(s.status === 'pending' ? 'pending' : s.status, s.status === 'pending' ? 'Awaiting operator' : s.status === 'approved' ? 'Arranged' : 'Not possible')} <b>${h(svcLabel(s.id))}</b>${s.note ? ' · ' + h(s.note) : ''}</li>`).join('')}</ul>` : '<p class="muted">None requested.</p>'}</section></div>
    <section><h2>Proposals ${qs.length ? `<span class="muted small">(${qs.length})</span>` : ''}</h2>
    ${qs.length ? `<div class="quote-grid">${qs.map((q) => quoteCard(q, u)).join('')}</div>` : empty('Operators are reviewing your request', 'You’ll see priced proposals here, usually within two hours. We’ll notify you by email.')}</section>
    ${b ? `<p><a class="btn btn-gold" href="#booking-${b.id}">Open booking ${b.id}</a></p>` : ''}
    <section class="panel"><h2>History</h2><ul class="activity">${[{ at: r.created, text: 'Request submitted' }].concat(r.log).map((l) => `<li><span>${h(l.text)}</span><time class="muted small">${fmtDT(l.at)}</time></li>`).join('')}</ul></section>`;
  }
  function quoteCard(q, u) {
    const ac = S.aircraftById(q.aircraft);
    return `<article class="quote ${q.status === 'sent' ? 'live' : ''}"><div class="row between"><div><p class="eyebrow">${q.id} · version ${q.version}</p><h3>${h(opName(q.operator))}</h3></div>${pill(q.status)}</div>
      <div class="ac-art sm">${ART.jetTop({ small: true })}</div><p><a href="#aircraft-${ac.id}">${h(ac.manufacturer)} ${h(ac.model)}</a> · ${ac.pax} seats · ${h(ac.reg)}</p>
      <table class="lines"><tbody>${q.lines.map((l) => `<tr><td>${h(l.label)}</td><td class="num">${money(l.usd)}</td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><th class="num">${money(q.total)}</th></tr></tfoot></table>
      <p class="muted small">Valid until ${fmtDate(q.expires)} · deposit ${q.conditions.depositPct}% on acceptance</p>${q.message ? `<p class="msg">“${h(q.message)}”</p>` : ''}${q.amendment ? `<p class="note small">Your amendment request: ${h(q.amendment)}</p>` : ''}
      <details><summary>Quotation conditions</summary><p class="small">${h(q.conditions.cancellation)}</p><p class="small">${h(q.conditions.notes)}</p><p class="small">Balance due ${q.conditions.balanceDueDays} days before departure.</p></details>
      ${q.status === 'sent' && u.role === 'customer' ? `<div class="row"><button class="btn btn-gold btn-sm" data-act="q-accept" data-id="${q.id}">Accept</button><button class="btn btn-sm" data-act="q-amend" data-id="${q.id}">Request amendment</button><button class="btn btn-ghost btn-sm" data-act="q-decline" data-id="${q.id}">Decline</button></div>` : ''}</article>`;
  }

  function vBooking(u, id) {
    const b = S.db.bookings.find((x) => x.id === id);
    if (!b || (u.role === 'customer' && b.customer !== u.id) || (u.role === 'operator' && b.operator !== u.operatorId)) return empty('Booking not found', 'It may belong to another account.');
    const ac = S.aircraftById(b.aircraft), q = S.db.quotes.find((x) => x.id === b.quote), r = S.db.requests.find((x) => x.id === b.request);
    const paidV = S.paid(b.id), dep = S.depositDue(b), bal = S.balance(b), why = S.canConfirm(b);
    const pend = S.db.payments.filter((p) => p.booking === b.id && p.status === 'pending');
    const isCust = u.role === 'customer';
    return `<a class="back" href="#${isCust ? 'account-flights' : 'operator-bookings'}">← ${isCust ? 'My flights' : 'Bookings'}</a>
    <div class="app-head"><p class="eyebrow">Booking ${b.id}</p><h1 tabindex="-1">${h(route(b))}</h1>${pill(b.status)}</div>
    ${timeline(b.status === 'cancelled' ? 'awaiting-payment' : b.status, b.status === 'cancelled')}
    ${b.status === 'awaiting-payment' ? `<p class="note">Your flight is confirmed once we have ${why.length ? why.join(' and ') : 'finished processing'}. ${paidV < dep ? 'Deposit due now: ' + money(dep - paidV) + '.' : 'Your deposit has been received.'}</p>` : ''}
    ${b.changeRequest?.status === 'open' ? `<p class="note">${b.changeRequest.kind === 'cancel' ? 'Cancellation' : 'Modification'} request awaiting operator: “${h(b.changeRequest.text)}”</p>` : ''}
    <div class="grid-2 gap-l"><section class="panel"><h2>Journey</h2>${itinerary(b.legs)}
      <table class="kv"><tbody><tr><th scope="row">Aircraft</th><td>${h(ac.manufacturer + ' ' + ac.model)} · ${h(ac.reg)}</td></tr><tr><th scope="row">Operator</th><td>${h(opName(b.operator))}</td></tr><tr><th scope="row">Passengers</th><td>${r?.pax || '—'}</td></tr>
      ${Object.entries(b.journey || {}).filter(([, v]) => v).map(([k, v]) => `<tr><th scope="row">${{ crew: 'Crew', fbo: 'Terminal (FBO)', blockTime: 'Block time', departure: 'Departure details', notes: 'Notes' }[k] || h(k)}</th><td>${h(v)}</td></tr>`).join('')}</tbody></table></section>
    <section class="panel"><h2>Payment</h2><table class="lines"><tbody><tr><td>Booking total</td><td class="num">${money(b.total)}</td></tr><tr><td>Deposit (${b.depositPct}%)</td><td class="num">${money(dep)}</td></tr><tr><td>Paid</td><td class="num">${money(paidV)}</td></tr>${S.refunded(b.id) ? `<tr><td>Refunded</td><td class="num">${money(S.refunded(b.id))}</td></tr>` : ''}</tbody><tfoot><tr><th>Outstanding</th><th class="num">${money(b.status === 'cancelled' ? 0 : bal)}</th></tr></tfoot></table>
      ${pend.length ? `<p class="muted small">${pend.length} bank transfer awaiting confirmation.</p>` : ''}
      ${isCust && bal && b.status !== 'cancelled' && b.status !== 'completed' ? `<button class="btn btn-gold" data-act="pay" data-id="${b.id}">${paidV < dep ? 'Pay deposit' : 'Pay balance'}</button>` : ''}
      <div class="row mt"><button class="btn btn-sm" data-act="confirmation" data-id="${b.id}">View confirmation</button>${isCust && !['cancelled', 'completed'].includes(b.status) && b.changeRequest?.status !== 'open' ? `<button class="btn btn-sm btn-ghost" data-act="b-change" data-id="${b.id}" data-kind="modify">Request a change</button><button class="btn btn-sm btn-ghost" data-act="b-change" data-id="${b.id}" data-kind="cancel">Cancel booking</button>` : ''}</div>
      ${q ? `<details class="mt"><summary>Quotation ${q.id} conditions</summary><p class="small">${h(q.conditions.cancellation)}</p><p class="small">${h(q.conditions.notes)}</p></details>` : ''}</section></div>
    ${!isCust ? operatorBookingTools(b) : ''}
    <section class="panel"><h2>History</h2><ul class="activity">${b.log.slice().reverse().map((l) => `<li><span>${h(l.text)}</span><time class="muted small">${fmtDT(l.at)}</time></li>`).join('')}</ul></section>`;
  }
  function operatorBookingTools(b) {
    const why = S.canConfirm(b); const pend = S.db.payments.filter((p) => p.booking === b.id && p.status === 'pending');
    return `<section class="panel"><h2>Operator actions</h2>
      <div class="row">${!b.operatorApproved && b.status === 'awaiting-payment' ? `<button class="btn btn-gold btn-sm" data-act="op-approve" data-id="${b.id}">Approve booking</button>` : ''}
      ${b.status === 'awaiting-payment' ? `<button class="btn btn-sm" data-act="op-status" data-id="${b.id}" data-v="confirmed" ${why.length ? 'aria-disabled="true"' : ''}>Mark confirmed</button>` : ''}
      ${b.status === 'confirmed' ? `<button class="btn btn-sm" data-act="op-status" data-id="${b.id}" data-v="in-preparation">Start preparation</button>` : ''}
      ${b.status === 'in-preparation' ? `<button class="btn btn-sm" data-act="op-status" data-id="${b.id}" data-v="completed">Mark completed</button>` : ''}
      ${pend.map((p) => `<button class="btn btn-sm" data-act="op-eft" data-id="${p.id}">Confirm bank transfer ${h(p.ref)}</button>`).join('')}</div>
      ${b.status === 'awaiting-payment' && why.length ? `<p class="muted small">Confirmation is locked until: ${why.join(' and ')}.</p>` : ''}
      ${b.changeRequest?.status === 'open' ? `<div class="note"><p><b>${b.changeRequest.kind === 'cancel' ? 'Cancellation' : 'Modification'} request:</b> ${h(b.changeRequest.text)}</p>${b.changeRequest.kind === 'cancel' ? `<p class="small">Refund under policy: ${money(S.refundFor(b).usd)} (${Math.round(S.refundFor(b).pct * 100)}% of ${money(S.paid(b.id))} paid).</p>` : ''}<div class="row"><button class="btn btn-sm btn-gold" data-act="op-change" data-id="${b.id}" data-v="1">Approve</button><button class="btn btn-sm btn-ghost" data-act="op-change" data-id="${b.id}" data-v="0">Decline</button></div></div>` : ''}
      <form data-form="journey" data-id="${b.id}" class="mt" novalidate><div class="grid-3"><div class="field"><label for="j-crew">Crew</label><input id="j-crew" value="${h(b.journey?.crew || '')}"></div><div class="field"><label for="j-fbo">Terminal (FBO)</label><input id="j-fbo" value="${h(b.journey?.fbo || '')}"></div><div class="field"><label for="j-dep">Departure details</label><input id="j-dep" value="${h(b.journey?.departure || '')}" placeholder="Wheels up 09:30, slot confirmed"></div></div><div class="field"><label for="j-notes">Notes for the client</label><input id="j-notes" value="${h(b.journey?.notes || '')}"></div><div class="row end"><button class="btn btn-sm">Update journey information</button></div></form></section>`;
  }

  /* ---------------- operator portal ---------------- */
  function vOperator(u, tab) {
    const op = S.operator(u.operatorId); const fleet = S.db.aircraft.filter((a) => a.operator === op.id);
    const reqs = S.requestsForOperator(op.id); const bks = S.db.bookings.filter((b) => b.operator === op.id);
    let c = '';
    const banner = op.verified ? '' : `<p class="note">Your operator account is awaiting verification by AIR NOIR. You can prepare aircraft listings now; they go live once your certificate is approved.</p>`;
    if (tab === 'overview') {
      const newR = reqs.filter((r) => r.status === 'submitted' || r.status === 'under-review');
      c = `<div class="app-head"><p class="eyebrow">${h(op.name)}</p><h1 tabindex="-1">Operations overview</h1></div>${banner}
      <div class="kpis">${kpi('Requests to quote', newR.length)}${kpi('Quotes with clients', S.db.quotes.filter((q) => q.operator === op.id && q.status === 'sent').length)}${kpi('Bookings to approve', bks.filter((b) => !b.operatorApproved && b.status === 'awaiting-payment').length)}${kpi('Change requests', bks.filter((b) => b.changeRequest?.status === 'open').length)}${kpi('Aircraft listed', fleet.filter((a) => a.active && a.status === 'verified').length + ' / ' + fleet.length)}</div>
      <section class="panel"><h2>Newest requests</h2>${opReqTable(newR.slice(0, 5), op)}</section>
      <section class="panel"><h2>Upcoming departures</h2>${opBookTable(bks.filter((b) => !['completed', 'cancelled'].includes(b.status)))}</section>`;
    }
    if (tab === 'requests') c = `<div class="app-head"><h1 tabindex="-1">Charter requests</h1><p class="muted">Open requests from all clients, plus requests naming your aircraft or empty legs.</p></div>${banner}<section class="panel">${opReqTable(reqs, op)}</section>`;
    if (tab.startsWith('quote-')) c = vQuoteBuilder(u, op, tab.slice(6));
    if (tab === 'bookings') c = `<div class="app-head"><h1 tabindex="-1">Bookings</h1></div><section class="panel">${opBookTable(bks)}</section>`;
    if (tab === 'fleet') c = `<div class="app-head row between"><div><h1 tabindex="-1">Fleet management</h1><p class="muted">Specifications, pricing, photos and documents. Changes to specifications go back to AIR NOIR for verification.</p></div><a class="btn btn-gold" href="#operator-aircraft-new">Register aircraft</a></div>${banner}
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Registration</th><th>Aircraft</th><th>Category</th><th>Base</th><th class="num">Hourly rate</th><th>Verification</th><th>Listing</th><th></th></tr></thead><tbody>${fleet.map((a) => `<tr><td>${h(a.reg)}</td><td>${h(a.manufacturer + ' ' + a.model)}</td><td>${h(catLabel(a.category))}</td><td>${h(a.base)}</td><td class="num">${S.fmtUSD(a.hourlyUSD)}</td><td>${pill(a.status)}</td><td><label class="switch"><input type="checkbox" data-act="ac-list" data-id="${a.id}" ${a.active ? 'checked' : ''} ${a.status !== 'verified' ? 'disabled' : ''}><span>${a.active ? 'Live' : 'Hidden'}</span></label></td><td class="num"><a href="#operator-aircraft-${a.id}">Edit</a></td></tr>`).join('')}</tbody></table></div>`;
    if (tab.startsWith('aircraft-')) c = vAircraftForm(u, op, tab.slice(9));
    if (tab === 'availability') c = `<div class="app-head"><h1 tabindex="-1">Availability</h1><p class="muted">Blocked dates hide an aircraft from search on those days. Confirmed bookings block dates automatically.</p></div>
      ${fleet.map((a) => `<section class="panel"><div class="row between"><h2>${h(a.reg)} · ${h(a.model)}</h2>${pill(a.status)}</div>${availStrip(a)}
      ${a.unavailable.length ? `<ul class="plain">${a.unavailable.map((x) => `<li>${pill(x.kind === 'maintenance' ? 'pending' : 'mute', x.kind === 'maintenance' ? 'Maintenance' : 'Unavailable')} ${fmtDate(x.from, false)} – ${fmtDate(x.to)} ${x.note ? '· ' + h(x.note) : ''} <button class="link" data-act="un-del" data-ac="${a.id}" data-id="${x.id}">Remove</button></li>`).join('')}</ul>` : '<p class="muted small">No blocked dates.</p>'}
      <form class="filter-row" data-form="unavail" data-ac="${a.id}" novalidate><div class="field"><label for="u-f-${a.id}">From</label><input type="date" id="u-f-${a.id}" min="${S.day(0)}"></div><div class="field"><label for="u-t-${a.id}">To</label><input type="date" id="u-t-${a.id}" min="${S.day(0)}"></div><div class="field"><label for="u-k-${a.id}">Reason</label><select id="u-k-${a.id}"><option value="maintenance">Maintenance</option><option value="unavailable">Unavailable</option></select></div><div class="field"><label for="u-n-${a.id}">Note</label><input id="u-n-${a.id}" placeholder="Optional"></div><div class="row end"><button class="btn btn-sm">Block dates</button></div></form></section>`).join('')}`;
    if (tab === 'empty-legs') {
      const mine = S.db.emptyLegs.filter((e) => e.operator === op.id);
      c = `<div class="app-head"><h1 tabindex="-1">Empty legs</h1><p class="muted">Publish repositioning flights. Clients see them on the public empty-leg board with the schedule-change warning.</p></div>
      <form class="panel stack" data-form="el-new" novalidate><h2>Publish an empty leg</h2><div class="grid-3"><div class="field"><label for="eln-ac">Aircraft</label><select id="eln-ac">${fleet.filter((a) => a.status === 'verified').map((a) => `<option value="${a.id}">${h(a.reg + ' · ' + a.model)} (${a.pax} seats)</option>`).join('')}</select></div>${apField('eln-from', '', 'From')}${apField('eln-to', '', 'To')}
      <div class="field"><label for="eln-date">Date</label><input type="date" id="eln-date" min="${S.day(0)}"></div><div class="field"><label for="eln-time">Time</label><input type="time" id="eln-time"></div><div class="field"><label for="eln-seats">Seats available</label><input type="number" id="eln-seats" min="1"></div>
      <div class="field"><label for="eln-usd">Advertised price (USD)</label><input type="number" id="eln-usd" min="1"></div><div class="field"><label for="eln-exp">Offer ends</label><input type="date" id="eln-exp" min="${S.day(0)}"></div><div class="field"><label for="eln-flex">Booking conditions</label><input id="eln-flex" placeholder="Departure may move ±2 hours"></div></div><div class="row end"><button class="btn btn-gold">Publish</button></div></form>
      <section class="panel"><h2>Your listings</h2>${mine.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Route</th><th>Date</th><th>Aircraft</th><th>Seats</th><th class="num">Price</th><th>Status</th><th></th></tr></thead><tbody>${mine.map((e) => `<tr><td>${e.from} → ${e.to}</td><td>${fmtDate(e.date, false)} ${h(e.time)}</td><td>${h(S.aircraftById(e.aircraft)?.reg)}</td><td>${e.seats}</td><td class="num">${S.fmtUSD(e.usd)}</td><td>${pill(e.status, e.status === 'published' ? 'Published' : 'Withdrawn')}</td><td>${e.status === 'published' ? `<button class="link" data-act="el-withdraw" data-id="${e.id}">Withdraw</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No listings yet.</p>'}</section>`;
    }
    if (tab === 'services') {
      const rows = []; reqs.forEach((r) => r.services.forEach((s, i) => rows.push({ r, s, i })));
      c = `<div class="app-head"><h1 tabindex="-1">Additional services</h1><p class="muted">Approve what you can arrange, decline what you can’t. Clients see the status on their request.</p></div>
      <section class="panel">${rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Route</th><th>Service</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(({ r, s, i }) => `<tr><td><a href="#operator-quote-${r.id}">${r.id}</a></td><td>${h(route(r))}</td><td>${h(svcLabel(s.id))}</td><td>${h(s.note)}</td><td>${pill(s.status === 'pending' ? 'pending' : s.status, s.status === 'pending' ? 'To review' : s.status === 'approved' ? 'Approved' : 'Declined')}</td><td class="num">${s.status === 'pending' ? `<button class="link" data-act="svc" data-r="${r.id}" data-i="${i}" data-v="approved">Approve</button> <button class="link" data-act="svc" data-r="${r.id}" data-i="${i}" data-v="declined">Decline</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No service requests.</p>'}</section>`;
    }
    const active = tab.startsWith('quote-') ? 'requests' : tab.startsWith('aircraft-') ? 'fleet' : tab;
    return dashShell('operator', active, c, u);
  }
  function opReqTable(list, op) {
    if (!list.length) return '<p class="muted">Nothing here right now.</p>';
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Route</th><th>Departure</th><th>Pax</th><th>Category</th><th>Your quote</th><th>Status</th><th></th></tr></thead><tbody>${list.map((r) => { const mq = S.db.quotes.filter((q) => q.request === r.id && q.operator === op.id).pop(); return `<tr><td>${r.id}${r.emptyLeg ? ' <span class="muted small">EL</span>' : ''}</td><td>${h(route(r))}</td><td>${fmtDate(r.legs[0].date, false)}</td><td>${r.pax}</td><td>${h(r.category ? catLabel(r.category) : 'Any')}</td><td>${mq ? pill(mq.status) : '—'}</td><td>${pill(S.lifecycleOf(r))}</td><td class="num"><a class="btn btn-sm" href="#operator-quote-${r.id}">${mq ? 'Open' : 'Quote'}</a></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  function opBookTable(list) {
    if (!list.length) return '<p class="muted">No bookings.</p>';
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Route</th><th>Departure</th><th>Aircraft</th><th>Approved</th><th>Status</th><th class="num">Paid</th></tr></thead><tbody>${list.map((b) => `<tr><td><a href="#booking-${b.id}">${b.id}</a>${b.changeRequest?.status === 'open' ? ' ' + pill('amendment-requested', 'Change request') : ''}</td><td>${h(route(b))}</td><td>${fmtDate(b.legs[0].date, false)}</td><td>${h(S.aircraftById(b.aircraft)?.reg)}</td><td>${b.operatorApproved ? 'Yes' : 'No'}</td><td>${pill(b.status)}</td><td class="num">${S.fmtUSD(S.paid(b.id))} / ${S.fmtUSD(b.total)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function availStrip(a) {
    const days = 60, cells = [];
    for (let i = 0; i < days; i++) { const d = S.day(i); const u = a.unavailable.find((x) => d >= x.from && d <= x.to); const bk = S.db.bookings.find((b) => b.aircraft === a.id && b.status !== 'cancelled' && d >= b.legs[0].date && d <= b.legs[b.legs.length - 1].date); cells.push(`<i class="${bk ? 'bk' : u ? (u.kind === 'maintenance' ? 'mx' : 'un') : ''}" title="${d}${bk ? ' · booked ' + bk.id : u ? ' · ' + u.kind : ''}"></i>`); }
    return `<div class="strip" aria-label="Next 60 days">${cells.join('')}</div><p class="legend small muted"><i></i> Free <i class="bk"></i> Booked <i class="mx"></i> Maintenance <i class="un"></i> Unavailable · next 60 days</p>`;
  }
  const QB = {};
  function vQuoteBuilder(u, op, reqId) {
    const r = S.db.requests.find((x) => x.id === reqId); if (!r) return empty('Request not found', '');
    S.markUnderReview(r, u);
    const fleet = S.db.aircraft.filter((a) => a.operator === op.id && a.status === 'verified');
    const mine = S.db.quotes.filter((q) => q.request === r.id && q.operator === op.id);
    const st = QB[reqId] = QB[reqId] || (() => {
      const el = r.emptyLeg ? S.db.emptyLegs.find((e) => e.id === r.emptyLeg) : null;
      const acId = el ? el.aircraft : (r.preferred && fleet.some((a) => a.id === r.preferred) ? r.preferred : (fleet.find((a) => a.pax >= r.pax && (!r.category || a.category === r.category)) || fleet[0])?.id);
      return { aircraft: acId, lines: [], expires: S.day(3), depositPct: 30, balanceDueDays: 3, cancellation: 'More than 14 days before departure: 90% refund. 7–14 days: 50% refund. Under 7 days: non-refundable.', notes: 'Price includes crew, fuel and standard catering. Subject to slot and permit approval.', message: '', replaces: null, el };
    })();
    if (!st.lines.length && st.aircraft) calcLines(st, r);
    const ac = S.aircraftById(st.aircraft);
    const conf = ac ? S.conflicts(ac, r.legs) : [];
    const longest = Math.max(...r.legs.map((l) => S.distNm(l.from, l.to)));
    const total = st.lines.reduce((s, l) => s + (+l.usd || 0), 0);
    const owner = S.db.users.find((x) => x.id === r.customer);
    return `<a class="back" href="#operator-requests">← Requests</a><div class="app-head"><p class="eyebrow">${r.id} · ${pill(S.lifecycleOf(r))}</p><h1 tabindex="-1">${h(route(r))}</h1><p class="muted">${r.pax} passengers · ${h(owner?.name || 'Client')}${owner?.company ? ', ' + h(owner.company) : ''} · ${h(r.category ? catLabel(r.category) : 'any category')}${r.preferred ? ' · prefers ' + h(S.aircraftById(r.preferred)?.model) : ''}</p></div>
    <div class="grid-2 gap-l"><section class="panel"><h2>Itinerary</h2>${itinerary(r.legs)}${r.requirements ? `<p><b>Requirements:</b> ${h(r.requirements)}</p>` : ''}</section>
    <section class="panel"><h2>Services requested</h2>${r.services.length ? `<ul class="plain">${r.services.map((s, i) => `<li><b>${h(svcLabel(s.id))}</b>${s.note ? ' · ' + h(s.note) : ''} ${pill(s.status === 'pending' ? 'pending' : s.status, s.status === 'pending' ? 'To review' : s.status === 'approved' ? 'Approved' : 'Declined')} ${s.status === 'pending' ? `<button class="link" data-act="svc" data-r="${r.id}" data-i="${i}" data-v="approved">Approve</button> <button class="link" data-act="svc" data-r="${r.id}" data-i="${i}" data-v="declined">Decline</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">None.</p>'}</section></div>
    ${mine.length ? `<section class="panel"><h2>Your quotations</h2>${mine.map((q) => `<div class="row between line"><span>${q.id} v${q.version} · ${h(S.aircraftById(q.aircraft)?.reg)} · valid to ${fmtDate(q.expires, false)} ${pill(q.status)}${q.amendment ? `<br><span class="small">Client asks: “${h(q.amendment)}”</span>` : ''}</span><span>${S.fmtUSD(q.total)} ${['sent', 'amendment-requested', 'expired'].includes(q.status) ? `<button class="btn btn-sm" data-act="q-revise" data-id="${q.id}" data-r="${r.id}">Revise</button>` : ''}${q.status === 'sent' ? `<button class="btn btn-sm btn-ghost" data-act="q-withdraw" data-id="${q.id}">Withdraw</button>` : ''}</span></div>`).join('')}</section>` : ''}
    ${['accepted', 'cancelled'].includes(r.status) ? '' : `<form class="panel stack" data-form="quote" data-r="${r.id}" novalidate><h2>${st.replaces ? 'Revise quotation ' + st.replaces : 'Build a quotation'}</h2>
      <div class="grid-3"><div class="field"><label for="qb-ac">Aircraft</label><select id="qb-ac" data-act-change="qb-ac" data-r="${r.id}">${fleet.map((a) => `<option value="${a.id}" ${a.id === st.aircraft ? 'selected' : ''}>${h(a.reg + ' · ' + a.model)} (${a.pax} seats)</option>`).join('')}</select></div>
      <div class="field"><label>Availability check</label><p class="${conf.length ? 'bad-t' : 'ok-t'}">${conf.length ? conf.map(h).join('<br>') : 'Free on these dates'}</p></div>
      <div class="field"><label>Range and capacity</label><p class="${ac && (longest > ac.rangeNm * 0.9 || ac.pax < r.pax) ? 'bad-t' : 'ok-t'}">${ac ? `Longest leg ${longest.toLocaleString()} nm of ${ac.rangeNm.toLocaleString()} nm range · ${ac.pax} seats` : '—'}</p></div></div>
      <div class="table-wrap"><table class="lines edit"><thead><tr><th>Price line</th><th class="num">Amount (USD)</th><th></th></tr></thead><tbody>${st.lines.map((l, i) => `<tr><td><input aria-label="Line ${i + 1} description" data-ql="${i}" data-k="label" value="${h(l.label)}"></td><td class="num"><input aria-label="Line ${i + 1} amount" type="number" data-ql="${i}" data-k="usd" value="${h(l.usd)}"></td><td><button type="button" class="icon-btn" data-act="ql-del" data-r="${r.id}" data-i="${i}" aria-label="Remove line">×</button></td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><th class="num" id="qb-total">${S.fmtUSD(total)}</th><th></th></tr></tfoot></table></div>
      <div class="row"><button type="button" class="btn btn-sm btn-ghost" data-act="ql-add" data-r="${r.id}">Add charge</button><button type="button" class="btn btn-sm btn-ghost" data-act="ql-calc" data-r="${r.id}">Recalculate from aircraft rates</button></div>
      <div class="grid-3"><div class="field"><label for="qb-exp">Quotation expires</label><input type="date" id="qb-exp" min="${S.day(0)}" value="${h(st.expires)}"></div><div class="field"><label for="qb-dep">Deposit on acceptance (%)</label><input type="number" id="qb-dep" min="0" max="100" value="${h(st.depositPct)}"></div><div class="field"><label for="qb-bal">Balance due (days before departure)</label><input type="number" id="qb-bal" min="0" value="${h(st.balanceDueDays)}"></div></div>
      <div class="field"><label for="qb-can">Cancellation terms</label><textarea id="qb-can" rows="2">${h(st.cancellation)}</textarea></div><div class="field"><label for="qb-notes">Conditions</label><textarea id="qb-notes" rows="2">${h(st.notes)}</textarea></div><div class="field"><label for="qb-msg">Message to the client</label><input id="qb-msg" value="${h(st.message)}" placeholder="Optional"></div>
      <div class="row end"><button class="btn btn-gold">${st.replaces ? 'Send revised quotation' : 'Send quotation'}</button></div></form>`}`;
  }
  function calcLines(st, r) {
    const ac = S.aircraftById(st.aircraft); if (!ac) return;
    if (st.el) { st.lines = [{ label: 'Empty-leg fare (advertised)', usd: st.el.usd }]; }
    else st.lines = S.estimate(ac, r.legs).lines.map((l) => ({ label: l.label, usd: l.usd }));
    const svcPrice = { transfer: 450, catering: 620, pet: 380, ground: 900, assistance: 300, luggage: 250 };
    r.services.filter((s) => s.status !== 'declined' && svcPrice[s.id]).forEach((s) => st.lines.push({ label: 'Service: ' + svcLabel(s.id), usd: svcPrice[s.id] }));
  }
  function vAircraftForm(u, op, id) {
    const isNew = id === 'new'; const a = isNew ? { reg: '', name: '', manufacturer: '', model: '', category: 'midsize', base: op.base, year: new Date().getFullYear(), pax: '', rangeNm: '', cruiseKt: '', cabin: { length: '', width: '', height: '' }, luggageM3: '', hourlyUSD: '', amenities: [], photos: [], docs: [], status: 'draft', blurb: '' } : S.aircraftById(id);
    if (!a || (!isNew && a.operator !== op.id)) return empty('Aircraft not found', '');
    const f = (k, l, t, v, ex) => `<div class="field"><label for="af-${k}">${l}</label><input id="af-${k}" type="${t || 'text'}" value="${h(v)}" ${ex || ''}></div>`;
    return `<a class="back" href="#operator-fleet">← Fleet</a><div class="app-head"><p class="eyebrow">${isNew ? 'New aircraft' : h(a.reg)} ${isNew ? '' : pill(a.status)}</p><h1 tabindex="-1">${isNew ? 'Register an aircraft' : h(a.manufacturer + ' ' + a.model)}</h1></div>
    <form class="panel stack" data-form="aircraft" data-id="${isNew ? '' : a.id}" novalidate><h2>Specifications</h2><div class="grid-3">
      ${f('reg', 'Registration', 'text', a.reg, 'required')}${f('name', 'Display name', 'text', a.name)}${f('manufacturer', 'Manufacturer', 'text', a.manufacturer, 'required')}${f('model', 'Model', 'text', a.model, 'required')}
      <div class="field"><label for="af-category">Category</label><select id="af-category">${D.CATEGORIES.map((c) => `<option value="${c.id}" ${a.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      <div class="field"><label for="af-base">Home base</label><select id="af-base">${D.AIRPORTS.map((x) => `<option value="${x.iata}" ${a.base === x.iata ? 'selected' : ''}>${h(x.city)} · ${x.iata}</option>`).join('')}</select></div>
      ${f('year', 'Year of manufacture', 'number', a.year)}${f('pax', 'Passenger capacity', 'number', a.pax, 'min="1" max="19"')}${f('rangeNm', 'Maximum range (nm)', 'number', a.rangeNm)}${f('cruiseKt', 'Cruise speed (kt)', 'number', a.cruiseKt)}
      ${f('cabinLength', 'Cabin length (m)', 'number', a.cabin.length, 'step="0.01"')}${f('cabinWidth', 'Cabin width (m)', 'number', a.cabin.width, 'step="0.01"')}${f('cabinHeight', 'Cabin height (m)', 'number', a.cabin.height, 'step="0.01"')}${f('luggageM3', 'Luggage capacity (m³)', 'number', a.luggageM3, 'step="0.1"')}</div>
      <h2>Pricing</h2><div class="grid-3">${f('hourlyUSD', 'Hourly charter rate (USD)', 'number', a.hourlyUSD)}</div>
      <h2>Amenities</h2><div class="checks">${D.AMENITIES.map((x) => `<label class="check"><input type="checkbox" name="amen" value="${h(x)}" ${a.amenities.includes(x) ? 'checked' : ''}> ${h(x)}</label>`).join('')}</div>
      <div class="field"><label for="af-blurb">Description for clients</label><textarea id="af-blurb" rows="2">${h(a.blurb || '')}</textarea></div>
      <div class="row end"><button class="btn btn-gold">${isNew ? 'Save draft' : 'Save changes'}</button></div></form>
    ${isNew ? '' : `<section class="panel"><h2>Photographs</h2><p class="muted small">Exterior first. JPEG or PNG, resized in your browser to 1600 px.</p><div class="gallery">${a.photos.map((p, i) => `<figure><img src="${p}" alt="Photo ${i + 1}"><button class="link" data-act="photo-del" data-id="${a.id}" data-i="${i}">Remove</button></figure>`).join('')}</div>
      <label class="btn btn-sm file"><input type="file" accept="image/*" data-upload="photo" data-id="${a.id}" multiple> Add photographs</label></section>
    <section class="panel"><h2>Documentation</h2><ul class="plain">${a.docs.map((d, i) => `<li>${h(d.name)} <span class="muted small">added ${fmtDate(d.added, false)}</span> <button class="link" data-act="doc-del" data-id="${a.id}" data-i="${i}">Remove</button></li>`).join('') || '<li class="muted">No documents yet. Add the Certificate of Airworthiness, insurance and noise certificate.</li>'}</ul>
      <label class="btn btn-sm file"><input type="file" data-upload="doc" data-id="${a.id}" multiple> Upload documents</label>
      <div class="row mt">${['draft', 'rejected'].includes(a.status) ? `<button class="btn btn-gold btn-sm" data-act="ac-submit" data-id="${a.id}">Submit for verification</button>` : `<span class="muted small">Verification: ${pill(a.status)}</span>`}</div></section>`}`;
  }

  /* ---------------- admin ---------------- */
  function vAdmin(u, tab) {
    let c = '';
    const pendAc = S.db.aircraft.filter((a) => a.status === 'pending'), pendOp = S.db.operators.filter((o) => !o.verified);
    if (tab === 'overview') {
      const gmv = S.db.payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.usd, 0);
      c = `<div class="app-head"><p class="eyebrow">Platform</p><h1 tabindex="-1">Administration</h1></div>
      <div class="kpis">${kpi('Clients', S.db.users.filter((x) => x.role === 'customer').length)}${kpi('Operators', S.db.operators.length, pendOp.length + ' awaiting verification')}${kpi('Aircraft', S.db.aircraft.length, pendAc.length + ' awaiting verification')}${kpi('Open requests', S.db.requests.filter((r) => ['submitted', 'under-review', 'quoted'].includes(r.status)).length)}${kpi('Payments processed', S.fmtUSD(gmv))}</div>
      <section class="panel"><h2>All bookings</h2>${opBookTable(S.db.bookings)}</section>
      <section class="panel"><h2>Contact enquiries</h2>${(S.db.enquiries || []).length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Reference</th><th>Received</th><th>Name</th><th>Email</th><th>Phone</th><th>Arriving</th></tr></thead><tbody>${S.db.enquiries.map((e) => `<tr><td>${e.id}</td><td>${fmtDT(e.at)}</td><td>${h(e.name)}</td><td>${h(e.email)}</td><td>${h(e.phone)}</td><td>${h(e.arriving)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Enquiries sent from the Contact bar appear here.</p>'}</section>
      <p class="muted small">The brief you shared stops partway through the operator section, so administration covers verification, users and oversight. Tell us what else it should include.</p>`;
    }
    if (tab === 'verification') c = `<div class="app-head"><h1 tabindex="-1">Verification queue</h1></div>
      <section class="panel"><h2>Aircraft</h2>${pendAc.length ? pendAc.map((a) => `<div class="row between line"><span><b>${h(a.reg)}</b> ${h(a.manufacturer + ' ' + a.model)} · ${h(opName(a.operator))} · ${a.docs.length} document${a.docs.length === 1 ? '' : 's'}: ${a.docs.map((d) => h(d.name)).join(', ') || 'none'}</span><span><button class="btn btn-sm btn-gold" data-act="adm-ac" data-id="${a.id}" data-v="1">Verify</button><button class="btn btn-sm btn-ghost" data-act="adm-ac" data-id="${a.id}" data-v="0">Reject</button></span></div>`).join('') : '<p class="muted">Nothing waiting.</p>'}</section>
      <section class="panel"><h2>Operators</h2>${pendOp.length ? pendOp.map((o) => `<div class="row between line"><span><b>${h(o.name)}</b> · certificate ${h(o.aoc)} · base ${h(o.base)}</span><span><button class="btn btn-sm btn-gold" data-act="adm-op" data-id="${o.id}" data-v="1">Verify operator</button></span></div>`).join('') : '<p class="muted">All operators verified.</p>'}</section>`;
    if (tab === 'users') c = `<div class="app-head"><h1 tabindex="-1">Users and roles</h1></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organisation</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>${S.db.users.map((x) => `<tr><td>${h(x.name)}</td><td>${h(x.email)}</td><td><select aria-label="Role for ${h(x.name)}" data-act-change="adm-role" data-id="${x.id}" ${x.id === u.id ? 'disabled' : ''}>${['customer', 'operator', 'admin'].map((r2) => `<option ${x.role === r2 ? 'selected' : ''}>${r2}</option>`).join('')}</select></td><td>${h(x.operatorId ? opName(x.operatorId) : x.company || '')}</td><td>${fmtDate(x.created, false)}</td><td>${x.disabled ? pill('cancelled', 'Suspended') : pill('verified', 'Active')}</td><td>${x.id !== u.id ? `<button class="link" data-act="adm-dis" data-id="${x.id}">${x.disabled ? 'Reinstate' : 'Suspend'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    return dashShell('admin', tab, c, u);
  }

  /* ---------------- modals ---------------- */
  function payModal(b) {
    const dep = Math.max(0, S.depositDue(b) - S.paid(b.id)); const kind = dep > 0 ? 'deposit' : 'balance'; const amt = kind === 'deposit' ? dep : S.balance(b);
    modal(`<p class="eyebrow">Booking ${b.id}</p><h2>Pay ${kind === 'deposit' ? 'deposit' : 'balance'}: ${money(amt)}</h2><p class="muted small">You’ll be taken to the provider’s secure page to enter card or bank details. AIR NOIR never handles them.</p>
      <form data-form="pay" data-id="${b.id}" data-kind="${kind}"><fieldset class="gateways"><legend class="sr">Payment method</legend>${Object.entries(S.GATEWAYS).map(([k, g], i) => `<label class="gw"><input type="radio" name="gw" value="${k}" ${i === 0 ? 'checked' : ''}><b>${g.label}</b><span class="muted small">${g.note}</span></label>`).join('')}</fieldset>
      <div class="row end"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-gold">Continue to secure payment</button></div></form>
      <p class="muted small">Demo: no money moves. The payment provider is simulated and records a reference.</p>`);
  }
  function confirmationText(b) {
    const ac = S.aircraftById(b.aircraft); const owner = S.db.users.find((x) => x.id === b.customer);
    return [`AIR NOIR · Booking confirmation ${b.id}`, `Status: ${S.STATUS_LABEL[b.status]}`, `Client: ${owner?.name}`, `Aircraft: ${ac.manufacturer} ${ac.model} (${ac.reg})`, `Operator: ${opName(b.operator)}`,
      ...b.legs.map((l, i) => `Leg ${i + 1}: ${apText(l.from)} to ${apText(l.to)}, ${fmtDate(l.date)}${l.time ? ' ' + l.time : ''}`), `Total: ${S.fmtUSD(b.total)} · Paid: ${S.fmtUSD(S.paid(b.id))} · Outstanding: ${S.fmtUSD(b.status === 'cancelled' ? 0 : S.balance(b))}`,
      ...(b.journey?.fbo ? [`Terminal: ${b.journey.fbo}`] : []), 'This flight is operated under the operator’s air operator certificate.'].join('\n');
  }

  /* ---------------- events ---------------- */
  function afterRender(r) {
    const reg = $('form[data-form="register"]');
    if (reg) { const sync = () => $$('.op-only', reg).forEach((e) => { e.hidden = reg.role.value !== 'operator'; }); reg.addEventListener('change', sync); sync(); }
  }
  function readLegs(scope, state) {
    $$(`[data-scope="${scope}"][data-leg]`).forEach((inp) => {
      const i = +inp.dataset.leg, k = inp.dataset.k; if (!state.legs[i]) return;
      if (k === 'from' || k === 'to') { if (!inp.disabled) state.legs[i][k] = inp.dataset.code || resolveAp(inp.value); }
      else state.legs[i][k] = inp.value;
    });
    syncReturn(state);
  }
  function resolveAp(v) { v = String(v || '').trim().toLowerCase(); if (!v) return ''; const m = D.AIRPORTS.find((a) => a.iata.toLowerCase() === v || a.icao.toLowerCase() === v) || D.AIRPORTS.find((a) => a.city.toLowerCase() === v) || D.AIRPORTS.find((a) => (a.name + ' ' + a.city).toLowerCase().includes(v)); return m ? m.iata : ''; }
  function stateFor(scope) { return scope === 's' ? SS : NR; }

  document.addEventListener('click', (e) => {
    const opt = e.target.closest('.ap-opt'); if (opt) { pickAp(opt); return; }
    if (e.target.id === 'modal') { closeModal(); return; }
    const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'SELECT') return;
    const a = t.dataset.act, id = t.dataset.id, u = user();
    if (t.matches('input[type=checkbox]') && a !== 'ac-list') return;
    const needUser = () => { if (!u) { toast('Sign in to do that.'); sessionStorageSet('an-return', current()); go('signin'); return false; } return true; };
    switch (a) {
      case 'close': closeModal(); break;
      case 'logout': S.logout(); toast('Signed out'); go('signin'); break;
      case 'demo-login': attempt(() => S.login(t.dataset.email, 'noir2026')) && afterLogin(); break;
      case 'trip': { const st = stateFor(t.dataset.scope); readLegs(t.dataset.scope, st); setTrip(st, t.dataset.v); render(); break; }
      case 'leg-add': { const st = stateFor(t.dataset.scope); readLegs(t.dataset.scope, st); const l = st.legs[st.legs.length - 1]; st.legs.push({ from: l.to, to: '', date: l.date, time: '' }); render(); break; }
      case 'leg-del': { const st = stateFor(t.dataset.scope); readLegs(t.dataset.scope, st); st.legs.splice(+t.dataset.i, 1); render(); break; }
      case 'clear-filters': SS.f = { cats: [], minRange: 0, maxPrice: 0, base: '', amenities: [] }; render(); break;
      case 'fav': if (!needUser()) break; if (u.role !== 'customer') { toast('Saving aircraft is for client accounts.'); break; } toast(S.toggleFav(u, id) ? 'Saved to your aircraft' : 'Removed from saved aircraft'); render(); break;
      case 'compare': attempt(() => S.toggleCompare(id)) && render(); break;
      case 'fleet-cat': fleetCat = t.dataset.v; render(); break;
      case 'quote-from-search': readLegs('s', SS); startRequest({ trip: SS.trip, legs: SS.legs, pax: +SS.pax, category: SS.category, preferred: id, requirements: SS.requirements }); break;
      case 'quote-ac': startRequest({ trip: 'one-way', legs: [{ from: user()?.homeAirport || S.aircraftById(id).base, to: '', date: S.day(10), time: '' }], pax: 2, category: S.aircraftById(id).category, preferred: id }); break;
      case 'new-blank-request': startRequest({ trip: 'one-way', legs: [{ from: u?.homeAirport || 'HLA', to: '', date: S.day(10), time: '' }], pax: 2, category: '' }); break;
      case 'el-request': { const el = S.db.emptyLegs.find((x) => x.id === id); startRequest({ trip: 'one-way', legs: [{ from: el.from, to: el.to, date: el.date, time: el.time }], pax: Math.min(2, el.seats), category: '', preferred: el.aircraft, emptyLeg: el.id }); break; }
      case 'el-clear': Object.assign(EL, { from: '', to: '', date: '', max: '' }); render(); break;
      case 'q-accept': { const q = S.db.quotes.find((x) => x.id === id); modal(`<h2>Accept ${q.id}?</h2><p>You’ll book the ${h(S.aircraftById(q.aircraft).model)} with ${h(opName(q.operator))} for <b>${money(q.total)}</b>. A ${q.conditions.depositPct}% deposit (${money(q.total * q.conditions.depositPct / 100)}) is due now. Other proposals for this trip will be closed.</p><p class="small muted">${h(q.conditions.cancellation)}</p><div class="row end"><button class="btn btn-ghost" data-act="close">Not yet</button><button class="btn btn-gold" data-act="q-accept-go" data-id="${q.id}">Accept and continue to payment</button></div>`); break; }
      case 'q-accept-go': { const q = S.db.quotes.find((x) => x.id === id); const b = attempt(() => S.acceptQuote(u, q)); closeModal(); if (b) { toast('Quotation accepted. Booking ' + b.id + ' created.'); go('booking-' + b.id); setTimeout(() => payModal(b), 450); } break; }
      case 'q-decline': { modal(`<h2>Decline this quotation?</h2><form data-form="q-decline" data-id="${id}"><div class="field"><label for="qd-r">Reason (optional, shared with the operator)</label><input id="qd-r"></div><div class="row end"><button type="button" class="btn btn-ghost" data-act="close">Keep it</button><button class="btn">Decline quotation</button></div></form>`); break; }
      case 'q-amend': { modal(`<h2>Request an amendment</h2><form data-form="q-amend" data-id="${id}"><div class="field"><label for="qa-m">What should the operator change?</label><textarea id="qa-m" rows="3" placeholder="Depart 2 hours later, add a cabin attendant…"></textarea></div><div class="row end"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-gold">Send to operator</button></div></form>`); break; }
      case 'pay': payModal(S.db.bookings.find((x) => x.id === id)); break;
      case 'confirmation': { const b = S.db.bookings.find((x) => x.id === id); const txt = confirmationText(b); modal(`<div class="doc"><p class="doc-brand">AIR NOIR</p><pre>${h(txt)}</pre></div><div class="row end"><button class="btn btn-ghost" data-act="close">Close</button><button class="btn btn-gold" data-act="copy-conf" data-id="${b.id}">Copy confirmation</button></div><p class="muted small">Downloads are switched off in this preview, so copy the text into an email or document.</p>`); break; }
      case 'copy-conf': { const txt = confirmationText(S.db.bookings.find((x) => x.id === id)); const done = () => toast('Confirmation copied'); const fallback = () => { const pre = $('#modalBody pre'); const rng = document.createRange(); rng.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rng); toast('Text selected. Press Ctrl+C or ⌘C to copy.'); }; try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (er) { fallback(); } break; }
      case 'b-change': { const b = S.db.bookings.find((x) => x.id === id); const cancel = t.dataset.kind === 'cancel'; const rf = S.refundFor(b); modal(`<h2>${cancel ? 'Request cancellation' : 'Request a change'}</h2>${cancel ? `<p>Departure is in ${rf.days} days. Under the quotation terms you’d receive <b>${money(rf.usd)}</b> back (${Math.round(rf.pct * 100)}% of ${money(S.paid(b.id))} paid). The operator confirms the cancellation.</p>` : '<p class="muted">The operator will reply with any price difference.</p>'}<form data-form="b-change" data-id="${b.id}" data-kind="${cancel ? 'cancel' : 'modify'}"><div class="field"><label for="bc-t">${cancel ? 'Reason' : 'What would you like to change?'}</label><textarea id="bc-t" rows="3"></textarea></div><div class="row end"><button type="button" class="btn btn-ghost" data-act="close">Back</button><button class="btn ${cancel ? '' : 'btn-gold'}">${cancel ? 'Request cancellation' : 'Send request'}</button></div></form>`); break; }
      case 'pax-add': case 'pax-edit': { const p = a === 'pax-edit' ? u.passengers.find((x) => x.id === id) : { id: '', name: '', nationality: '', docExpiry: '', notes: '' }; modal(`<h2>${p.id ? 'Edit passenger' : 'Add passenger'}</h2><form data-form="pax" data-id="${p.id}"><div class="grid-2"><div class="field"><label for="px-n">Full name as on passport</label><input id="px-n" value="${h(p.name)}"></div><div class="field"><label for="px-c">Nationality</label><input id="px-c" value="${h(p.nationality)}"></div><div class="field"><label for="px-e">Passport expiry</label><input id="px-e" type="date" value="${h(p.docExpiry)}"></div><div class="field"><label for="px-o">Notes</label><input id="px-o" value="${h(p.notes)}" placeholder="Dietary, mobility, pets"></div></div><div class="row end"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-gold">Save passenger</button></div></form>`); break; }
      case 'pax-del': u.passengers = u.passengers.filter((x) => x.id !== id); S.save(); toast('Passenger removed'); render(); break;
      case 'reset-demo': modal(`<h2>Restore sample data?</h2><p>All requests, bookings and accounts created in this browser will be replaced with the original demo data.</p><div class="row end"><button class="btn btn-ghost" data-act="close">Keep my data</button><button class="btn btn-gold" data-act="reset-go">Restore sample data</button></div>`); break;
      case 'reset-go': S.reset(); closeModal(); toast('Sample data restored'); go('signin'); break;
      // operator
      case 'svc': { const r = S.db.requests.find((x) => x.id === t.dataset.r); S.setServiceStatus(r, +t.dataset.i, t.dataset.v); toast('Service ' + t.dataset.v); render(); break; }
      case 'ql-add': { readQB(t.dataset.r); QB[t.dataset.r].lines.push({ label: '', usd: 0 }); render(); break; }
      case 'ql-del': { readQB(t.dataset.r); QB[t.dataset.r].lines.splice(+t.dataset.i, 1); render(); break; }
      case 'ql-calc': { readQB(t.dataset.r); calcLines(QB[t.dataset.r], S.db.requests.find((x) => x.id === t.dataset.r)); render(); break; }
      case 'q-revise': { const q = S.db.quotes.find((x) => x.id === id); QB[t.dataset.r] = { aircraft: q.aircraft, lines: q.lines.map((l) => Object.assign({}, l)), expires: q.expires < S.day(0) ? S.day(3) : q.expires, depositPct: q.conditions.depositPct, balanceDueDays: q.conditions.balanceDueDays, cancellation: q.conditions.cancellation, notes: q.conditions.notes, message: q.message, replaces: q.id }; render(); toast('Editing ' + q.id + '. Send to issue version ' + (q.version + 1) + '.'); break; }
      case 'q-withdraw': { S.withdrawQuote(S.db.quotes.find((x) => x.id === id)); toast('Quotation withdrawn'); render(); break; }
      case 'op-approve': { S.approveBooking(S.db.bookings.find((x) => x.id === id)); toast('Booking approved'); render(); break; }
      case 'op-status': attempt(() => S.setBookingStatus(u, S.db.bookings.find((x) => x.id === id), t.dataset.v), 'Status updated') && render(); break;
      case 'op-eft': { const p = S.db.payments.find((x) => x.id === id); S.confirmEft(p); S.autoConfirm(S.db.bookings.find((x) => x.id === p.booking)); toast('Bank transfer confirmed'); render(); break; }
      case 'op-change': { S.resolveChange(S.db.bookings.find((x) => x.id === id), t.dataset.v === '1'); toast(t.dataset.v === '1' ? 'Request approved' : 'Request declined'); render(); break; }
      case 'ac-list': attempt(() => S.setListing(S.aircraftById(id), t.checked), t.checked ? 'Aircraft is live in search' : 'Aircraft hidden from search') ; render(); break;
      case 'ac-submit': attempt(() => S.submitForVerification(S.aircraftById(id)), 'Submitted to AIR NOIR for verification') && render(); break;
      case 'photo-del': { const ac = S.aircraftById(id); ac.photos.splice(+t.dataset.i, 1); S.save(); render(); break; }
      case 'doc-del': { const ac = S.aircraftById(id); ac.docs.splice(+t.dataset.i, 1); S.save(); render(); break; }
      case 'un-del': S.removeUnavailable(S.aircraftById(t.dataset.ac), id); toast('Dates released'); render(); break;
      case 'el-withdraw': { const el = S.db.emptyLegs.find((x) => x.id === id); el.status = 'withdrawn'; S.save(); toast('Empty leg withdrawn'); render(); break; }
      // admin
      case 'adm-ac': S.verifyAircraft(S.aircraftById(id), t.dataset.v === '1'); toast(t.dataset.v === '1' ? 'Aircraft verified and listed' : 'Aircraft rejected'); render(); break;
      case 'adm-op': S.verifyOperator(S.operator(id), true); toast('Operator verified'); render(); break;
      case 'adm-dis': { const x = S.db.users.find((y) => y.id === id); S.setDisabled(x, !x.disabled); toast(x.disabled ? 'Account suspended' : 'Account reinstated'); render(); break; }
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.filter) {
      const k = t.dataset.filter;
      if (k === 'cats' || k === 'amenities') { const arr = SS.f[k]; const i = arr.indexOf(t.value); if (t.checked && i < 0) arr.push(t.value); if (!t.checked && i >= 0) arr.splice(i, 1); }
      else SS.f[k] = t.type === 'number' ? +t.value || 0 : t.value;
      render(); return;
    }
    const a = t.dataset.actChange; if (!a) return;
    if (a === 'currency') { const u = user(); if (u) { u.prefs = u.prefs || {}; u.prefs.currency = t.value; S.save(); } else guestCurrency = t.value; readLegs('s', SS); render(); }
    if (a === 'sort') { SS.sort = t.value; render(); }
    if (a === 'qb-ac') { readQB(t.dataset.r); QB[t.dataset.r].aircraft = t.value; calcLines(QB[t.dataset.r], S.db.requests.find((x) => x.id === t.dataset.r)); render(); }
    if (a === 'adm-role') { S.setRole(S.db.users.find((x) => x.id === t.dataset.id), t.value); toast('Role updated'); render(); }
  });
  document.addEventListener('change', (e) => { if (e.target.dataset?.upload) handleUpload(e.target); });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList.contains('ap-input')) { t.dataset.code = ''; showApMenu(t); }
    if (t.dataset.ql !== undefined) { const f = t.closest('form'); const r = f?.dataset.r; if (r) { readQB(r); const tot = QB[r].lines.reduce((s, l) => s + (+l.usd || 0), 0); const el = $('#qb-total'); if (el) el.textContent = S.fmtUSD(tot); } }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    const t = e.target; if (!t.classList?.contains('ap-input')) return;
    const menu = t.parentElement.querySelector('.ap-menu'); if (menu.hidden) return;
    const opts = $$('.ap-opt', menu); let i = opts.findIndex((o) => o.classList.contains('hi'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); opts[i]?.classList.remove('hi'); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; opts[i]?.classList.add('hi'); opts[i]?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && opts.length) { e.preventDefault(); pickAp(opts[Math.max(0, i)]); }
    if (e.key === 'Escape') menu.hidden = true;
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target; if (!t.classList?.contains('ap-input')) return;
    setTimeout(() => { const m = t.parentElement?.querySelector('.ap-menu'); if (m) m.hidden = true; if (!t.dataset.code && t.value && t.dataset.fmt !== 'city') { const c = resolveAp(t.value); if (c) { t.dataset.code = c; t.value = apText(c); } } }, 160);
  });
  function showApMenu(inp) {
    const q = inp.value.trim().toLowerCase(); const menu = inp.parentElement.querySelector('.ap-menu');
    if (q.length < 2) { menu.hidden = true; return; }
    const m = D.AIRPORTS.filter((a) => [a.iata, a.icao, a.city, a.name, a.country].some((v) => v.toLowerCase().includes(q))).slice(0, 7);
    menu.innerHTML = m.length ? m.map((a, i) => `<div class="ap-opt ${i === 0 ? 'hi' : ''}" role="option" data-code="${a.iata}"><b>${h(a.city)}</b> <span class="code">${a.iata} · ${a.icao}</span><br><span class="muted small">${h(a.name)}, ${h(a.country)}</span></div>`).join('') : '<div class="ap-none muted small">No supported airport matches. Try a city or IATA code.</div>';
    menu.hidden = false;
  }
  function pickAp(opt) { const inp = opt.closest('.ap').querySelector('.ap-input'); inp.dataset.code = opt.dataset.code; const A = S.airport(opt.dataset.code); inp.value = inp.dataset.fmt === 'city' ? (A.city === A.country ? A.city : `${A.city}, ${A.country}`) : apText(opt.dataset.code); opt.parentElement.hidden = true;
    if (inp.dataset.scope) { const st = stateFor(inp.dataset.scope); readLegs(inp.dataset.scope, st); if (st.trip === 'return' && inp.dataset.leg === '0') render(); } }
  function readQB(rid) {
    const st = QB[rid]; const f = $(`form[data-form="quote"][data-r="${rid}"]`); if (!st || !f) return;
    $$('[data-ql]', f).forEach((i) => { const l = st.lines[+i.dataset.ql]; if (l) l[i.dataset.k] = i.dataset.k === 'usd' ? Number(i.value) : i.value; });
    st.expires = $('#qb-exp').value; st.depositPct = +$('#qb-dep').value; st.balanceDueDays = +$('#qb-bal').value; st.cancellation = $('#qb-can').value; st.notes = $('#qb-notes').value; st.message = $('#qb-msg').value;
  }
  function handleUpload(inp) {
    const ac = S.aircraftById(inp.dataset.id); const files = Array.from(inp.files || []); if (!files.length) return;
    if (inp.dataset.upload === 'doc') { files.forEach((f) => ac.docs.push({ name: f.name, size: f.size, added: S.day(0) })); if (ac.status === 'verified') ac.status = 'pending'; S.save(); toast(files.length + ' document' + (files.length > 1 ? 's' : '') + ' added'); render(); return; }
    let left = files.length;
    files.slice(0, 6).forEach((f) => { const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ac.photos.push(c.toDataURL('image/jpeg', 0.78)); if (--left <= 0) { S.save(); toast('Photographs added'); render(); } }; img.onerror = () => { if (--left <= 0) render(); toast('One file wasn’t a readable image', 'bad'); }; img.src = rd.result; }; rd.readAsDataURL(f); });
  }
  function afterLogin() {
    const u = user(); toast('Welcome, ' + u.name.split(' ')[0]);
    const back = sessionStorageGet('an-return'); sessionStorageSet('an-return', '');
    go(back && back !== 'signin' ? back : u.role === 'operator' ? 'operator' : u.role === 'admin' ? 'admin' : 'account');
  }

  document.addEventListener('submit', (e) => {
    const f = e.target; const k = f.dataset.form; if (!k) return; e.preventDefault();
    const u = user(); const v = (id) => $('#' + id, f)?.value ?? '';
    switch (k) {
      case 'search': readLegs('s', SS); SS.pax = Math.max(1, Math.min(19, +v('s-pax') || 1)); SS.category = v('s-cat'); SS.requirements = v('s-req');
        if (SS.legs.some((l) => !l.from || !l.to || !l.date)) { toast('Choose airports and a date for every leg.', 'bad'); render(); break; }
        SS.ran = true; render(); setTimeout(() => $('.result-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); break;
      case 'el-filter': EL.from = $('#el-from').dataset.code || resolveAp($('#el-from').value); EL.to = $('#el-to').dataset.code || resolveAp($('#el-to').value); EL.date = v('el-date'); EL.max = v('el-max'); render(); break;
      case 'signin': attempt(() => S.login(v('si-email'), v('si-pw'))) && afterLogin(); break;
      case 'register': if (!$('#rg-terms').checked) { toast('Accept the terms to create an account.', 'bad'); break; }
        attempt(() => S.register({ role: f.role.value, name: v('rg-name'), email: v('rg-email'), phone: v('rg-phone'), company: v('rg-company'), password: v('rg-pw'), aoc: v('rg-aoc') })) && afterLogin(); break;
      case 'reset-1': { resetEmail = v('rs-email'); const code = S.requestReset(resetEmail); modal(`<h2>Check your email</h2><p>If an account exists for ${h(resetEmail)}, a 6-digit code is on its way. It expires in 15 minutes.</p>${code ? `<p class="note small">Demo mode has no email service, so here is the code: <b>${code}</b></p>` : ''}<div class="row end"><button class="btn btn-gold" data-act="close">Enter code</button></div>`); break; }
      case 'reset-2': attempt(() => S.completeReset(resetEmail || v('rs-email'), v('rs-code'), v('rs-pw')), 'Password updated. Sign in with your new password.') && go('signin'); break;
      case 'request': {
        if (!NR.emptyLeg) readLegs('r', NR);
        NR.pax = +v('r-pax'); NR.category = v('r-cat'); NR.preferred = NR.emptyLeg ? NR.preferred : v('r-pref'); NR.requirements = v('r-reqs');
        NR.passengers = $$('input[name="pax-list"]:checked', f).map((x) => x.value);
        NR.services = {}; $$('input[name="svc"]:checked', f).forEach((x) => { NR.services[x.value] = $(`[data-svc="${x.value}"]`, f).value; });
        if (NR.emptyLeg) { const el = S.db.emptyLegs.find((x) => x.id === NR.emptyLeg); if (NR.pax > el.seats) { toast(`This empty leg has ${el.seats} seats.`, 'bad'); break; } }
        const r = attempt(() => S.createRequest(u, { trip: NR.trip, legs: NR.legs, pax: NR.pax, category: NR.category, preferred: NR.preferred, passengers: NR.passengers, services: Object.entries(NR.services).map(([id, note]) => ({ id, note })), requirements: NR.requirements, emptyLeg: NR.emptyLeg }));
        if (r) { toast('Request ' + r.id + ' sent to operators'); go('request-' + r.id); } break;
      }
      case 'q-decline': S.declineQuote(u, S.db.quotes.find((x) => x.id === f.dataset.id), v('qd-r')); closeModal(); toast('Quotation declined'); render(); break;
      case 'q-amend': if (attempt(() => S.amendQuote(u, S.db.quotes.find((x) => x.id === f.dataset.id), v('qa-m')), 'Amendment request sent')) { closeModal(); render(); } break;
      case 'pay': { const b = S.db.bookings.find((x) => x.id === f.dataset.id); const gw = f.gw.value; const label = S.GATEWAYS[gw].label;
        $('#modalBody').innerHTML = `<div class="gw-redirect"><p class="eyebrow">Secure checkout</p><h2>Connecting to ${h(label)}…</h2><div class="spinner" aria-hidden="true"></div><p class="muted small">In a live deployment you would now be on ${h(label)}’s own page.</p></div>`;
        setTimeout(() => { const p = attempt(() => S.recordPayment(u, b, gw, f.dataset.kind)); if (p) { const conf = S.autoConfirm(b); closeModal(); toast(p.status === 'pending' ? 'Bank transfer details sent. We’ll confirm once it clears.' : `Payment received${conf ? '. Your flight is confirmed.' : '.'}`); render(); } else closeModal(); }, 1400); break; }
      case 'b-change': if (attempt(() => S.requestChange(u, S.db.bookings.find((x) => x.id === f.dataset.id), f.dataset.kind, v('bc-t')), 'Request sent to the operator')) { closeModal(); render(); } break;
      case 'pax': { const name = v('px-n').trim(); if (name.length < 2) { toast('Enter the passenger’s full name.', 'bad'); break; } const data = { name, nationality: v('px-c'), docExpiry: v('px-e'), notes: v('px-o') };
        if (f.dataset.id) Object.assign(u.passengers.find((x) => x.id === f.dataset.id), data); else u.passengers.push(Object.assign({ id: S.uid('p') }, data)); S.save(); closeModal(); toast('Passenger saved'); render(); break; }
      case 'profile': S.updateProfile(u, { name: v('pf-name'), phone: v('pf-phone'), company: v('pf-company'), homeAirport: v('pf-home'), prefs: { currency: v('pf-cur'), catering: v('pf-cat'), emailUpdates: $('#pf-em').checked, smsUpdates: $('#pf-sms').checked } }); toast('Details saved'); render(); break;
      case 'password': if (attempt(() => S.changePassword(u, v('pw-old'), v('pw-new')), 'Password changed')) f.reset(); break;
      case 'quote': { const rid = f.dataset.r; readQB(rid); const st = QB[rid]; const q = attempt(() => S.sendQuote(u, { request: rid, aircraft: st.aircraft, lines: st.lines, expires: st.expires, depositPct: st.depositPct, balanceDueDays: st.balanceDueDays, cancellation: st.cancellation, notes: st.notes, message: st.message, replaces: st.replaces }));
        if (q) { delete QB[rid]; toast(`${q.id} v${q.version} sent to the client`); render(); } break; }
      case 'journey': { const b = S.db.bookings.find((x) => x.id === f.dataset.id); b.journey = Object.assign(b.journey || {}, { crew: v('j-crew'), fbo: v('j-fbo'), departure: v('j-dep'), notes: v('j-notes') }); b.log.push({ at: S.now(), text: 'Journey information updated' }); S.save(); toast('Journey information updated'); render(); break; }
      case 'aircraft': { const id = f.dataset.id; const data = { id: id || undefined, specChanged: true, amenities: $$('input[name="amen"]:checked', f).map((x) => x.value) };
        ['reg', 'name', 'manufacturer', 'model', 'category', 'base', 'year', 'pax', 'rangeNm', 'cruiseKt', 'cabinLength', 'cabinWidth', 'cabinHeight', 'luggageM3', 'hourlyUSD', 'blurb'].forEach((k2) => { data[k2] = v('af-' + k2); });
        const before = id ? JSON.stringify(S.aircraftById(id)) : ''; const ac = attempt(() => S.saveAircraft(u, data));
        if (ac) { if (id && before && S.aircraftById(id).status === 'pending' && JSON.parse(before).status === 'verified') toast('Saved. Specification changes go back to AIR NOIR for verification.'); else toast(id ? 'Aircraft updated' : 'Draft saved. Add photographs and documents next.'); go('operator-aircraft-' + ac.id); } break; }
      case 'unavail': { const acId = f.dataset.ac; attempt(() => S.addUnavailable(S.aircraftById(acId), { from: v('u-f-' + acId), to: v('u-t-' + acId), kind: v('u-k-' + acId), note: v('u-n-' + acId) }), 'Dates blocked') && render(); break; }
      case 'el-new': attempt(() => S.saveEmptyLeg(u, { aircraft: v('eln-ac'), from: $('#eln-from').dataset.code || resolveAp($('#eln-from').value), to: $('#eln-to').dataset.code || resolveAp($('#eln-to').value), date: v('eln-date'), time: v('eln-time'), seats: v('eln-seats'), usd: v('eln-usd'), expires: v('eln-exp'), flexible: v('eln-flex') }), 'Empty leg published') && render(); break;
    }
  });
  $('#modalClose')?.addEventListener('click', closeModal);
  window.addEventListener('hashchange', render);
  window.AN_APP = { render, go, toast, startSearch: (o) => { window.AN_SEARCH_PREFILL(o); go('search'); } };
  render();
})();
