/* ============================================
   Site behaviour
   1. The form + scroll choreography + reshape control
   2. Nav state
   3. Project filters
   4. Art ring + lightbox
   5. Tool meters
   6. Contact form
   7. Ask about Carlos
   ============================================ */
import { createOrb, SHAPES } from './orb.js';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth <= 760;
const isTyping = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
// Lets a bundled preview swap in inlined images; on the real site it returns the path unchanged.
const asset = (path) => (window.__ASSETS && window.__ASSETS[path]) || path;

setTimeout(() => root.classList.remove('intro'), 2600);

/* ========== 1. THE FORM ========== */
let orb = null;
try {
  orb = createOrb($('#orb'), { reduceMotion });
} catch (err) {
  console.warn('3D form unavailable:', err);
}
if (orb) {
  root.classList.remove('no-webgl');
  orb.setTheme(root.dataset.theme === 'light');
  document.addEventListener('themechange', (e) => orb.setTheme(e.detail === 'light'));
}

const orbSections = $$('[data-orb]');

function stateFor(section) {
  const raw = (isMobile() && section.dataset.orbMobile) || section.dataset.orb;
  const [x, y, s, amp, shape = 0] = raw.split(/\s+/).map(Number);
  const state = { x, y, s, amp, shape };
  const anchorSel = section.dataset.orbAnchor;
  if (anchorSel) {
    const el = $(anchorSel, section);
    if (el) {
      const [ax, ay] = (section.dataset.orbAnchorAt || '0.5 0.5').split(/\s+/).map(Number);
      const r = el.getBoundingClientRect();
      state.x = (r.left + r.width * ax) / window.innerWidth - 0.5;
      state.y = 0.5 - (r.top + r.height * ay) / window.innerHeight;
    }
  }
  return state;
}

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function updateOrb() {
  if (!orb || !orbSections.length) return;
  const line = window.innerHeight * 0.5;
  let i = orbSections.findIndex(s => {
    const r = s.getBoundingClientRect();
    return r.top <= line && r.bottom > line;
  });
  if (i === -1) {
    // Between sections (e.g. over the marquee): use the last one that started above the line.
    i = 0;
    orbSections.forEach((s, k) => { if (s.getBoundingClientRect().top <= line) i = k; });
  }
  const sec = orbSections[i];
  const r = sec.getBoundingClientRect();
  const p = (line - r.top) / r.height;
  const a = stateFor(sec);
  const next = orbSections[i + 1];
  const blendFrom = Math.max(0.4, 1 - (window.innerHeight * 0.55) / r.height);
  const t = next ? smooth(blendFrom, 1, p) : 0;
  const b = next ? stateFor(next) : a;
  // Shrink while crossing the page so the form doesn't sweep over text at full size.
  const travel = Math.min(1, Math.abs(b.x - a.x) * 1.6);
  const dip = 1 - 0.6 * Math.sin(Math.PI * t) * travel;
  orb.setTarget({
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t) * dip, amp: lerp(a.amp, b.amp, t),
    shape: t < 0.5 ? a.shape : b.shape
  });
}

// Reshape control: a visible, keyboard-friendly way to do what clicking the form does.
const reshapeBtn = $('#reshape');
const shapeName = $('#shape-name');
const marks = $$('.reshape-marks i');
function showShape(i) {
  shapeName.textContent = SHAPES[i];
  marks.forEach((m, k) => m.classList.toggle('is-on', k === i));
  reshapeBtn.setAttribute('aria-label', `Reshape the form. Current shape: ${SHAPES[i]}`);
}
if (orb) {
  reshapeBtn.hidden = false;
  showShape(0);
  orb.onShapeChange(showShape);
  reshapeBtn.addEventListener('click', () => orb.nextShape());
}

let tick = false;
window.addEventListener('scroll', () => {
  if (!tick) { tick = true; requestAnimationFrame(() => { updateOrb(); updateNav(); tick = false; }); }
}, { passive: true });
window.addEventListener('resize', () => { updateOrb(); updateNav(); });
const portraitImg = $('.hero-portrait img');
if (portraitImg && !portraitImg.complete) portraitImg.addEventListener('load', updateOrb, { once: true });

/* ========== 2. NAV ========== */
const nav = $('.site-nav');
const navLinks = $$('.site-nav nav a');
const navTargets = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

function updateNav() {
  nav.classList.toggle('is-scrolled', window.scrollY > 10);
  const line = window.innerHeight * 0.4;
  let current = null;
  navTargets.forEach(sec => { if (sec.getBoundingClientRect().top <= line) current = sec.id; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = navTargets[navTargets.length - 1].id;
  }
  navLinks.forEach(a => {
    const on = a.getAttribute('href') === '#' + current;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
}

/* ========== 3. PROJECT FILTERS ========== */
const filterBtns = $$('.filters button');
const projects = $$('.project');

filterBtns.forEach(btn => {
  const f = btn.dataset.filter;
  const n = f === 'all' ? projects.length : projects.filter(p => p.dataset.cat === f).length;
  const c = document.createElement('span');
  c.className = 'count';
  c.textContent = n;
  c.setAttribute('aria-hidden', 'true');
  btn.appendChild(c);
  btn.setAttribute('aria-label', `${btn.firstChild.textContent.trim()}, ${n} project${n === 1 ? '' : 's'}`);
  btn.addEventListener('click', () => applyFilter(f));
});

function applyFilter(f) {
  filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
  let shown = 0;
  projects.forEach(p => {
    p.hidden = !(f === 'all' || p.dataset.cat === f);
    if (!p.hidden) p.style.setProperty('--i', shown++);
  });
  // replay the row entrance for the new set
  const list = $('#projects');
  list.classList.remove('is-filtered');
  void list.offsetWidth;
  list.classList.add('is-filtered');
  updateOrb();
}

/* ========== 4. ART RING ========== */
// To add a piece: put a 640px .webp and a 1400px "-large" .webp in assets/art and add a line here.
const ART = [
  { src: 'art-01', alt: 'Graphite portrait of a woman with long hair' },
  { src: 'art-02', alt: 'Painted still life of roses in a vase with fruit' },
  { src: 'art-03', alt: 'Colour portrait of a woman with a flower in her hair' },
  { src: 'art-04', alt: 'Colour portrait of a woman with blue hair, eyes closed' },
  { src: 'art-05', alt: 'Graphite portrait of a young woman' },
  { src: 'art-06', alt: 'Graphite portrait in an open sketchbook' },
  { src: 'art-07', alt: 'Graphite portrait of a woman, with the pencil beside it' },
  { src: 'art-08', alt: 'Graphite double portrait of two women' },
  { src: 'art-09', alt: 'Graphite figure study of a man shielding his face' },
  { src: 'art-10', alt: 'Graphite portrait of a woman lying down' },
  { src: 'art-11', alt: 'Graphite portrait in a sketchbook next to an iced drink' }
];

const stage = $('#ring-stage');
const ring = $('#ring');
const countEl = $('#ring-count');
const N = ART.length;
const step = (Math.PI * 2) / N;
let angle = 0;
let targetAngle = 0;
let radius = 400;
let ringRaf = null;

ART.forEach((a, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ring-item';
  b.dataset.index = i;
  b.setAttribute('aria-label', `View: ${a.alt}`);
  b.tabIndex = -1;
  const img = document.createElement('img');
  img.src = asset(`assets/art/${a.src}.webp`);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  b.appendChild(img);
  ring.appendChild(b);
});
const items = $$('.ring-item', ring);

function measureRing() {
  const card = items[0].getBoundingClientRect().width || 200;
  radius = (card * 1.18) / (2 * Math.tan(Math.PI / N));
}
const frontIndex = () => ((Math.round(-targetAngle / step) % N) + N) % N;
const facing = (i) => Math.cos(i * step + angle);

function drawRing() {
  ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}rad)`;
  items.forEach((el, i) => {
    el.style.transform = `rotateY(${i * step}rad) translateZ(${radius}px)`;
    const light = 0.22 + 0.78 * ((facing(i) + 1) / 2);
    el.style.filter = `brightness(${light.toFixed(3)})`;
  });
  const f = frontIndex();
  items.forEach((el, i) => { el.tabIndex = i === f ? 0 : -1; });
  countEl.textContent = `${f + 1} of ${N}`;
}

let dragging = null;
let velocity = 0;

function animateRing() {
  if (!dragging) {
    if (Math.abs(velocity) > 0.0005) {
      targetAngle += velocity;
      velocity *= 0.93;
      if (Math.abs(velocity) <= 0.0005) targetAngle = Math.round(targetAngle / step) * step;
    }
    angle += (targetAngle - angle) * (reduceMotion ? 1 : 0.1);
  }
  drawRing();
  if (dragging || Math.abs(targetAngle - angle) > 0.0005 || Math.abs(velocity) > 0.0005) {
    ringRaf = requestAnimationFrame(animateRing);
  } else {
    angle = targetAngle; drawRing(); ringRaf = null;
  }
}
const kickRing = () => { if (!ringRaf) ringRaf = requestAnimationFrame(animateRing); };

function turn(dir) {
  velocity = 0;
  targetAngle = (Math.round(targetAngle / step) - dir) * step;
  kickRing();
}

$('#ring-prev').addEventListener('click', () => turn(-1));
$('#ring-next').addEventListener('click', () => turn(1));
stage.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
  else if ((e.key === 'Enter' || e.key === ' ') && e.target === stage) { e.preventDefault(); openLightbox(frontIndex()); }
});

let suppressClick = false;
stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  dragging = { x: e.clientX, y: e.clientY, last: e.clientX, active: false, id: e.pointerId };
  velocity = 0;
});
stage.addEventListener('pointermove', (e) => {
  if (!dragging || e.pointerId !== dragging.id) return;
  const dx = e.clientX - dragging.x;
  if (!dragging.active) {
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - dragging.y)) return;
    dragging.active = true;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
    kickRing();
  }
  const delta = (e.clientX - dragging.last) / (radius * 1.1);
  dragging.last = e.clientX;
  angle += delta;
  targetAngle = angle;
  velocity = delta;
});
function endRingDrag(e) {
  if (!dragging || (e && e.pointerId !== dragging.id)) return;
  const wasActive = dragging.active;
  dragging = null;
  stage.classList.remove('is-dragging');
  if (wasActive) {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 60);
    if (Math.abs(velocity) < 0.002) targetAngle = Math.round(targetAngle / step) * step;
    kickRing();
  }
}
stage.addEventListener('pointerup', endRingDrag);
stage.addEventListener('pointercancel', endRingDrag);

// Pieces sit behind the stage's own plane in 3D, so the stage can catch the click.
// Look underneath it for the front-most piece at that point.
function itemAt(e) {
  const direct = e.target.closest && e.target.closest('.ring-item');
  if (direct) return direct;
  if (e.clientX === 0 && e.clientY === 0) return null;
  const hits = document.elementsFromPoint(e.clientX, e.clientY)
    .map(el => el.closest && el.closest('.ring-item')).filter(Boolean);
  if (!hits.length) return null;
  return hits.sort((a, b) => facing(+b.dataset.index) - facing(+a.dataset.index))[0];
}

stage.addEventListener('click', (e) => {
  if (suppressClick) { e.preventDefault(); return; }
  const item = itemAt(e);
  if (!item || facing(+item.dataset.index) < 0) return;
  const i = Number(item.dataset.index);
  if (i === frontIndex()) {
    openLightbox(i);
  } else {
    velocity = 0;
    const target = -i * step;
    targetAngle = target + Math.round((targetAngle - target) / (Math.PI * 2)) * Math.PI * 2;
    kickRing();
  }
});

measureRing();
drawRing();
window.addEventListener('resize', () => { measureRing(); drawRing(); });

// Lightbox
const lightbox = $('#lightbox');
const lbImg = $('#lightbox-img');
const lbCap = $('#lightbox-caption');
let lbIndex = 0;

function showLb(i) {
  lbIndex = (i + N) % N;
  const a = ART[lbIndex];
  lbImg.src = asset(`assets/art/${a.src}-large.webp`);
  lbImg.alt = a.alt;
  lbCap.textContent = `${lbIndex + 1} of ${N}`;
}
function openLightbox(i) {
  showLb(i);
  if (typeof lightbox.showModal === 'function') lightbox.showModal(); else lightbox.setAttribute('open', '');
  $('#lb-close').focus();
}
function closeLightbox() { lightbox.close ? lightbox.close() : lightbox.removeAttribute('open'); }
lightbox.addEventListener('close', () => {
  velocity = 0;
  targetAngle = -lbIndex * step + Math.round((targetAngle + lbIndex * step) / (Math.PI * 2)) * Math.PI * 2;
  kickRing();
  stage.focus({ preventScroll: true });
});
$('#lb-prev').addEventListener('click', () => showLb(lbIndex - 1));
$('#lb-next').addEventListener('click', () => showLb(lbIndex + 1));
$('#lb-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
});
lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target.tagName === 'FIGURE') closeLightbox(); });

/* ========== 5. TOOL METERS ========== */
const meters = $('.meters');
if (meters) {
  if (reduceMotion || !('IntersectionObserver' in window)) meters.classList.add('is-shown');
  else new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { meters.classList.add('is-shown'); obs.disconnect(); }
  }, { threshold: 0.4 }).observe(meters);
}

/* ========== 6. CONTACT FORM ========== */
const EMAIL = 'cyfetizanan@gmail.com';
const form = $('#contact-form');
const f = { name: $('#cf-name'), email: $('#cf-email'), details: $('#cf-details') };
const statusEl = $('#form-status');

const rules = {
  name: v => v ? '' : 'Add your name so I know who to reply to.',
  email: v => !v ? 'Add an email address for my reply.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email address looks incomplete.',
  details: v => v.length >= 10 ? '' : 'Describe the project in a sentence or two.'
};

function check(key) {
  const input = f[key];
  const msg = rules[key](input.value.trim());
  const err = $('#' + input.id + '-error');
  input.closest('.field').classList.toggle('has-error', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  err.textContent = msg;
  if (msg) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
  return !msg;
}
Object.keys(rules).forEach(k => {
  f[k].addEventListener('blur', () => { if (f[k].value) check(k); });
  f[k].addEventListener('input', () => { if (f[k].closest('.field').classList.contains('has-error')) check(k); });
});
f.details.addEventListener('input', () => { $('#cf-count').textContent = `${f.details.value.length} / 1000`; });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(rules).map(check).every(Boolean);
  if (!ok) { statusEl.className = 'form-status'; statusEl.textContent = ''; $('[aria-invalid="true"]', form).focus(); return; }
  const service = ($('input[name="service"]:checked', form) || {}).value || 'General';
  const subject = 'Portfolio inquiry: ' + service;
  const body = `Name: ${f.name.value.trim()}\nEmail: ${f.email.value.trim()}\nService: ${service}\n\n${f.details.value.trim()}`;
  const gmail = `https://mail.google.com/mail/?view=cm&to=${EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const win = window.open(gmail, '_blank', 'noopener');
  if (!win) window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  statusEl.className = 'form-status is-ok';
  statusEl.textContent = 'Your email is ready in a new tab. Press Send there to deliver it.';
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (_) {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
    ta.remove(); return ok;
  }
}
const copyBtn = $('#copy-email');
copyBtn.addEventListener('click', async () => {
  const ok = await copyText(EMAIL);
  copyBtn.textContent = ok ? 'Copied' : 'Copy failed';
  copyBtn.classList.toggle('is-done', ok);
  setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-done'); }, 2000);
});

/* ========== 7. ASK ABOUT CARLOS ========== */
const ask = $('#ask');
const askLog = $('#ask-log');
const askForm = $('#ask-form');
const askInput = $('#ask-input');
const askSend = $('button', askForm);
const askOpeners = $$('[data-open-ask]');
let kb = null;

fetch('lib/chatbot/knowledge-base.json').then(r => (r.ok ? r.json() : null)).then(d => { kb = d; }).catch(() => {});
const kbText = (cat) => (kb ? kb.knowledge_base.filter(k => k.category === cat).map(k => k.content).join(' ') : '');

const projectList = (cat) => projects
  .filter(p => !cat || p.dataset.cat === cat)
  .map(p => ({ label: $('.project-title', p).textContent, href: $('a', p).href }));

function goTo(id, after) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isMobile()) closeAsk(false);
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  if (after) setTimeout(after, reduceMotion ? 0 : 700);
}
const showWork = (cat) => goTo('work', () => applyFilter(cat || 'all'));
const contactAction = { label: 'Open the contact form', run: () => goTo('contact', () => f.name.focus({ preventScroll: true })) };
const copyAction = { label: 'Copy email', run: async (b) => { b.textContent = (await copyText(EMAIL)) ? 'Copied' : 'Copy failed'; } };

const topics = [
  { w: ['hi', 'hello', 'hey', 'yo', 'kumusta', 'musta', 'good morning', 'good afternoon', 'good evening'], k: 0.5,
    r: () => ({ text: "Hi! Ask me about Carlos's projects, art, skills, or how to reach him." }) },
  { w: ['thanks', 'thank you', 'salamat', 'ty'], k: 0.5,
    r: () => ({ text: "You're welcome. If you'd like to work with Carlos, the contact form is the quickest way.", actions: [contactAction] }) },
  { w: ['who', 'about', 'carlos', 'yajie', 'yourself', 'background', 'introduce', 'what does he do', 'bio'], k: 1,
    r: () => ({ text: `${kbText('About')} ${kbText('Summary')}`.trim(), actions: [{ label: 'Go to About', run: () => goTo('about') }] }) },
  { w: ['intern', 'internship', 'experience', 'job', 'work at', 'currently'], k: 1.2, r: () => ({ text: kbText('About') }) },
  { w: ['school', 'study', 'studies', 'university', 'college', 'degree', 'education', 'bsu', 'batstate', 'student', 'bsit', 'course'], k: 1.2,
    r: () => ({ text: kbText('Education') }) },
  { w: ['cert', 'certs', 'certificate', 'certificates', 'certification', 'certifications', 'certified', 'badge', 'aws', 'datacamp', 'google'], k: 1.3,
    r: () => ({ text: kbText('Certifications'), actions: [{ label: 'See them on the page', run: () => goTo('about') }] }) },
  { w: ['skill', 'skills', 'tool', 'tools', 'software', 'figma', 'photoshop', 'adobe', 'illustrator', 'premiere', 'xd', 'proficient', 'good at'], k: 1.1,
    r: () => ({ text: kbText('Skills'), actions: [{ label: 'See his tools', run: () => goTo('about') }] }) },
  { w: ['service', 'services', 'offer', 'help with', 'hire for', 'video', 'editing', 'graphic', 'branding', 'logo'], k: 1.1,
    r: () => ({ text: kbText('Services'), actions: [contactAction] }) },
  { w: ['art', 'draw', 'drawing', 'drawings', 'sketch', 'sketches', 'paint', 'painting', 'portrait', 'portraits', 'graphite', 'artist'], k: 1.5,
    r: () => ({ text: 'Carlos draws, mostly graphite portraits, and paints now and then. There are 11 pieces in the art ring.', actions: [{ label: 'Show the art', run: () => goTo('art', () => stage.focus({ preventScroll: true })) }] }) },
  { w: ['project', 'projects', 'portfolio', 'built', 'made', 'work', 'works', 'github', 'repo', 'repos'], k: 1,
    r: () => ({ text: "Here's what's in Carlos's portfolio:", list: projectList(), actions: [{ label: 'Open the work list', run: () => showWork('all') }] }) },
  { w: ['machine learning', 'ml', 'ai', 'model', 'models', 'cnn', 'llm', 'llms', 'deep learning', 'neural', 'data science', 'classification'], k: 1.6,
    r: () => ({ text: "Carlos's machine learning projects:", list: projectList('ml'), actions: [{ label: 'Show ML projects', run: () => showWork('ml') }] }) },
  { w: ['web', 'website', 'websites', 'web app', 'frontend', 'front end', 'landing', 'formula', 'f1', 'event', 'barangay'], k: 1.5,
    r: () => ({ text: 'Web apps and sites Carlos has built:', list: projectList('web'), actions: [{ label: 'Show web projects', run: () => showWork('web') }] }) },
  { w: ['ui', 'ux', 'ui/ux', 'interface', 'prototype', 'wireframe', 'user experience'], k: 1.5,
    r: () => ({ text: 'Carlos holds the Google UX Design Professional Certificate and designs mainly in Figma. UI/UX work:', list: projectList('uiux'), actions: [{ label: 'Show UI/UX projects', run: () => showWork('uiux') }] }) },
  { w: ['python', 'adk', 'agent', 'agents'], k: 1.5,
    r: () => ({ text: 'Python projects:', list: projectList('python'), actions: [{ label: 'Show Python projects', run: () => showWork('python') }] }) },
  { w: ['contact', 'email', 'reach', 'hire', 'phone', 'number', 'call', 'message', 'available', 'freelance', 'commission', 'rate', 'rates', 'price', 'pricing', 'quote', 'cost'], k: 1.4,
    r: () => ({ text: kbText('Contact') || `You can email Carlos at ${EMAIL}.`, actions: [contactAction, copyAction] }) },
  { w: ['instagram', 'facebook', 'linkedin', 'social', 'socials', 'follow', 'ig', 'fb'], k: 1.4,
    r: () => {
      const names = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', facebook: 'Facebook' };
      const s = (kb && kb.info.socials) || {};
      return { text: 'You can find Carlos here:', list: Object.keys(s).map(k => ({ label: names[k] || k, href: s[k] })) };
    } },
  { w: ['where', 'location', 'based', 'live', 'lives', 'from', 'batangas', 'philippines'], k: 1,
    r: () => ({ text: `Carlos is based in ${(kb && kb.info.location) || 'Batangas, PH'}.` }) },
  { w: ['cv', 'resume'], k: 1.6, r: () => ({ text: "Here's Carlos's CV:", list: [{ label: 'Open CV (PDF)', href: 'assets/resumeee.pdf' }] }) },
  { w: ['orb', 'ball', 'sphere', 'blob', 'shape', 'shapes', 'form', 'orange', 'gold', '3d', 'three', 'cube', 'gem'], k: 1.2,
    r: () => ({ text: `The amber form is drawn live with three.js and a custom shader. It has five shapes (${SHAPES.join(', ').toLowerCase()}) and changes shape in each section. Click it, or use the Reshape button in the hero, to cycle through them.`,
      actions: orb ? [{ label: 'Reshape it now', run: () => orb.nextShape() }] : [] }) }
];

const norm = (s) => ' ' + s.toLowerCase().replace(/[^a-z0-9/\s]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

function answer(q) {
  const n = norm(q);
  let best = null, bestScore = 0;
  topics.forEach(t => {
    let sc = 0;
    t.w.forEach(w => { if (n.includes(' ' + w + ' ')) sc += t.k * (w.includes(' ') ? 1.5 : 1); });
    if (sc > bestScore) { bestScore = sc; best = t; }
  });
  if (best) { const a = best.r(); if (a.text || a.list) return a; }
  if (kb) {
    const stop = new Set('the a an is are what does do he his him of and to in on for can you i me my has have with'.split(' '));
    const words = n.trim().split(' ').filter(w => w.length > 2 && !stop.has(w));
    let top = null, topScore = 0;
    kb.knowledge_base.forEach(k => {
      const sc = words.filter(w => norm(k.content).includes(w)).length;
      if (sc > topScore) { topScore = sc; top = k; }
    });
    if (top) return { text: top.content };
  }
  return { text: "That isn't in Carlos's portfolio yet, so I can't answer it accurately. You can ask him directly:", actions: [contactAction, copyAction] };
}

function addMsg(role, c) {
  const m = document.createElement('div');
  m.className = 'msg ' + role;
  if (typeof c === 'string') m.textContent = c;
  else {
    if (c.text) m.append(c.text);
    if (c.list && c.list.length) {
      const ul = document.createElement('ul');
      c.list.forEach(it => {
        const li = document.createElement('li');
        li.appendChild(Object.assign(document.createElement('a'), { href: it.href, target: '_blank', rel: 'noopener', textContent: it.label }));
        ul.appendChild(li);
      });
      m.appendChild(ul);
    }
    if (c.actions && c.actions.length) {
      const row = document.createElement('div');
      row.className = 'msg-actions';
      c.actions.forEach(act => {
        const b = Object.assign(document.createElement('button'), { type: 'button', textContent: act.label });
        b.addEventListener('click', () => act.run(b));
        row.appendChild(b);
      });
      m.appendChild(row);
    }
  }
  askLog.appendChild(m);
  askLog.scrollTop = askLog.scrollHeight;
  return m;
}

function askQ(q) {
  q = q.trim();
  if (!q) return;
  addMsg('user', q);
  askInput.value = ''; askSend.disabled = true;
  const t = addMsg('bot', '');
  t.innerHTML = '<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>';
  setTimeout(() => { t.remove(); addMsg('bot', answer(q)); }, reduceMotion ? 0 : 380);
}

['What does he do?', 'ML projects', 'Show me his art', 'Certifications', 'How do I hire him?'].forEach(q => {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: q });
  b.addEventListener('click', () => askQ(q));
  $('#ask-suggest').appendChild(b);
});

let greeted = false;
function openAsk() {
  ask.hidden = false;
  askOpeners.forEach(b => b.setAttribute('aria-expanded', 'true'));
  if (!greeted) { addMsg('bot', "Hi! I can tell you about Carlos's projects, art, skills and services, or help you get in touch. Pick a question below or type your own."); greeted = true; }
  askInput.focus();
}
function closeAsk(returnFocus = true) {
  ask.hidden = true;
  askOpeners.forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (returnFocus) askOpeners[0].focus();
}
askOpeners.forEach(b => b.addEventListener('click', () => (ask.hidden ? openAsk() : closeAsk())));
$('#ask-close').addEventListener('click', () => closeAsk());
ask.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAsk(); });
askInput.addEventListener('input', () => { askSend.disabled = !askInput.value.trim(); });
askForm.addEventListener('submit', (e) => { e.preventDefault(); askQ(askInput.value); });
document.addEventListener('keydown', (e) => {
  if (e.key === '?' && !isTyping() && ask.hidden && !lightbox.open) { e.preventDefault(); openAsk(); }
});

updateNav();
updateOrb();
