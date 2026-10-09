/* ============================================
   Scroll films
   Footage is stored as numbered frames (made by tools/make-frames.swift)
   and drawn to a canvas at the time the scroll position asks for.
   1. Reel: loads a frame set coarse-to-fine and draws any moment of it
   2. The sitting (hero): the tilted still comes off the wall, then the camera
      walks a full circle round the workshop while notes about Carlos unfold
   3. The close-up interlude: the camera pushes in on the portrait and back
   ============================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const isMobile = () => window.innerWidth <= 760;

/* ========== 1. REEL ========== */
function order(n) {
  // 0, n/2, n/4, 3n/4, ... so any scroll position has a near frame early
  const out = [], seen = new Set();
  for (let step = 1 << Math.ceil(Math.log2(Math.max(n, 1))); step >= 1; step >>= 1) {
    for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
  }
  return out;
}

class Reel {
  constructor(canvas, base, onChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.base = base;
    this.onChange = onChange;
    this.meta = { frames: 0, fps: 10, duration: 0 };
    this.manifest = null;
    this.frames = [];
    this.set = '';
    this.key = -1;
    this.ready = fetch(`${base}/frames.json`).then(r => r.json()).then(m => { this.manifest = m; this.load(); });
  }

  load() {
    const want = isMobile() ? 'mobile' : 'desktop';
    if (want === this.set || !this.manifest) return;
    this.set = want;
    // desktop and phones can have different frame rates (frames.json lists both)
    const m = this.manifest;
    this.meta = { duration: m.duration, ...(m[want] || { frames: m.frames, fps: m.fps }) };
    this.key = -1;
    this.frames = new Array(this.meta.frames).fill(null);
    const queue = order(this.meta.frames);
    let active = 0;
    const next = () => {
      while (active < 6 && queue.length) {
        const i = queue.shift();
        const im = new Image();
        im.decoding = 'async';
        active++;
        im.onload = () => { this.frames[i] = im; active--; this.key = -1; this.onChange(i); next(); };
        im.onerror = () => { active--; next(); };
        im.src = `${this.base}/${want}/${String(i).padStart(3, '0')}.jpg`;
      }
    };
    next();
  }

  nearest(i) {
    if (this.frames[i]) return i;
    for (let d = 1; d < this.meta.frames; d++) {
      if (this.frames[i - d]) return i - d;
      if (this.frames[i + d]) return i + d;
    }
    return -1;
  }

  size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
    if (w !== this.canvas.width || h !== this.canvas.height) { this.canvas.width = w; this.canvas.height = h; this.key = -1; }
  }

  // Draw the moment t (seconds), cross-fading the two nearest frames so 10–15 fps reads as smooth.
  draw(t) {
    const { frames, fps } = this.meta;
    if (!frames) return;
    this.size();
    const f = Math.min(frames - 1, Math.max(0, t * fps));
    const a = Math.floor(f), b = Math.min(frames - 1, a + 1), k = f - a;
    const key = Math.round(f * 50);
    if (key === this.key) return;
    const ia = this.nearest(a), ib = this.nearest(b);
    if (ia < 0) return;
    this.key = key;
    const { ctx, canvas } = this;
    const cover = (im) => {
      const s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      return [(canvas.width - w) / 2, (canvas.height - h) / 2, w, h];
    };
    ctx.globalAlpha = 1;
    ctx.drawImage(this.frames[ia], ...cover(this.frames[ia]));
    if (ib >= 0 && ib !== ia && k > 0.02) {
      ctx.globalAlpha = k;
      ctx.drawImage(this.frames[ib], ...cover(this.frames[ib]));
      ctx.globalAlpha = 1;
    }
  }
}

const progress = (el) => {
  const r = el.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
};

/* ========== 2. THE SITTING ========== */
const sitting = $('.sitting');
const stage = $('#stage');
const film = $('#film');
const copy = $('.hero-copy', stage);
const notes = $$('.note', stage).map(el => ({ el, from: +el.dataset.from, to: +el.dataset.to }));
const degEl = $('#orbit-deg');
const dot = $('.orbit-dot');
const hero = new Reel($('#film-canvas'), 'assets/sitting', (i) => { if (i === 0) film.classList.add('is-ready'); request(); });

// The tilted still beside the copy, and where it ends up: the whole stage
// on wide screens, a tall letterbox on phones.
let start = null;
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (isMobile()) {
    const copyBottom = copy.offsetTop + copy.offsetHeight;
    const gap = 22, room = H - copyBottom - gap - 56;
    const h = Math.max(110, Math.min(W * 0.92 * 9 / 16, room)), w = h * 16 / 9;
    start = { x: (W - w) / 2 + W * 0.02, y: copyBottom + gap, w, h, r: -2.5 };
  } else {
    const w = Math.min(W * 0.5, (H * 0.6) * 16 / 9), h = w * 9 / 16;
    start = { x: W - w - W * 0.05, y: H * 0.5 - h / 2 + H * 0.03, w, h, r: -3.5 };
  }
  const endH = isMobile() ? Math.min(H, W * 9 / 16 * 1.6) : H;
  start.end = { x: 0, y: (H - endH) / 2, w: W, h: endH };
}

function updateSitting() {
  if (!start) return;
  const p = progress(sitting);
  const s = stage.style;

  // the painting comes off the wall
  const g = smooth(0, 0.12, p), e = start.end;
  film.style.left = `${lerp(start.x, e.x, g)}px`;
  film.style.top = `${lerp(start.y, e.y, g)}px`;
  film.style.width = `${lerp(start.w, e.w, g)}px`;
  film.style.height = `${lerp(start.h, e.h, g)}px`;
  s.setProperty('--film-r', `${lerp(start.r, 0, g)}deg`);
  s.setProperty('--frame', (1 - g).toFixed(3));
  const copyO = 1 - smooth(0, 0.08, p);
  s.setProperty('--copy-o', copyO.toFixed(3));
  s.setProperty('--copy-y', `${(-g * 60).toFixed(1)}px`);
  copy.inert = copyO < 0.05;
  s.setProperty('--cue-o', (1 - smooth(0, 0.03, p)).toFixed(3));
  s.setProperty('--shade', smooth(0.06, 0.16, p).toFixed(3));

  // the walk round the studio
  const q = clamp01((p - 0.1) / 0.84);
  const t = q * hero.meta.duration;
  hero.draw(t);
  if (degEl) degEl.textContent = `${Math.round(q * 360)}°`;
  if (dot) dot.setAttribute('transform', `rotate(${q * 360} 22 22)`);
  s.setProperty('--orbit-o', (smooth(0.08, 0.14, p) * (1 - smooth(0.95, 0.99, p))).toFixed(3));
  notes.forEach(({ el, from, to }) => el.classList.toggle('is-on', p > 0.1 && p < 0.97 && t >= from && t < to));

  // back where it began, then the page takes over
  s.setProperty('--handoff', smooth(0.95, 1, p).toFixed(3));
}

/* ========== 3. THE CLOSE-UP ========== */
const closeup = $('#closeup');
const cuStage = closeup && $('.closeup-stage', closeup);
const cu = closeup ? new Reel($('#closeup-canvas'), 'assets/closeup', () => request()) : null;

function updateCloseup() {
  if (!cu) return;
  const r = closeup.getBoundingClientRect();
  if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
  const p = progress(closeup);
  cu.draw(smooth(0.05, 0.95, p) * cu.meta.duration);
  cuStage.style.setProperty('--line-o', (smooth(0.18, 0.32, p) * (1 - smooth(0.78, 0.92, p))).toFixed(3));
  cuStage.style.setProperty('--line-y', `${((1 - smooth(0.18, 0.4, p)) * 24).toFixed(1)}px`);
}

/* ========== LOOP ========== */
let ticking = false;
function request() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateSitting(); updateCloseup(); });
}
window.addEventListener('scroll', request, { passive: true });
window.addEventListener('resize', () => { layout(); hero.load(); if (cu) cu.load(); hero.key = -1; if (cu) cu.key = -1; request(); });
layout();
hero.ready.then(request);
if (cu) cu.ready.then(request);
request();
