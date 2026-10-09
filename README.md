# Carlos Yajie Fetizanan - Portfolio

A personal portfolio for an ML developer, front-end developer, UI/UX designer and visual artist: it opens on Leonardo da Vinci painting Carlos's portrait in his Florence workshop, and as you scroll the camera walks a full circle round the studio.

## Overview

A single-page portfolio in plain HTML, CSS and JavaScript. No build step and no libraries: push to GitHub Pages and it runs.

- **The sitting** (`js/film.js`): the hero is a tall scroll track with a sticky stage. The opening shot hangs tilted beside the headline, comes off the wall to fill the screen, and then the 15-second studio footage plays forward and back with the scroll while notes about Carlos unfold. The footage is stored as frames in `assets/sitting/` (15 fps on desktop (about 13 MB), 10 fps on phones (about 4 MB)), loaded coarse-to-fine so any scroll position has a frame early. See [PROMPTS.md](PROMPTS.md) for how it was made and how to swap it.
- **Notes during the orbit**: five folded-paper notes (who he is, current internship, craft, certificates, motto) unfold in sync with the camera; their timing is the `data-from` / `data-to` seconds on each `.note` in `index.html`.
- **The close-up** (between Work and About): Leonardo's brush on the portrait, pushed in and out by the scroll. Frames in `assets/closeup/`.
- **Navigation**: a rail down the left edge with a wax-seal monogram and Roman-numeral folios. It tucks away while you scroll down and comes back when you scroll up or reach for the left edge. On phones it folds into a seal that opens a full-page index.
- **Type**: Cormorant Garamond and EB Garamond (Renaissance roman), Cinzel (Roman capitals for labels) and Kaushan Script for the brushed words, from Google Fonts.
- **The studio (memory lane)** (`js/studio.js`): Leonardo's empty workshop after the sitting. Select an object and the camera leans in, then its chamber opens (each is also a link: `#art`, `#work`, `#library`):
  - **The canvas** → paintings and drawings, standing in a two-shelf canvas rack (`ART` list in `js/site.js`).
  - **The flying machine** → selected projects with filters, plus the ledger: every public repository, read live from the GitHub API.
  - **The bookshelf** → certificates as books; take one out to read its cover (`BOOKS` list in `js/studio.js`).
  - **The window** → switches day and night.
- **Scenes**: About and Contact on candlelit umber.
- **Ask about Carlos**: a small assistant that answers from `lib/chatbot/knowledge-base.json` and the page itself, and can jump to sections.
- **Contact**: form with validation that opens a pre-filled Gmail draft.
- **Light and dark themes**: the toggle in the nav (or the `T` key) switches with a circular wipe. The first visit follows the system setting, and the choice is remembered. Light is the studio by window light; dark is the same room by candle.
- **Interaction layer** (`js/fx.js`): custom cursor with "Open", "View" and "Drag" labels, magnetic buttons, words and rows that rise in as you scroll, letters that lift under the cursor, a scroll progress bar, a back-to-top ring and count-up tool meters. Touch devices skip the cursor and magnetic effects; reduced-motion turns the movement off.
- Respects reduced-motion settings.

## Editing

| What | Where |
| --- | --- |
| Text, tagline, projects, certificates | `index.html` (each project is one `<li class="project">`) |
| The studio footage | `swift tools/make-frames.swift <video>` (see [PROMPTS.md](PROMPTS.md)) |
| Captions and their timing | the `.beats` list in `index.html` (`data-from` / `data-to` in seconds of footage) |
| Artwork | `assets/art/` plus the `ART` list in section 4 of `js/site.js` (sizes and tilts are in `HANG` just below it) |
| Colours and type | the `:root` variables at the top of `css/site.css` (one block for dark, one for `[data-theme="light"]`) |
| Ticker words | the `.marquee` block in `index.html` |

The previous version of the site is kept as `index-old.html`; it still uses `css/style.css`, `css/mediaqueries.css`, `css/glowing-effect.css`, `js/script.js` and `js/glowing-effect.js`. Delete those six files when you no longer need it.

Fonts (Bodoni Moda, Instrument Sans) are self-hosted under the SIL Open Font License.

## Links

- **GitHub**: [https://github.com/crlsyajie](https://github.com/crlsyajie)
- **LinkedIn**: [https://www.linkedin.com/in/carlos-yajie-fetizanan-b320a1286/](https://www.linkedin.com/in/carlos-yajie-fetizanan-b320a1286/)

## Local Development

To run the project locally for development and testing, you can use Python's built-in HTTP server:

```bash
python3 -m http.server 8000
```

Then, open your browser and navigate to `http://localhost:8000`. Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://` pages (you'll see the flat stand-in instead).

## AI Chatbot (Next.js Migration)

A local AI chatbot has been implemented for the future Next.js migration. It uses **Transformers.js** to run models directly in the browser, ensuring privacy and no token costs.

### Integration

To use the chatbot in your Next.js project:

1. Ensure dependencies are installed: `npm install @xenova/transformers lucide-react motion`
2. Import and add the `<ChatBot />` component to your main layout or page:

```tsx
import { ChatBot } from './components/chatbot/ChatBot';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
```

The chatbot will automatically load the knowledge base from `lib/chatbot/knowledge-base.json` and provide answers about your portfolio.
