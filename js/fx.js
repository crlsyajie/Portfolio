/* ============================================
   Interaction layer
   1. Light / dark theme
   2. Scroll progress + back to top
   3. Scroll reveals and split headings
   4. Hover letters and rolling links
   5. Custom cursor
   6. Magnetic buttons
   8. Marquee
   9. Project spotlight, meter counters
   Runs on its own, so it still works if the 3D form can't load.
   ============================================ */
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const isTyping = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

root.classList.add('fx');

/* ========== 1. THEME ========== */
const toggle = $('#theme-toggle');
const themeMeta = $('meta[name="theme-color"]');
const systemLight = window.matchMedia('(prefers-color-scheme: light)');

function setTheme(t, save) {
  root.setAttribute('data-theme', t);
  toggle.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f3ece1' : '#15110d');
  if (save) { try { localStorage.setItem('theme', t); } catch (_) { /* private mode */ } }
  document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

function switchTheme(x, y) {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  if (reduceMotion || !document.startViewTransition) { setTheme(next, true); return; }
  // A circle of the new theme spreads out from the toggle.
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => setTheme(next, true));
  vt.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
}

setTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false);
toggle.addEventListener('click', (e) => {
  const b = toggle.getBoundingClientRect();
  const x = e.clientX || b.left + b.width / 2;
  const y = e.clientY || b.top + b.height / 2;
  switchTheme(x, y);
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping()) {
    const b = toggle.getBoundingClientRect();
    switchTheme(b.left + b.width / 2, b.top + b.height / 2);
  }
});
// Follow the system setting until the visitor picks one.
systemLight.addEventListener('change', (e) => {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (_) { /* ignore */ }
  if (!saved) setTheme(e.matches ? 'light' : 'dark', false);
});

/* ========== RAIL: tucks away while you scroll down ========== */
const rail = $('#site-nav');
if (rail) {
  let lastScroll = scrollY;
  const tuck = (hide) => rail.classList.toggle('is-tucked', hide);
  window.addEventListener('scroll', () => {
    const y = scrollY, dy = y - lastScroll;
    if (Math.abs(dy) > 6) {
      // down hides it, up brings it back; it always shows at the very top
      tuck(dy > 0 && y > 120 && !rail.contains(document.activeElement));
      lastScroll = y;
    }
  }, { passive: true });
  // reach for the left edge (or tab into it) and it comes back
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && e.clientX < 28) tuck(false); }, { passive: true });
  rail.addEventListener('focusin', () => tuck(false));
}

/* ========== MENU (phones) ========== */
const navEl = $('#site-nav');
const seal = $('#menu-seal');
if (navEl && seal) {
  const setMenu = (open) => {
    navEl.classList.toggle('is-open', open);
    seal.setAttribute('aria-expanded', String(open));
    seal.setAttribute('aria-label', open ? 'Close the index' : 'Open the index');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  seal.addEventListener('click', () => setMenu(!navEl.classList.contains('is-open')));
  $$('nav a', navEl).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && navEl.classList.contains('is-open')) { setMenu(false); seal.focus(); } });
}

/* ========== 2. PROGRESS ========== */
const toTop = $('#to-top');
function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  root.style.setProperty('--progress', p.toFixed(4));
  toTop.classList.toggle('is-shown', scrollY > innerHeight * 0.6);
}
toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  $('.seal').focus({ preventScroll: true });
});

/* ========== 3. REVEALS ========== */
// Split big headings into words that rise in.
function splitWords(el) {
  // keep <em> words (the brushed ones) as <em> so they keep their lettering
  const words = [];
  el.childNodes.forEach(n => {
    const brushed = n.nodeType === 1 && n.tagName === 'EM';
    n.textContent.trim().split(/\s+/).filter(Boolean).forEach(w => words.push({ w, brushed }));
  });
  el.textContent = '';
  words.forEach(({ w, brushed }, i) => {
    const outer = document.createElement('span');
    outer.className = 'w';
    const inner = document.createElement(brushed ? 'em' : 'span');
    inner.textContent = w;
    inner.style.setProperty('--wi', i);
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  el.classList.add('words');
}
$$('.section-head h2, .about-body > h2, .contact-body > h2').forEach(splitWords);

// a brush stroke that paints itself under each heading as it comes into view
$$('.section-head h2, .about-body > h2, .contact-body > h2').forEach(h => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'brush-line');
  svg.setAttribute('viewBox', '0 0 300 24');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path pathLength="1" d="M4 15 C 60 6, 120 18, 180 10 S 270 8, 296 12" />';
  h.after(svg);
});

const revealGroups = [
  ['.section-head h2, .about-body > h2, .contact-body > h2', null],
  ['.brush-line', 0],
  ['.section-head p', 120],
  ['.filters button', 50],
  ['.project', 60],
  ['.projects-more', 0],
  ['.about-lead', 100],
  ['.about-grid > div', 140],
  ['.about-grid h3, .plain-list li, .meters li', 40],
  ['.contact-lead', 120],
  ['.contact-form > *', 70],
  ['.socials li', 60]
];
const revealEls = [];
revealGroups.forEach(([sel, step]) => {
  const els = $$(sel);
  els.forEach((el, i) => {
    if (step === null) { revealEls.push(el); return; }  // words handle their own timing
    el.dataset.reveal = step === 'scale' ? 'scale' : '';
    if (typeof step === 'number') el.style.setProperty('--d', `${Math.min(i, 8) * step}ms`);
    revealEls.push(el);
  });
});

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach(el => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      // let later filters and hovers run without the stagger delay
      setTimeout(() => e.target.style.removeProperty('--d'), 1600);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
}

/* ========== 4. HOVER LETTERS + ROLLING LINKS ========== */
function splitChars(el) {
  const words = el.textContent.split(' ');
  el.textContent = '';
  words.forEach((word, i) => {
    // letters sit inside a word wrapper so lines only break between words
    const w = document.createElement('span');
    w.className = 'hw';
    for (const ch of word) {
      const s = document.createElement('span');
      s.className = 'hc';
      s.textContent = ch;
      w.appendChild(s);
    }
    el.appendChild(w);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}
$$('.hero-title .line > span').forEach(el => { if (!el.querySelector('em')) splitChars(el); });
$$('[data-hover-chars]').forEach(el => {
  el.setAttribute('aria-label', el.textContent.trim());
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.textContent = el.textContent;
  el.textContent = '';
  el.appendChild(wrap);
  splitChars(wrap);
});

$$('.socials a').forEach(a => {
  const t = a.textContent.trim();
  a.innerHTML = '';
  const roll = document.createElement('span');
  roll.className = 'roll';
  roll.dataset.text = t;
  const inner = document.createElement('span');
  inner.textContent = t;
  roll.appendChild(inner);
  a.appendChild(roll);
});

/* ========== 5. CURSOR: a quill pen ========== */
// The nib is the hotspot. Over something you can open, the quill tilts as if to
// write and a paper tag says what will happen; a click leaves a drop of ink,
// and holding the button down draws a line of ink.
if (finePointer && !reduceMotion) {
  const quill = document.createElement('div');
  quill.className = 'quill';
  quill.setAttribute('aria-hidden', 'true');
  quill.innerHTML = `<svg viewBox="0 0 40 40" class="quill-pen">
      <path class="vane" d="M11 27 C 12 16, 22 6, 38 1 C 35 12, 25 23, 11 27 Z" />
      <path class="barbs" d="M16 21 L 23 19 M19 17 L 27 14 M23 12 L 31 9 M14 24 L 19 23.5" />
      <path class="shaft" d="M4 36 C 14 26, 24 14, 37 2" />
      <path class="nib" d="M2 38 L 5.5 31.5 L 8.5 34.5 Z" />
    </svg>`;
  const label = document.createElement('span');
  label.className = 'quill-tag';
  label.setAttribute('aria-hidden', 'true');
  document.body.append(quill, label);

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const tagPos = { ...pos };
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pos.x = e.clientX; pos.y = e.clientY;
    if (!shown) { shown = true; tagPos.x = pos.x; tagPos.y = pos.y; root.classList.add('has-cursor'); }
    root.classList.remove('cursor-out');
    quill.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => root.classList.add('cursor-out'));

  // a drop of ink where you click, soaking into the page
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    quill.classList.add('is-down');
    const ink = document.createElement('span');
    ink.className = 'ink-drop';
    ink.setAttribute('aria-hidden', 'true');
    ink.style.left = `${e.clientX}px`;
    ink.style.top = `${e.clientY}px`;
    ink.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
    document.body.append(ink);
    setTimeout(() => ink.remove(), 1100);
  });
  window.addEventListener('pointerup', () => quill.classList.remove('is-down'));

  // Hold the button and the quill writes: a line of ink that follows the nib,
  // thick when slow and thin when fast like a real pen, then soaks away.
  const inkCanvas = document.createElement('canvas');
  inkCanvas.className = 'ink-layer';
  inkCanvas.setAttribute('aria-hidden', 'true');
  document.body.append(inkCanvas);
  const ictx = inkCanvas.getContext('2d');
  const LIFE = 1800;                                    // ms a stroke stays on the page
  let dpr = 1;
  const sizeInk = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    inkCanvas.width = innerWidth * dpr; inkCanvas.height = innerHeight * dpr;
  };
  sizeInk();
  window.addEventListener('resize', sizeInk);
  let segs = [];                                         // { x0, y0, x1, y1, w, t }
  let pen = null;                                        // last point while the button is held
  let inkRaf = null;
  const inkColour = () => (root.dataset.theme === 'dark' ? '240, 205, 150' : '42, 24, 12');

  function drawInk(now) {
    segs = segs.filter(sg => now - sg.t < LIFE);
    ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ictx.clearRect(0, 0, innerWidth, innerHeight);
    ictx.lineCap = 'round';
    const rgb = inkColour();
    segs.forEach(sg => {
      const age = (now - sg.t) / LIFE;
      ictx.strokeStyle = `rgba(${rgb}, ${(0.85 * (1 - age * age)).toFixed(3)})`;
      ictx.lineWidth = sg.w * (1 - age * 0.35);
      ictx.beginPath();
      ictx.moveTo(sg.x0, sg.y0);
      ictx.lineTo(sg.x1, sg.y1);
      ictx.stroke();
    });
    inkRaf = segs.length || pen ? requestAnimationFrame(drawInk) : null;
  }
  const wakeInk = () => { if (!inkRaf) inkRaf = requestAnimationFrame(drawInk); };

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    pen = { x: e.clientX, y: e.clientY, w: 3.2 };
    root.classList.add('is-inking');                    // no text selection while writing
    wakeInk();
  });
  window.addEventListener('pointermove', (e) => {
    if (!pen || e.pointerType !== 'mouse') return;
    const dx = e.clientX - pen.x, dy = e.clientY - pen.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) return;
    // nib width eases toward a target set by speed, so strokes swell and taper
    const target = Math.max(1, Math.min(4.6, 5 - dist * 0.12));
    const w = pen.w + (target - pen.w) * 0.35;
    segs.push({ x0: pen.x, y0: pen.y, x1: e.clientX, y1: e.clientY, w, t: performance.now() });
    pen = { x: e.clientX, y: e.clientY, w };
  }, { passive: true });
  const lift = () => { pen = null; root.classList.remove('is-inking'); };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);
  window.addEventListener('blur', lift);

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    root.classList.toggle('cursor-text', !!t.closest('input:not([type="radio"]), textarea'));
    let tag = '';
    if (t.closest('.rack-canvas')) tag = 'View';
    else if (t.closest('.hotspot')) tag = 'Enter';
    else if (t.closest('.spine')) tag = 'Take down';
    else if (t.closest('.project a, .repo a')) tag = 'Open';
    const link = t.closest('a, button, label, [role="button"]');
    label.textContent = tag;
    label.classList.toggle('is-on', !!tag);
    quill.classList.toggle('is-ready', !!link || !!tag);
  });

  // the tag drifts after the pen like a trailing note
  (function follow() {
    tagPos.x += (pos.x - tagPos.x) * 0.2;
    tagPos.y += (pos.y - tagPos.y) * 0.2;
    label.style.transform = `translate3d(${tagPos.x + 26}px, ${tagPos.y + 14}px, 0)`;
    requestAnimationFrame(follow);
  })();
}

/* ========== 6. MAGNETIC BUTTONS ========== */
if (finePointer && !reduceMotion) {
  $$('.btn, .theme-toggle, .to-top, .chip-btn').forEach(el => {
    el.classList.add('magnetic');
    const pull = el.classList.contains('btn') ? 0.3 : 0.4;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
      // the fill in .btn grows from where the pointer came in
      el.style.setProperty('--fx', `${e.clientX - r.left}px`);
      el.style.setProperty('--fy', `${e.clientY - r.top}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ========== 8. MARQUEE ========== */
const track = $('.marquee-track');
let lastY = scrollY;
let scrollVel = 0;
if (track) {
  const group = $('.marquee-group', track);
  // enough copies to always cover the screen twice
  const copies = Math.max(2, Math.ceil((innerWidth * 2) / Math.max(group.scrollWidth, 1)) + 1);
  for (let i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));

  if (!reduceMotion) {
    let x = 0;
    let dir = -1;
    let prev = performance.now();
    (function run(now) {
      const dt = Math.min(64, now - prev) / 16.67;
      prev = now;
      const w = group.getBoundingClientRect().width;
      scrollVel *= 0.9;
      if (Math.abs(scrollVel) > 0.5) dir = scrollVel > 0 ? -1 : 1;
      x += dir * (0.6 + Math.min(Math.abs(scrollVel) * 0.35, 18)) * dt;
      if (w > 0) { if (x <= -w) x += w; if (x > 0) x -= w; }
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      requestAnimationFrame(run);
    })(prev);
  }
}

/* ========== 9. PROJECT SPOTLIGHT + METERS ========== */
$$('.project a').forEach(a => {
  a.addEventListener('pointermove', (e) => {
    const r = a.getBoundingClientRect();
    a.style.setProperty('--sx', `${e.clientX - r.left}px`);
    a.style.setProperty('--sy', `${e.clientY - r.top}px`);
  });
});

const meterRows = $$('.meters li');
meterRows.forEach(li => {
  const n = document.createElement('span');
  n.className = 'meter-num';
  n.setAttribute('aria-hidden', 'true');
  n.textContent = reduceMotion ? `${li.style.getPropertyValue('--v').trim()}%` : '0%';
  li.appendChild(n);
});
function countUp() {
  meterRows.forEach((li, k) => {
    const goal = parseFloat(li.style.getPropertyValue('--v')) || 0;
    const n = $('.meter-num', li);
    const start = performance.now() + k * 90;
    (function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / 1500));
      n.textContent = `${Math.round(goal * (1 - Math.pow(1 - t, 4)))}%`;
      if (t < 1) requestAnimationFrame(step);
    })(start);
  });
}
const metersEl = $('.meters');
if (metersEl && !reduceMotion && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { countUp(); obs.disconnect(); }
  }, { threshold: 0.4 }).observe(metersEl);
}

/* ========== SCROLL LOOP ========== */
let ticking = false;
window.addEventListener('scroll', () => {
  scrollVel += scrollY - lastY;
  lastY = scrollY;
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => { updateProgress(); ticking = false; });
  }
}, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
