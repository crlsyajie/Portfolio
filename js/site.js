/* ============================================
   Site behaviour
   1. Scroll hook (the opening scene lives in js/studio.js)
   2. Nav state
   3. Project filters
   4. Art: the canvas rack + lightbox
   5. Tool meters
   6. Contact form
   7. Ask about Carlos
   ============================================ */

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

/* ========== 1. SCROLL ========== */
// The opening scene itself is driven by js/studio.js.
let tick = false;
window.addEventListener('scroll', () => {
  if (!tick) { tick = true; requestAnimationFrame(() => { updateNav(); tick = false; }); }
}, { passive: true });
window.addEventListener('resize', () => updateNav());

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
}

/* ========== 4. ART: THE CANVAS RACK ========== */
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

// The rack: canvases stand side by side on two shelves, the way finished work
// waited in a Florentine workshop. Each leans a little and has its own size.
// Hover pulls a canvas up out of the rack; select it to see it up close.
const STAND = [
  { h: 100, lean: -2.5 }, { h: 82, lean: 1.5 }, { h: 92, lean: -1 }, { h: 74, lean: 2.5 },
  { h: 96, lean: -1.8 }, { h: 86, lean: 1.2 }, { h: 78, lean: -2.2 }, { h: 100, lean: 0.8 },
  { h: 88, lean: -1.4 }, { h: 80, lean: 2 }, { h: 94, lean: -0.6 }
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const rack = $('#rack');
const N = ART.length;
const perRow = Math.ceil(N / 2);
const rows = [0, 1].map(() => {
  const row = document.createElement('div');
  row.className = 'rack-row';
  rack.appendChild(row);
  return row;
});
const pieces = ART.map((a, i) => {
  const st = STAND[i % STAND.length];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rack-canvas';
  b.setAttribute('role', 'listitem');
  b.setAttribute('aria-label', `View: ${a.alt}`);
  b.style.setProperty('--h', `${st.h}%`);
  b.style.setProperty('--lean', `${st.lean}deg`);
  const img = document.createElement('img');
  img.src = asset(`assets/art/${a.src}.webp`);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  const label = document.createElement('span');
  label.className = 'rack-label';
  label.textContent = `No. ${ROMAN[i] || i + 1}`;
  b.append(img, label);
  b.addEventListener('click', () => openLightbox(i));
  rows[i < perRow ? 0 : 1].appendChild(b);
  return b;
});

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
lightbox.addEventListener('close', () => pieces[lbIndex].focus({ preventScroll: true }));
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
// Work, art and certificates live in the studio's chambers.
const openRoom = (name, after) => {
  if (isMobile()) closeAsk(false);
  if (window.openChamber) window.openChamber(name);
  if (after) setTimeout(after, reduceMotion ? 50 : 800);
};
const showWork = (cat) => openRoom('work', () => applyFilter(cat || 'all'));
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
    r: () => ({ text: kbText('Certifications'), actions: [{ label: 'Open the library', run: () => openRoom('library') }] }) },
  { w: ['skill', 'skills', 'tool', 'tools', 'software', 'figma', 'photoshop', 'adobe', 'illustrator', 'premiere', 'xd', 'proficient', 'good at'], k: 1.1,
    r: () => ({ text: kbText('Skills'), actions: [{ label: 'See his tools', run: () => goTo('about') }] }) },
  { w: ['service', 'services', 'offer', 'help with', 'hire for', 'video', 'editing', 'graphic', 'branding', 'logo'], k: 1.1,
    r: () => ({ text: kbText('Services'), actions: [contactAction] }) },
  { w: ['art', 'draw', 'drawing', 'drawings', 'sketch', 'sketches', 'paint', 'painting', 'portrait', 'portraits', 'graphite', 'artist'], k: 1.5,
    r: () => ({ text: 'Carlos draws, mostly graphite portraits, and paints now and then. They stand in the canvas rack in the studio.', actions: [{ label: 'Show the art', run: () => openRoom('art') }] }) },
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
    r: () => ({ text: kbText('Contact') || `You can email Carlos at ${EMAIL} or call him on +63 956 576 7967.`, actions: [contactAction, copyAction] }) },
  { w: ['post', 'posts', 'news', 'latest', 'recent', 'event', 'events', 'devfest', 'graduate', 'graduated', 'graduation', 'cum laude', 'activity', 'updates'], k: 1.5,
    r: () => ({ text: 'Carlos pins his recent LinkedIn posts to the wall in the studio: Google I/O Extended Manila 2026, graduating Cum Laude, the BaraKollect showcase and DevFest Manila 2025.', actions: [{ label: 'Show the wall', run: () => openRoom('notes') }] }) },
  { w: ['instagram', 'facebook', 'linkedin', 'social', 'socials', 'follow', 'ig', 'fb'], k: 1.4,
    r: () => {
      const names = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', facebook: 'Facebook' };
      const s = (kb && kb.info.socials) || {};
      return { text: 'You can find Carlos here:', list: Object.keys(s).map(k => ({ label: names[k] || k, href: s[k] })) };
    } },
  { w: ['where', 'location', 'based', 'live', 'lives', 'from', 'batangas', 'philippines'], k: 1,
    r: () => ({ text: `Carlos is based in ${(kb && kb.info.location) || 'Batangas, PH'}.` }) },
  { w: ['cv', 'resume'], k: 1.6, r: () => ({ text: "Here's Carlos's CV:", list: [{ label: 'Open CV (PDF)', href: 'assets/resumeee.pdf' }] }) },
  { w: ['leonardo', 'da vinci', 'davinci', 'vinci', 'painting', 'painted', 'canvas', 'easel', 'spin', 'hero', 'opening', 'studio'], k: 1.4,
    r: () => ({ text: "The opening is a live sitting: Leonardo da Vinci paints Carlos's portrait in his Florence workshop, and as you scroll the camera walks a full circle round the studio.",
      actions: [{ label: 'Watch it again', run: () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }) }] }) }
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
