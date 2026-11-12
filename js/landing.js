/* AIR NOIR — cinematic landing: intro, window zoom, cloud sky, manifesto, jet rise, experience, globe. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const ART = window.AN_ART;

  // Artwork slots: generated imagery can replace these by setting window.AN_ASSETS before this script.
  const ASSETS = Object.assign({ jetTop: null, clouds: null }, window.AN_ASSETS || {});
  $('#jetArt').innerHTML = ART.jetTop();
  $('#jetGhost').innerHTML = ART.jetTop({ label: '' });
  $('#jetBlueprint').innerHTML = ART.blueprint({ cls: 'bp-svg' });
  $$('[data-icon]').forEach((el) => { el.innerHTML = ART.icons[el.dataset.icon] || ''; });

  /* ---------- split text helpers ---------- */
  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/); el.setAttribute('aria-label', el.textContent.trim()); el.textContent = '';
    words.forEach((w, wi) => {
      const ws = document.createElement('span'); ws.className = 'w'; ws.setAttribute('aria-hidden', 'true');
      [...w].forEach((ch) => { const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; ws.appendChild(c); });
      el.appendChild(ws); if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return $$('.ch', el);
  }
  function splitWords(el) {
    const txt = el.textContent.trim(); el.setAttribute('aria-label', txt); el.textContent = '';
    txt.split(/\s+/).forEach((w, i, a) => { const s = document.createElement('span'); s.className = 'mw'; s.setAttribute('aria-hidden', 'true'); s.textContent = w; el.appendChild(s); if (i < a.length - 1) el.appendChild(document.createTextNode(' ')); });
    return $$('.mw', el);
  }

  /* ---------- sky shader ---------- */
  // Sky after the window: the client's own sunset clouds, pushed in by scroll and darkened toward dusk.
  const sky = (function () {
    const ph = $('#skyPhoto'), dusk = $('#skyDusk'); const st = { K: 0, P: 0 };
    const apply = () => { ph.style.transform = `scale(${(1.06 + st.P * 0.1).toFixed(4)}) translate3d(0, ${(-st.P * 2.5).toFixed(3)}%, 0)`; dusk.style.opacity = (0.18 + st.K * 0.85).toFixed(3); };
    apply();
    return { set(k, v) { st[k] = v; apply(); }, run() {}, stop() {} };
  })();

  /* ---------- globe ---------- */
  const globe = (function () {
    const cv = $('#globe'); const ctx = cv.getContext('2d'); const L = window.AN_LAND; const dots = [];
    if (L) { const bin = atob(L.b64); for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) { const k = j * L.W + i; if ((bin.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1) { if ((i + j) % 1 === 0) dots.push([(90 - L.S / 2 - j * L.S) * Math.PI / 180, (-180 + L.S / 2 + i * L.S) * Math.PI / 180]); } } }
    const D = window.AN_DATA; const hub = D.AIRPORTS.find((a) => a.iata === 'HLA');
    const dests = ['CPT', 'FAB', 'DXB', 'NCE', 'MRU', 'TEB', 'ZNZ', 'GVA', 'JMK', 'SIN', 'VFA', 'LOS', 'SEZ', 'ASE', 'MLE', 'GRU'].map((c) => D.AIRPORTS.find((a) => a.iata === c));
    const r = Math.PI / 180; let W = 0, H = 0, R = 0, cx = 0, cy = 0;
    function size() { const q = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * q; cv.height = H * q; ctx.setTransform(q, 0, 0, q, 0, 0); R = Math.min(W, H) * 0.46; cx = W / 2; cy = H / 2; }
    function proj(lat, lon, rot, tilt) { const cl = Math.cos(lat), x = cl * Math.sin(lon - rot), y0 = Math.sin(lat), z0 = cl * Math.cos(lon - rot); const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt), z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt); return [cx + x * R, cy - y * R, z]; }
    function v3(lat, lon) { return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]; }
    function draw(rot, tilt, arcT) {
      if (!W) size(); ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05); g.addColorStop(0, '#2a241c'); g.addColorStop(0.6, '#110f0c'); g.addColorStop(1, '#070605');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      const rim = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.08); rim.addColorStop(0, 'rgba(201,179,126,0)'); rim.addColorStop(0.5, 'rgba(201,179,126,.22)'); rim.addColorStop(1, 'rgba(201,179,126,0)');
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, 7); ctx.fill();
      const ds = Math.max(1, R / 260);
      for (const [lat, lon] of dots) { const [x, y, z] = proj(lat, lon, rot, tilt); if (z <= 0) continue; ctx.fillStyle = `rgba(230,214,174,${0.12 + z * 0.62})`; ctx.fillRect(x - ds * 0.6, y - ds * 0.6, ds * 1.2, ds * 1.2); }
      // arcs from Johannesburg
      const a = v3(hub.lat * r, hub.lon * r);
      dests.forEach((d, i) => {
        const b = v3(d.lat * r, d.lon * r); const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])); const om = Math.acos(dot); if (om < 0.01) return;
        const prog = Math.max(0, Math.min(1, arcT * 1.6 - i * 0.05)); if (prog <= 0) return; const N = 40; ctx.beginPath(); let started = false;
        for (let s = 0; s <= N * prog; s++) { const t = s / N; const k1 = Math.sin((1 - t) * om) / Math.sin(om), k2 = Math.sin(t * om) / Math.sin(om); const p = [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]; const lift = 1 + 0.18 * Math.sin(Math.PI * t) * Math.min(1, om); const lat = Math.asin(p[1]), lon = Math.atan2(p[2], p[0]);
          const [x, y, z] = proj(lat, lon, rot, tilt); const X = cx + (x - cx) * lift, Y = cy + (y - cy) * lift; if (z > -0.05) { if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y); } else started = false; }
        ctx.strokeStyle = 'rgba(230,214,174,.75)'; ctx.lineWidth = 1; ctx.stroke();
        const [ex, ey, ez] = proj(d.lat * r, d.lon * r, rot, tilt); if (prog >= 1 && ez > 0) { ctx.fillStyle = '#E6D6AE'; ctx.beginPath(); ctx.arc(ex, ey, 2.2, 0, 7); ctx.fill(); }
      });
      const [hx, hy, hz] = proj(hub.lat * r, hub.lon * r, rot, tilt); if (hz > 0) { ctx.strokeStyle = '#E6D6AE'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.stroke(); ctx.fillStyle = '#E6D6AE'; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, 7); ctx.fill(); }
    }
    addEventListener('resize', () => { W = 0; });
    return { draw };
  })();

  /* ---------- no-GSAP / reduced fallback ---------- */
  const lenisOk = !!window.Lenis && !reduce;
  let lenis = null;
  if (!hasGsap) {
    document.documentElement.classList.add('static');
    $('#intro').remove(); globe.draw(-0.4, -0.35, 1); window.AN_LANDING = { pause() {}, resume() {} };
    wireCommon(); return;
  }
  const { gsap, ScrollTrigger } = window; gsap.registerPlugin(ScrollTrigger);
  if (lenisOk) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, prevent: (node) => !!node.closest?.('#app, .modal, .book-panel') });
    lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => { if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) }); else (typeof target === 'number' ? scrollTo2(target) : $(target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })); };
  const scrollTo2 = (y) => window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });

  /* ---------- intro ---------- */
  const hlA = splitChars($('#hlA1')).concat(splitChars($('#hlA2')));
  const hlB = splitChars($('#hlB1')).concat(splitChars($('#hlB2')));
  const startAtTop = (window.scrollY || 0) < 40 && !location.hash.slice(1);
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  if (lenis && startAtTop) lenis.stop();
  document.documentElement.classList.add('intro-on');
  intro
    .fromTo('#introTxt > *', { opacity: 0, filter: 'blur(14px)', y: 14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.1, stagger: 0.14 }, 0.25)
    .to('#introTxt > *', { opacity: 0, filter: 'blur(10px)', y: -8, duration: 0.6, stagger: 0.06, ease: 'power2.in' }, 1.9)
    .fromTo('.win-photo', { scale: 0.62, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5, ease: 'expo.out' }, 2.25)
    .fromTo('.win-wall', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 2.1)
    .to('#intro', { opacity: 0, duration: 0.6, onComplete: () => $('#intro')?.remove() }, 2.4)
    .fromTo('#shade', { y: 0 }, { y: -820, duration: 1.6, ease: 'power3.inOut' }, 3.0)
    .fromTo('#glassMark', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9, clearProps: 'filter' }, 3.7)
    .fromTo('.nav', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.9 }, 3.5)
    .fromTo(hlA, { opacity: 0, filter: 'blur(12px)', x: -12 }, { opacity: 1, filter: 'blur(0px)', x: 0, duration: 0.9, stagger: 0.025, clearProps: 'all' }, 3.7)
    .fromTo(hlB, { opacity: 0, filter: 'blur(12px)', x: 12 }, { opacity: 1, filter: 'blur(0px)', x: 0, duration: 0.9, stagger: 0.025, clearProps: 'all' }, 3.95)
    .fromTo('.hero-foot > *', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 4.2)
    .fromTo('.book-pill', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8 }, 4.3)
    .add(() => { lenis?.start(); document.documentElement.classList.remove('intro-on'); }, 4.4);
  if (reduce || !startAtTop) intro.progress(1); else intro.play();
  const skip = () => { if (intro.isActive()) intro.timeScale(5); };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, skip, { once: true, passive: true }));

  /* ---------- hero: zoom through the window ---------- */
  const mm = gsap.matchMedia();
  // Scale at which the photo's glass (538 x 736 of 816 x 1456) fills the viewport.
  function glassCoverScale() {
    const ph = $('.win-photo').getBoundingClientRect(); const k = ph.height / 1456 / (gsap.getProperty('#win', 'scale') || 1);
    const gw = 538 * k, gh = 736 * k;
    return Math.max(innerWidth / (gw * 0.84), innerHeight / (gh * 0.84)) * 1.06;
  }
  gsap.set('.nav-mark', { opacity: 0 });
  const heroTl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
    onUpdate: (st) => { sky.set('P', st.progress * 0.6); } } });
  heroTl
    .to('#win', { scale: () => glassCoverScale(), ease: 'power2.in', duration: 1 }, 0)
    .to('#hlA', { xPercent: -70, opacity: 0, ease: 'power1.in', duration: 0.6 }, 0.05)
    .to('#hlB', { xPercent: 70, opacity: 0, ease: 'power1.in', duration: 0.6 }, 0.05)
    .to('.hero-foot', { opacity: 0, y: 30, duration: 0.3 }, 0)
    .to('#glassMark', { y: () => -(innerHeight / 2 - 34), scale: 0.42, ease: 'power2.inOut', duration: 0.75 }, 0.1)
    .to('#glassMark', { opacity: 0, duration: 0.08 }, 0.86)
    .to('.nav-mark', { opacity: 1, duration: 0.08 }, 0.85)
    .to('.wall-glow', { opacity: 0, duration: 0.5 }, 0.4)
    .to('#win', { opacity: 0, ease: 'power1.in', duration: 0.16 }, 0.84);

  /* ---------- sky progression and manifesto ---------- */
  ScrollTrigger.create({ trigger: '#manifesto', start: 'top bottom', end: 'bottom top', scrub: true, onUpdate: (st) => { sky.set('K', st.progress * 0.75); sky.set('P', 0.6 + st.progress * 1.4); } });
  ScrollTrigger.create({ trigger: '#jet', start: 'top -20%', onEnter: () => sky.stop(), onLeaveBack: () => sky.run() });
  const mWords = splitWords($('#manifestoText'));
  // Each word sharpens out of a blur as it rises through the lower part of the screen (reference screenshot).
  mWords.forEach((w) => {
    gsap.fromTo(w, { opacity: 0.06, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0px)', ease: 'none', immediateRender: true,
      scrollTrigger: { trigger: w, start: 'top 98%', end: 'top 58%', scrub: 0.6 } });
  });
  gsap.fromTo('.pillar', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: '.pillars', start: 'top 85%', end: 'top 45%', scrub: true } });
  

  /* ---------- jet rise, spec sheet, blueprint ---------- */
  // Mirrors the reference: words rise with the page and pin; the jet climbs in oversized, nose first,
  // passes between the words, holds while they drift away, then pulls back into the spec sheet and floor plan.
  const big = () => Math.max(1.3, (innerWidth * 1.12) / ($('#jetStage').offsetWidth || 1));
  const nav = $('.nav');
  // Start states are set once and only .to() tweens follow, so a layout refresh (fonts, images) can never drop them.
  const jetStart = () => gsap.set('#jetStage', { y: innerHeight * 1.25, scale: big() });
  jetStart(); gsap.set('.spec-a, .spec-b', { y: 30 }); gsap.set('#jetStage', { '--dz': '-35%' });
  const jetTl = gsap.timeline({ scrollTrigger: { trigger: '#jet', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true, onUpdate: (st) => nav.classList.toggle('on-light-jet', st.progress > 0.84), onLeave: () => nav.classList.add('on-light-jet'), onLeaveBack: () => nav.classList.remove('on-light-jet') } });
  ScrollTrigger.create({ trigger: '#experience', start: 'top 60px', end: 'bottom 60px', toggleClass: { targets: '.nav', className: 'on-light' }, onLeave: () => nav.classList.remove('on-light-jet'), onEnterBack: () => nav.classList.remove('on-light-jet'), onLeaveBack: () => nav.classList.add('on-light-jet') });
  jetTl
    .to('#jetStage', { y: () => -innerHeight * 0.06, scale: () => big(), ease: 'none', duration: 0.34 }, 0)
    .to('.fly-wrap', { y: () => innerHeight * 0.55, ease: 'power1.in', duration: 0.16 }, 0.3)
    .to('.fly-wrap', { opacity: 0, duration: 0.06 }, 0.4)
    .to('#jetStage', { y: () => -innerHeight * 0.1, ease: 'none', duration: 0.1 }, 0.34)
    .to('#jetStage', { y: () => -innerHeight * 0.03, scale: 0.74, ease: 'power2.inOut', duration: 0.18 }, 0.44)
    .to('.spec-a', { opacity: 1, y: 0, duration: 0.08, stagger: 0.025 }, 0.54)
    .to('.spec-b', { opacity: 1, y: 0, duration: 0.08, stagger: 0.02 }, 0.58)
    // Dissolve: a soft, smeared edge travels from the tail to the nose and leaves the floor plan behind.
    .to('#jetBlueprint', { opacity: 1, duration: 0.04 }, 0.62)
    .to('#jetStage', { '--dz': '135%', ease: 'none', duration: 0.17 }, 0.64)
    // Hand over to the ivory section: the hangar brightens to paper and the plan turns to ink, so no edge cuts the aircraft.
    .to('.jet-paper', { opacity: 1, ease: 'none', duration: 0.08 }, 0.8)
    .to('#jetBlueprint', { color: '#3b3329', ease: 'none', duration: 0.12 }, 0.8)
    .to('#jet .spec, #jet .spec-title h2', { color: '#17140F', ease: 'none', duration: 0.12 }, 0.8)
    .to('#jet .spec-stats dt, #jet .spec-title p, #jet .spec-kicker p', { color: '#6A6152', ease: 'none', duration: 0.12 }, 0.8)
    .to('#jet .spec-link .btn', { color: '#17140F', borderColor: 'rgba(23,20,15,.3)', ease: 'none', duration: 0.12 }, 0.8)
    .to({}, { duration: 0.06 }, 0.94);
  // The sky dissolves into the hangar light instead of cutting away.
  gsap.fromTo('#jet .jet-bg', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '#jet', start: 'top bottom', end: 'top 10%', scrub: true } });

  /* ---------- experience ---------- */
  gsap.fromTo('.exp-head > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, scrollTrigger: { trigger: '#experience', start: 'top 75%', toggleActions: 'play none none reverse' } });

  /* ---------- global ---------- */
  const gstate = { rot: -0.2, arc: 0 };
  gsap.set('.global-cta > *', { opacity: 0, y: 24 });
  gsap.set('#globeWrap', { y: innerHeight * 0.38, scale: 0.9 }); gsap.set('.global-word', { yPercent: 30, opacity: 0.4 }); gsap.set('#ticket', { y: innerHeight * 0.95 }); gsap.set('.ticker', { opacity: 0 });
  const gTl = gsap.timeline({ scrollTrigger: { trigger: '#global', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
    onUpdate: (st) => { gstate.arc = Math.min(1, st.progress * 2.2); gstate.rot = -0.2 - st.progress * 1.2; } } });
  gTl.to('#globeWrap', { y: () => innerHeight * 0.1, scale: 1, ease: 'power1.out', duration: 1 }, 0)
    .to('.global-word', { yPercent: -8, opacity: 1, ease: 'none', duration: 1 }, 0)
    .to('#ticket', { y: () => -innerHeight * 1.05, ease: 'none', duration: 0.9 }, 0.05)
    .to('.ticker', { opacity: 1, duration: 0.1 }, 0)
    .to('.ticker', { opacity: 0, duration: 0.1 }, 0.82)
    .to('.global-cta > *', { opacity: 1, y: 0, stagger: 0.04, duration: 0.12 }, 0.84);
  let gOn = false, gLast = 0;
  ScrollTrigger.create({ trigger: '#global', start: 'top bottom', end: 'bottom top', onToggle: (st) => { gOn = st.isActive; if (gOn) requestAnimationFrame(gLoop); } });
  function gLoop(t) { if (!gOn) return; const auto = reduce ? 0 : t / 1000 * 0.05; if (t - gLast > 16) { globe.draw(gstate.rot - auto, -0.38, gstate.arc); gLast = t; } requestAnimationFrame(gLoop); }
  globe.draw(-0.2, -0.38, 0);

  window.AN_LANDING = {
    pause() { lenis?.stop(); document.documentElement.classList.add('app-open'); sky.stop(); },
    resume() { document.documentElement.classList.remove('app-open'); lenis?.start(); if (ScrollTrigger.isInViewport?.('#hero') || scrollY < innerHeight * 6) sky.run(); ScrollTrigger.refresh(); },
    scrollTo
  };
  wireCommon();
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ---------- shared wiring (nav, ticker, accordion, clock, booking bar) ---------- */
  function wireCommon() {
    // Nav section links
    $$('[data-scroll]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); closeMenu();
      const go = () => { const t = $(b.dataset.scroll); if (!t) return; const y = t.getBoundingClientRect().top + scrollY + (+b.dataset.offset || 0) * innerHeight; (window.AN_LANDING?.scrollTo || scrollTo2)(y); };
      if (location.hash.slice(1)) { history.pushState('', document.title, location.pathname + location.search); dispatchEvent(new HashChangeEvent('hashchange')); setTimeout(go, 420); } else go();
    }));
    const menuBtn = $('#menuBtn'), drawer = $('#drawer');
    function closeMenu() { drawer.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('menu-open'); }
    menuBtn.addEventListener('click', () => { const open = drawer.hidden; drawer.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); document.documentElement.classList.toggle('menu-open', open); });
    $$('#drawer a').forEach((a) => a.addEventListener('click', closeMenu));
    // City ticker
    const cities = ['Cape Town', 'London', 'Dubai', 'Nice', 'Mauritius', 'New York', 'Zanzibar', 'Geneva', 'Mykonos', 'Singapore', 'Victoria Falls', 'Seychelles', 'Aspen', 'Malé'];
    const track = $('#tickerTrack'); track.innerHTML = cities.concat(cities[0]).map((c) => `<span>${c}</span>`).join('');
    let ci = 0; const step = () => { const lh = track.firstElementChild.getBoundingClientRect().height; ci++; track.style.transition = 'transform .7s cubic-bezier(.7,0,.2,1)'; track.style.transform = `translateY(${-ci * lh}px)`; if (ci === cities.length) setTimeout(() => { track.style.transition = 'none'; ci = 0; track.style.transform = 'translateY(0)'; }, 760); };
    if (!reduce) setInterval(step, 1900);
    // Accordion
    $$('.acc-btn').forEach((btn) => btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item'); const open = btn.getAttribute('aria-expanded') === 'true';
      $$('.acc-item').forEach((it) => { it.querySelector('.acc-btn').setAttribute('aria-expanded', 'false'); it.querySelector('.acc-panel').hidden = true; });
      if (!open) { btn.setAttribute('aria-expanded', 'true'); item.querySelector('.acc-panel').hidden = false; }
      const key = (open ? $$('.acc-item')[0] : item).dataset.key;
      $$('.exp-card').forEach((c) => c.classList.toggle('on', c.dataset.key === key));
    }));
    // Clocks
    const tick = () => { const z = (tz) => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }); $('#clockJnb').textContent = z('Africa/Johannesburg'); $('#clockDxb').textContent = z('Asia/Dubai'); $('#clockLon').textContent = z('Europe/London'); };
    tick(); setInterval(tick, 15000);
    // Booking bar
    const pill = $('.book-pill'), panel = $('#bookPanel');
    const open = () => { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('on')); pill.setAttribute('aria-expanded', 'true'); setTimeout(() => $('#bk-name').focus(), 300); };
    const close = () => { panel.classList.remove('on'); pill.setAttribute('aria-expanded', 'false'); setTimeout(() => { panel.hidden = true; }, 380); };
    pill.addEventListener('click', () => (panel.hidden ? open() : close()));
    $('#bookClose').addEventListener('click', close);
    $$('[data-open-book]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));
    const form = $('#bookForm'), done = $('#bookDone'); let lastCode = '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const to = $('#bk-to'); const D = window.AN_DATA;
      const code = to.dataset.code || (D.AIRPORTS.find((a) => [a.iata, a.city, a.icao].some((v) => v.toLowerCase() === to.value.trim().toLowerCase())) || {}).iata || '';
      lastCode = code;
      const enq = window.AN_STORE.addEnquiry({ name: $('#bk-name').value, email: $('#bk-email').value, phone: $('#bk-phone').value, arriving: to.value.trim(), code });
      $('#bookDoneTxt').textContent = `Thank you, ${enq.name.split(' ')[0]}. Our concierge will call you on ${enq.phone} within two hours to plan your flight to ${enq.arriving}. Reference ${enq.id}.`;
      form.hidden = true; done.hidden = false;
    });
    $('#bookSearch').addEventListener('click', () => { close(); setTimeout(() => { form.reset(); form.hidden = false; done.hidden = true; }, 500);
      const u = window.AN_STORE.currentUser(); window.AN_APP.startSearch({ trip: 'one-way', legs: [{ from: u?.homeAirport || 'HLA', to: lastCode || '', date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), time: '' }], pax: 2, category: '' }); });
    $('#bookAgain').addEventListener('click', () => { form.reset(); $('#bk-to').dataset.code = ''; form.hidden = false; done.hidden = true; $('#bk-name').focus(); });
    $('[data-act="privacy"]', form).addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); window.AN_APP.toast('We use your details only to arrange your flight, under POPIA. We never sell them.'); });
  }
})();
