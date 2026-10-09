/* ============================================
   The studio: memory lane
   1. Chambers: select an object and the camera leans in, then its room opens
      (the canvas → art, the flying machine → code, the bookshelf → certificates).
      Each chamber is also a URL: #art, #work, #library.
   2. The window turns day into night
   3. The ledger: every repository, read live from GitHub
   4. The library: certificates as books on a shelf
   ============================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const studio = $('#studio');
const room = $('#room');
const roomScroll = $('#room-scroll');
const CHAMBERS = ['art', 'work', 'library'];

/* ========== 1. CHAMBERS ========== */
let openName = null;
let opener = null;
const outside = () => [$('#site-nav'), $('.sitting'), $('.studio-head', studio), roomScroll, $('.room-legend', studio), $('#closeup'), $('#about'), $('#contact'), $('.site-foot')].filter(Boolean);

function hotspotFor(name) { return $(`.hotspot[data-chamber="${name}"]`, room); }

function openChamber(name, { push = true, from = null } = {}) {
  const ch = document.getElementById(name);
  if (!ch || !CHAMBERS.includes(name)) return;
  if (openName) closeChamber({ silent: true });
  openName = name;
  opener = from || document.activeElement;
  if (push && location.hash !== `#${name}`) history.pushState({ chamber: name }, '', `#${name}`);

  // lean in toward the object, then step inside
  const hs = hotspotFor(name);
  if (hs) {
    room.style.setProperty('--zx', hs.style.getPropertyValue('--x'));
    room.style.setProperty('--zy', hs.style.getPropertyValue('--y'));
  }
  const inView = studio.getBoundingClientRect().top < window.innerHeight && studio.getBoundingClientRect().bottom > 0;
  if (!inView) studio.scrollIntoView({ behavior: 'instant', block: 'start' });
  room.classList.add('is-leaning');
  const delay = reduceMotion || !inView ? 0 : 520;
  setTimeout(() => {
    ch.hidden = false;
    requestAnimationFrame(() => ch.classList.add('is-open'));
    document.documentElement.classList.add('chamber-open');
    outside().forEach(el => { el.inert = true; });
    const title = $('h2', ch);
    if (title) title.focus({ preventScroll: true });
    ch.scrollTop = 0;
    ch.dispatchEvent(new CustomEvent('chamber:open'));
  }, delay);
}

function closeChamber({ silent = false } = {}) {
  if (!openName) return;
  const ch = document.getElementById(openName);
  ch.classList.remove('is-open');
  ch.hidden = true;
  document.documentElement.classList.remove('chamber-open');
  outside().forEach(el => { el.inert = false; });
  room.classList.remove('is-leaning');
  openName = null;
  if (!silent && opener && opener.focus) opener.focus({ preventScroll: true });
}

// buttons anywhere on the page can open a chamber
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chamber]');
  if (b) { e.preventDefault(); openChamber(b.dataset.chamber, { from: b }); return; }
  if (e.target.closest('[data-close-chamber]')) {
    e.preventDefault();
    if (history.state && history.state.chamber) history.back(); else { closeChamber(); history.replaceState(null, '', '#studio'); }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openName && !$('#lightbox').open) {
    if (history.state && history.state.chamber) history.back(); else { closeChamber(); history.replaceState(null, '', '#studio'); }
  }
});
// the browser's back button closes a chamber; links to #art, #work or #library open one
function fromHash(push) {
  const name = location.hash.slice(1);
  if (CHAMBERS.includes(name)) openChamber(name, { push });
  else if (openName) closeChamber();
}
window.addEventListener('popstate', () => fromHash(false));
window.addEventListener('hashchange', () => fromHash(false));
if (CHAMBERS.includes(location.hash.slice(1))) {
  history.replaceState({ chamber: location.hash.slice(1) }, '', location.hash);
  window.addEventListener('load', () => fromHash(false), { once: true });
}
window.openChamber = (name) => openChamber(name);

// On phones the room is wider than the screen: start looking at the easel.
function centreRoom() {
  if (roomScroll.scrollWidth > roomScroll.clientWidth) roomScroll.scrollLeft = (roomScroll.scrollWidth - roomScroll.clientWidth) * 0.42;
}
const roomImg = $('.room-img', room);
if (roomImg.complete) centreRoom(); else roomImg.addEventListener('load', centreRoom, { once: true });
window.addEventListener('resize', centreRoom);

/* ========== 2. THE WINDOW ========== */
const windowSpot = $('[data-theme-window]', room);
const dayNight = $('.hs-daynight', room);
const syncWindow = () => { dayNight.textContent = document.documentElement.dataset.theme === 'dark' ? 'Let the day in' : 'Let night fall'; };
syncWindow();
document.addEventListener('themechange', syncWindow);
windowSpot.addEventListener('click', (e) => {
  // hand the click to the theme toggle, so night spreads out from the window itself
  $('#theme-toggle').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
});

/* ========== 3. THE LEDGER ========== */
const reposEl = $('#repos');
let ledgerLoaded = false;
const LANG = { JavaScript: '#e0b33a', TypeScript: '#3c78b5', Python: '#4b74a6', HTML: '#d8643a', CSS: '#7d5fae', 'Jupyter Notebook': '#d9822b', Java: '#a8662f', PHP: '#7377ad', 'C++': '#c0466e', Dart: '#2d9aa8' };
const month = (iso) => new Date(iso).toLocaleDateString('en', { month: 'short', year: 'numeric' });

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

async function loadLedger() {
  if (ledgerLoaded) return;
  ledgerLoaded = true;
  try {
    const r = await fetch('https://api.github.com/users/crlsyajie/repos?per_page=100&sort=updated');
    if (!r.ok) throw new Error(r.status);
    const repos = (await r.json()).filter(x => !x.private);
    reposEl.textContent = '';
    repos.forEach((x, i) => {
      const li = el('li', 'repo');
      li.style.setProperty('--i', Math.min(i, 20));
      const a = el('a');
      a.href = x.html_url; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('span', 'repo-no', String(i + 1).padStart(2, '0')));
      const body = el('span', 'repo-body');
      body.append(el('span', 'repo-name', x.name + (x.fork ? ' (fork)' : '')));
      if (x.description) body.append(el('span', 'repo-desc', x.description));
      a.append(body);
      const meta = el('span', 'repo-meta');
      if (x.language) {
        const lang = el('span', 'repo-lang', x.language);
        lang.style.setProperty('--dot', LANG[x.language] || '#9a8a74');
        meta.append(lang);
      }
      if (x.stargazers_count) meta.append(el('span', 'repo-stars', `★ ${x.stargazers_count}`));
      meta.append(el('span', 'repo-date', month(x.pushed_at || x.updated_at)));
      a.append(meta);
      li.append(a);
      reposEl.append(li);
    });
    if (!repos.length) reposEl.append(el('li', 'repos-wait', 'No public repositories yet.'));
  } catch (_) {
    ledgerLoaded = false;
    reposEl.textContent = '';
    const li = el('li', 'repos-wait');
    li.append('The ledger could not be read just now. ');
    const a = el('a', null, 'See every repository on GitHub');
    a.href = 'https://github.com/crlsyajie?tab=repositories'; a.target = '_blank'; a.rel = 'noopener';
    li.append(a);
    reposEl.append(li);
  }
}
$('#work').addEventListener('chamber:open', loadLedger);

/* ========== 4. THE LIBRARY ========== */
// To add a certificate, add a book here. h = spine height (%), w = thickness (rem).
const BOOKS = [
  { title: 'Google UX Design', issuer: 'Google · Professional Certificate', note: 'User research, wireframes, prototypes and usability testing, from first sketch to finished Figma file.', href: 'https://www.credly.com/badges/4646ab32-93f6-4e9b-aec2-082ee7ca97f1/linked_in_profile', color: '#7a2318', h: 92, w: 3.2 },
  { title: 'Google Cybersecurity', issuer: 'Google · Professional Certificate', note: 'Security frameworks, networks, Linux, SQL and Python for keeping systems safe.', href: 'https://www.credly.com/badges/2d889fbc-6101-448f-81fd-5053852d9369/linked_in_profile', color: '#23402e', h: 86, w: 3 },
  { title: 'Google AI Essentials', issuer: 'Google', note: 'Using generative AI tools well: prompting, responsible use and everyday productivity.', href: 'https://www.credly.com/badges/96740747-ee59-4fc2-96a9-10ee2e97a837/linked_in_profile', color: '#1f2f4f', h: 78, w: 2.4 },
  { title: 'AWS Cloud Quest', issuer: 'Amazon Web Services · Cloud Practitioner', note: 'Hands-on cloud fundamentals: compute, storage, networking and security on AWS.', href: 'https://www.credly.com/badges/88216cc1-18e0-422f-af1e-65e814673299/linked_in_profile', color: '#8a5a1c', h: 88, w: 2.8 },
  { title: 'AI & Python', issuer: 'DataCamp · Certificates', note: 'Python for data work and the foundations of artificial intelligence.', href: '', color: '#3b2a1e', h: 74, w: 2.2 },
  { title: 'BS Information Technology', issuer: 'Batangas State University · Business Analytics', note: 'The degree in progress: data, systems and the analytics that tie them together.', href: '', color: '#5b1a2a', h: 96, w: 3.6 }
];
const shelf = $('#shelf');
const card = $('#book-open');
let current = -1;

const books = BOOKS.map((b, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'book';
  btn.setAttribute('role', 'listitem');
  btn.setAttribute('aria-label', `${b.title}, ${b.issuer}`);
  btn.setAttribute('aria-pressed', 'false');
  btn.style.setProperty('--book', b.color);
  btn.style.setProperty('--bh', `${b.h}%`);
  btn.style.setProperty('--bw', `${b.w}rem`);
  btn.append(el('span', 'book-title', b.title));
  btn.addEventListener('click', () => openBook(i));
  shelf.append(btn);
  return btn;
});

function openBook(i) {
  if (current === i) { books[i].classList.remove('is-out'); books[i].setAttribute('aria-pressed', 'false'); card.hidden = true; current = -1; return; }
  books.forEach((b, k) => { b.classList.toggle('is-out', k === i); b.setAttribute('aria-pressed', String(k === i)); });
  current = i;
  const b = BOOKS[i];
  $('#book-issuer').textContent = b.issuer;
  $('#book-title').textContent = b.title;
  $('#book-note').textContent = b.note;
  const link = $('#book-link');
  link.hidden = !b.href;
  if (b.href) link.href = b.href;
  card.style.setProperty('--book', b.color);
  card.hidden = false;
  card.classList.remove('is-in');
  void card.offsetWidth;
  card.classList.add('is-in');
}
