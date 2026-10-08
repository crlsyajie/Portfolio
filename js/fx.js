/* ============================================
   Interaction layer
   1. Light / dark theme
   2. Scroll progress + back to top
   3. Scroll reveals and split headings
   4. Hover letters and rolling links
   5. Custom cursor
   6. Magnetic buttons
   7. Hero parallax
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
  if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f3ede3' : '#0e0d0c');
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
  $('.brand').focus({ preventScroll: true });
});

/* ========== 3. REVEALS ========== */
// Split big headings into words that rise in.
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const outer = document.createElement('span');
    outer.className = 'w';
    const inner = document.createElement('span');
    inner.textContent = w;
    inner.style.setProperty('--wi', i);
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  el.classList.add('words');
}
$$('.section-head h2, .about-body > h2').forEach(splitWords);

const revealGroups = [
  ['.section-head h2, .about-body > h2', null],
  ['.section-head p', 120],
  ['.filters button', 50],
  ['.project', 60],
  ['.projects-more', 0],
  ['.ring-stage', 'scale'],
  ['.ring-controls', 0],
  ['.about-lead', 100],
  ['.about-grid > div', 140],
  ['.about-grid h3, .plain-list li, .meters li', 40],
  ['.contact-title', 0],
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
$$('.hero-title .line > span').forEach(splitChars);
$$('[data-hover-chars]').forEach(el => {
  el.setAttribute('aria-label', el.textContent.trim());
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.textContent = el.textContent;
  el.textContent = '';
  el.appendChild(wrap);
  splitChars(wrap);
});

$$('.site-nav nav a, .socials a').forEach(a => {
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

/* ========== 5. CURSOR ========== */
if (finePointer && !reduceMotion) {
  const dot = Object.assign(document.createElement('div'), { className: 'cursor-dot' });
  const ring = Object.assign(document.createElement('div'), { className: 'cursor-ring' });
  ring.innerHTML = '<div class="cursor-ring-inner"><span class="cursor-label"></span></div>';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);
  const label = $('.cursor-label', ring);

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { ...pos };
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pos.x = e.clientX; pos.y = e.clientY;
    if (!shown) { shown = true; ringPos.x = pos.x; ringPos.y = pos.y; root.classList.add('has-cursor'); }
    root.classList.remove('cursor-out');
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.add('cursor-out'));
  document.documentElement.addEventListener('mouseleave', () => root.classList.add('cursor-out'));
  window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  window.addEventListener('pointerup', () => ring.classList.remove('is-down'));

  // What the ring turns into depends on what's underneath.
  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    const text = t.closest('input:not([type="radio"]), textarea');
    root.classList.toggle('cursor-text', !!text);
    let tag = '';
    if (t.closest('.ring-item')) tag = 'View';
    else if (t.closest('.ring-stage')) tag = 'Drag';
    else if (t.closest('.project a')) tag = 'Open';
    const link = !tag && t.closest('a, button, label, [role="button"], .marquee-item');
    label.textContent = tag;
    ring.classList.toggle('has-label', !!tag);
    ring.classList.toggle('is-link', !!link);
  });

  (function follow() {
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
    requestAnimationFrame(follow);
  })();
}

/* ========== 6. MAGNETIC BUTTONS ========== */
if (finePointer && !reduceMotion) {
  $$('.btn, .nav-ask, .theme-toggle, .reshape, .ring-controls .round-btn, .to-top, .chip-btn').forEach(el => {
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

/* ========== 7. HERO PARALLAX ========== */
const hero = $('.hero');
const portraitImg = $('.hero-portrait img');
function updateHero() {
  if (reduceMotion || innerWidth <= 760) return;
  const y = Math.min(scrollY, innerHeight);
  root.style.setProperty('--hero-shift', `${(y * 0.28).toFixed(1)}px`);
  root.style.setProperty('--hero-fade', (1 - Math.min(1, y / (innerHeight * 0.6))).toFixed(3));
}
if (finePointer && !reduceMotion && hero && portraitImg) {
  hero.addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5;
    const ny = e.clientY / innerHeight - 0.5;
    portraitImg.style.setProperty('--px', `${(-nx * 18).toFixed(1)}px`);
    portraitImg.style.setProperty('--py', `${(-ny * 10).toFixed(1)}px`);
  });
  hero.addEventListener('pointerleave', () => {
    portraitImg.style.setProperty('--px', '0px');
    portraitImg.style.setProperty('--py', '0px');
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
    requestAnimationFrame(() => { updateProgress(); updateHero(); ticking = false; });
  }
}, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
updateHero();
