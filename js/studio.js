/* ============================================
   The studio: memory lane
   1. Chambers: select an object and the camera leans in, then its room opens
      (the canvas → art, the flying machine → code, the bookshelf → certificates).
      Each chamber is also a URL: #art, #work, #library.
   2. The window turns day into night
   3. The ledger: every repository, read live from GitHub
   4. The library: certificates as books on a shelf
   5. The wall: recent LinkedIn posts pinned up as studies
   ============================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const studio = $('#studio');
const room = $('#room');
const roomScroll = $('#room-scroll');
const CHAMBERS = ['art', 'work', 'library', 'notes'];

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
// Certificates as books on the real bookshelf (assets/studio/bookshelf.jpg),
// each sealed with its Credly badge. `at` is the spine's x, y, width, height in the photo.
// Source: https://www.credly.com/users/carlos-yajie-fetizanan (badges.json).
// To add one: copy a book, set its badge id and image path from Credly, pick a
// spine in the photo for `at`, and list its skills (shared names group in the index).
const CREDLY = 'https://www.credly.com';
const badgeImg = (path) => `https://images.credly.com/size/340x340/images/${path}`;
const BOOKS = [
  { title: 'Google UX Design', at: [601, 224, 68, 237], spine: 'Google UX Design', issuer: 'Google · Coursera', date: '2025-04', badge: '4646ab32-93f6-4e9b-aec2-082ee7ca97f1', img: '78d71457-7637-4b02-8c0d-739814070bce/GCC_badge_UX_1000x1000.png',
    note: 'The end-to-end design process: research, sketching and wireframes through to tested, high-fidelity prototypes.',
    skills: ['UX design', 'UX research', 'Usability studies', 'Wireframing', 'Prototyping', 'Sketching & ideating', 'Figma', 'Adobe XD'], color: '#7a2318', h: 94, w: 3.2 },
  { title: 'Google Cybersecurity', at: [101, 217, 54, 244], spine: 'Google Cybersecurity', issuer: 'Google · Coursera', date: '2025-04', badge: '2d889fbc-6101-448f-81fd-5053852d9369', img: '0bf0f2da-a699-4c82-82e2-56dcf1f2e1c7/image.png',
    note: 'Foundational security practice: frameworks, networks, Linux, SQL and Python for detecting and answering threats.',
    skills: ['Network security', 'Information security', 'Threat analysis', 'Risk assessment', 'Vulnerability assessment', 'Intrusion detection', 'SIEM tools', 'NIST framework', 'Authentication', 'Linux', 'SQL', 'Python'], color: '#23402e', h: 88, w: 3.4 },
  { title: 'Google AI Essentials', at: [434, 265, 46, 196], spine: 'Google AI Essentials', issuer: 'Google · Coursera', date: '2024-12', badge: '96740747-ee59-4fc2-96a9-10ee2e97a837', img: 'ea3eec65-ddad-4242-9c59-1defac0fa2d9/image.png',
    note: 'Bringing AI into everyday work: prompting well, judging AI tools, and using them responsibly.',
    skills: ['Generative AI', 'Prompt engineering', 'Responsible AI', 'Evaluating AI tools', 'Critical thinking', 'Problem solving'], color: '#1f2f4f', h: 80, w: 2.6 },
  { title: 'AWS Cloud Quest: Cloud Practitioner', at: [1239, 233, 55, 228], spine: 'AWS Cloud Quest', issuer: 'Amazon Web Services', date: '2025-08', badge: '88216cc1-18e0-422f-af1e-65e814673299', img: '30816e43-2550-4e1c-be22-3f03c5573bb9/blob',
    note: 'Hands-on cloud fundamentals: building basic solutions with AWS services and the core concepts behind them.',
    skills: ['AWS', 'Cloud computing', 'Cloud foundations'], color: '#8a5a1c', h: 90, w: 2.9 },
  { title: 'AWS Educate: Machine Learning Foundations', at: [306, 263, 45, 198], spine: 'ML Foundations', issuer: 'Amazon Web Services · AWS Educate', date: '2025-04', badge: 'edca8ef7-2c7d-42d7-9c70-4608462df89e', img: '247efe36-9fa6-4209-ad56-0fd522283872/blob',
    note: 'The fundamentals of machine learning and how models are trained and put to work on AWS.',
    skills: ['Machine learning', 'AWS'], color: '#6b4a1a', h: 76, w: 2.3 },
  { title: 'AWS Educate: Introduction to Generative AI', at: [1201, 231, 38, 230], spine: 'Generative AI', issuer: 'Amazon Web Services · AWS Educate', date: '2025-04', badge: '09e4c411-f93a-4f0a-aa57-11396d7d7ae2', img: 'e50c657a-edd9-4c93-b1cf-2b6634b54abf/blob',
    note: 'How generative AI works, where it helps, and the AWS services built around it.',
    skills: ['Generative AI', 'AI & ML on AWS', 'AWS'], color: '#4a3a6a', h: 84, w: 2.4 },
  { title: 'AWS Educate: Machine Learning, DeepRacer', at: [1121, 294, 36, 167], spine: 'AWS DeepRacer', issuer: 'Amazon Web Services · AWS Educate', date: '2025-04', badge: '467eba20-e8af-4d95-b847-678648ac6cb9', img: '26fffe39-a730-47e5-8278-457de2d59174/image.png',
    note: 'Reinforcement learning in practice: building and training a model to drive an autonomous race car in the DeepRacer console.',
    skills: ['Reinforcement learning', 'Machine learning', 'AWS DeepRacer', 'AWS'], color: '#2f4a5a', h: 86, w: 2.6 },
  { title: 'Introduction to Red Hat OpenShift AI (AI262F)', at: [1157, 514, 62, 245], spine: 'OpenShift AI', issuer: 'Red Hat · Red Hat Academy', date: '2025-07', badge: 'b297ceaa-46d1-469c-83fd-b243cb019afe', img: 'edf8b467-a4db-4726-8a78-32fd43aac13a/blob',
    note: 'Running AI and ML workloads on Red Hat OpenShift AI, including custom notebook images.',
    skills: ['OpenShift AI', 'OpenShift', 'AI/ML workloads', 'Custom notebook images', 'Red Hat'], color: '#8c1d1d', h: 92, w: 2.7 },
  { title: 'Red Hat Application Development I: Programming in Java EE (AD183)', at: [1225, 518, 75, 241], spine: 'Java EE', issuer: 'Red Hat · Red Hat Academy', date: '2025-07', badge: '5527bda1-92cf-41e1-b17d-77b3b2151b62', img: 'b5a8e82a-d2cc-408c-80c4-649f26642a9e/blob',
    note: 'Building enterprise applications in Java EE through the Red Hat Academy course.',
    skills: ['Java EE', 'Application development', 'Red Hat'], color: '#5a1414', h: 82, w: 2.8 },
  { title: 'AI & Python', at: [214, 530, 61, 229], spine: 'AI & Python', issuer: 'DataCamp · Certificates', date: '', badge: '', img: '',
    note: 'Python for data work and the foundations of artificial intelligence.',
    skills: ['Python', 'Machine learning'], color: '#3b2a1e', h: 72, w: 2.2 },
  { title: 'BS Information Technology', at: [792, 621, 211, 54], spine: 'BS Information Technology', issuer: 'Batangas State University · Business Analytics', date: '', badge: '', img: '',
    note: 'The degree in progress: data, systems and the analytics that tie them together.',
    skills: ['Business analytics', 'Information systems'], color: '#5b1a2a', h: 98, w: 3.6 }
];
const shelf = $('#shelf');
const card = $('#book-open');
const chipsEl = $('#skill-chips');
let current = -1;
const when = (ym) => ym ? `Issued ${new Date(`${ym}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' })}` : '';

// Each certificate is a real book in the photo: the spine is cut from the same
// image, so it looks identical until it is lifted out of the shelf.
const SHELF_W = 1376, SHELF_H = 768;
const books = BOOKS.map((b, i) => {
  const [x, y, w, h] = b.at;
  const box = { left: `${(x / SHELF_W) * 100}%`, top: `${(y / SHELF_H) * 100}%`, width: `${(w / SHELF_W) * 100}%`, height: `${(h / SHELF_H) * 100}%` };
  const slot = el('span', 'slot');                       // the dark gap left behind
  Object.assign(slot.style, box);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `spine${w > h ? ' is-lying' : ''}`;
  btn.setAttribute('role', 'listitem');
  btn.setAttribute('aria-label', `${b.title}, ${b.issuer}`);
  btn.setAttribute('aria-pressed', 'false');
  Object.assign(btn.style, box);
  btn.dataset.x = x; btn.dataset.y = y;
  if (b.img) {
    const seal = el('img', 'book-seal');
    seal.src = badgeImg(b.img);
    seal.alt = '';
    seal.loading = 'lazy';
    btn.append(seal);
  }
  btn.append(el('span', 'spine-tag', b.spine));
  btn.addEventListener('click', () => openBook(i));
  shelf.append(slot, btn);
  return btn;
});
// keep each spine's slice of the photo lined up with the shelf behind it
function alignSpines() {
  const W = shelf.clientWidth, H = shelf.clientHeight;
  if (!W) return;
  books.forEach(btn => {
    btn.style.backgroundSize = `${W}px ${H}px`;
    btn.style.backgroundPosition = `${(-btn.dataset.x / SHELF_W) * W}px ${(-btn.dataset.y / SHELF_H) * H}px`;
  });
}
new ResizeObserver(alignSpines).observe(shelf);
$('#library').addEventListener('chamber:open', () => { alignSpines(); shelf.classList.remove('is-hinting'); void shelf.offsetWidth; shelf.classList.add('is-hinting'); });

function openBook(i) {
  if (current === i) {
    books[i].classList.remove('is-out'); books[i].setAttribute('aria-pressed', 'false');
    shelf.querySelectorAll('.slot').forEach(sl => sl.classList.remove('is-empty'));
    card.hidden = true; current = -1; return;
  }
  books.forEach((b, k) => { b.classList.toggle('is-out', k === i); b.setAttribute('aria-pressed', String(k === i)); });
  shelf.querySelectorAll('.slot').forEach((sl, k) => sl.classList.toggle('is-empty', k === i));
  current = i;
  const b = BOOKS[i];
  $('#book-issuer').textContent = b.issuer;
  $('#book-title').textContent = b.title;
  $('#book-date').textContent = when(b.date);
  $('#book-note').textContent = b.note;
  const img = $('#book-badge');
  img.hidden = !b.img;
  if (b.img) { img.src = badgeImg(b.img); img.alt = `${b.title} badge`; }
  const list = $('#book-skills');
  list.textContent = '';
  b.skills.forEach(sk => list.append(el('li', null, sk)));
  const link = $('#book-link');
  link.hidden = !b.badge;
  if (b.badge) link.href = `${CREDLY}/badges/${b.badge}`;
  card.style.setProperty('--book', b.color);
  card.hidden = false;
  card.classList.remove('is-in');
  void card.offsetWidth;
  card.classList.add('is-in');
}

// The index: every skill across the shelf, most-studied first.
// Choosing one dims the books that didn't teach it.
const counts = new Map();
BOOKS.forEach(b => b.skills.forEach(sk => counts.set(sk, (counts.get(sk) || 0) + 1)));
let chosen = null;
const chips = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([sk, n]) => {
    const c = el('button', 'skill-chip');
    c.type = 'button';
    c.setAttribute('aria-pressed', 'false');
    c.append(el('span', null, sk));
    if (n > 1) c.append(el('b', null, String(n)));
    c.addEventListener('click', () => chooseSkill(sk === chosen ? null : sk));
    c.dataset.skill = sk;
    chipsEl.append(c);
    return c;
  });

function chooseSkill(sk) {
  chosen = sk;
  chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.skill === sk)));
  books.forEach((b, i) => b.classList.toggle('is-dim', !!sk && !BOOKS[i].skills.includes(sk)));
}

/* ========== 5. THE WALL ========== */
// Recent LinkedIn posts, pinned to the wall like studies. LinkedIn doesn't let
// other sites read a profile's posts, so each one is listed here by hand.
// To add a post: on LinkedIn choose "…" → "Embed this post", copy the number
// after "ugcPost:" (or "share:"), and add a line at the top of this list.
const POSTS = [
  { urn: 'urn:li:ugcPost:7494583875445149696', date: '2026-08', title: 'Google I/O Extended Manila 2026',
    line: 'Not as a student anymore, but as a professional: an afternoon of AI talks on spec-driven development and agentic pipelines.',
    img: 'https://media.licdn.com/dms/image/v2/D5622AQErgcqqb_TT3g/feedshare-image-high-res/B56aAIcL2zHcAU-/0/1786848004381?e=2147483647&v=beta&t=KlleileyoSxeD551IsXRhD43MXCSPTphvERYClIE1fU' },
  { urn: 'urn:li:ugcPost:7487818208859541504', date: '2026-07', title: 'Graduated Cum Laude',
    line: 'BS Information Technology, major in Business Analytics, Batangas State University. Four years of data and front-end work. Ready to work.',
    img: 'https://media.licdn.com/dms/image/v2/D5622AQH-DfU1V5-FpQ/feedshare-image-high-res/B56Z.oS93jJoAU-/0/1785234972743?e=2147483647&v=beta&t=eSJUZ2gEEabfXwQqJkzeAvNkNXsLjFdPbLCSFwn3p8Q' },
  { urn: 'urn:li:ugcPost:7402128030942625792', date: '2025-12', title: 'BaraKollect, a featured showcase',
    line: 'Our capstone uses computer vision and analytics to study Liberica coffee beans, showcased at the campus’s 25th founding anniversary.',
    img: 'https://media.licdn.com/dms/image/v2/D5622AQHP-OV_0mZ0Jg/feedshare-image-high-res/B56ZrmkNCaL0Ao-/0/1764804846029?e=2147483647&v=beta&t=y2dNdcVspD584qgbSIpxLLjf4R7tOWOr1DiFSw59xc4' },
  { urn: 'urn:li:ugcPost:7395736182250364928', date: '2025-11', title: 'DevFest Manila 2025',
    line: 'A day of AI and Cloud with Google Developer Groups Manila: Gemini embeddings in ADK, multi-agent systems and the Gemini CLI.',
    img: 'https://media.licdn.com/dms/image/v2/D5622AQFcgsSOdK80kQ/feedshare-image-high-res/B56ZqLu0dfG4Ao-/0/1763280908456?e=2147483647&v=beta&t=85kulof6q7iEuUIv4zhr9bQTQ_JCn1HXtpgMmyRSgZc' }
];
const TILTS = [-2.4, 1.8, -1.2, 2.6, -1.8, 1.2];
const pinboard = $('#pinboard');
const letter = $('#letter');
const letterFrame = $('#letter-frame');
const monthYear = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' });
let openPost = -1;

const pinned = POSTS.map((post, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'study';
  b.setAttribute('role', 'listitem');
  b.setAttribute('aria-label', `${post.title}, ${monthYear(post.date)}. Read the post`);
  b.style.setProperty('--tilt', `${TILTS[i % TILTS.length]}deg`);
  const pic = el('span', 'study-pic');
  const img = el('img');
  img.src = post.img;
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => pic.classList.add('is-missing'), { once: true });
  pic.append(img);
  b.append(pic, el('span', 'study-date', monthYear(post.date)), el('span', 'study-title', post.title), el('span', 'study-line', post.line));
  b.addEventListener('click', () => readPost(i));
  pinboard.append(b);
  return b;
});

// The real post, embedded from LinkedIn, only loads once it is taken down.
function readPost(i) {
  if (openPost === i) { closeLetter(); return; }
  openPost = i;
  const post = POSTS[i];
  pinned.forEach((b, k) => b.classList.toggle('is-taken', k === i));
  $('#letter-date').textContent = `${monthYear(post.date)} · ${post.title}`;
  letterFrame.textContent = '';
  const frame = document.createElement('iframe');
  frame.src = `https://www.linkedin.com/embed/feed/update/${post.urn}?collapsed=1`;
  frame.title = `LinkedIn post: ${post.title}`;
  frame.allowFullscreen = true;
  letterFrame.append(frame);
  $('#letter-link').href = `https://www.linkedin.com/feed/update/${post.urn}/`;
  letter.hidden = false;
  letter.classList.remove('is-in');
  void letter.offsetWidth;
  letter.classList.add('is-in');
  letter.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
function closeLetter() {
  const was = openPost;
  openPost = -1;
  pinned.forEach(b => b.classList.remove('is-taken'));
  letter.hidden = true;
  letterFrame.textContent = '';
  if (was >= 0) pinned[was].focus({ preventScroll: false });
}
$('#letter-close').addEventListener('click', closeLetter);
