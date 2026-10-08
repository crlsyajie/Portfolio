# Carlos Yajie Fetizanan - Portfolio

A personal portfolio for an ML developer, front-end developer, UI/UX designer and visual artist: obsidian and champagne, set in Bodoni, with a polished amber 3D form that changes shape as you scroll.

## Overview

A single-page portfolio in plain HTML, CSS and JavaScript, plus [three.js](https://threejs.org) for the 3D form. No build step: push to GitHub Pages and it runs.

- **The form**: a polished amber object drawn with a custom shader. It morphs between five shapes (sphere, twisted cube, gem, bloom, hourglass), one per section. Click it, or use the "Reshape the form" button in the hero, to cycle through them. It leans toward the cursor, ripples where you click, and travels to a new spot as you scroll.
- **Work**: projects from GitHub with category filters.
- **Art**: drawings and paintings on a 3D ring you can drag, turn with the arrow keys, and open full size.
- **Ask about Carlos**: a small assistant that answers from `lib/chatbot/knowledge-base.json` and the page itself, and can jump to sections.
- **Contact**: form with validation that opens a pre-filled Gmail draft.
- **Light and dark themes**: the toggle in the nav (or the `T` key) switches with a circular wipe. The first visit follows the system setting, and the choice is remembered. The 3D form picks up a paler room in light mode.
- **Interaction layer** (`js/fx.js`): custom cursor with "Open", "View" and "Drag" labels, magnetic buttons, words and rows that rise in as you scroll, letters that lift under the cursor, a ticker that speeds up and reverses with your scrolling, hero parallax, a scroll progress bar, a back-to-top ring and count-up tool meters. Touch devices skip the cursor and magnetic effects; reduced-motion turns the movement off.
- Falls back to a flat amber disc when WebGL isn't available, and respects reduced-motion settings.

## Editing

| What | Where |
| --- | --- |
| Text, tagline, projects, certificates | `index.html` (each project is one `<li class="project">`) |
| Where the form sits and which shape it takes in each section | the `data-orb` and `data-orb-mobile` attributes on each `<section>` ("x y size wobble shape") |
| Artwork | `assets/art/` plus the `ART` list in section 4 of `js/site.js` |
| Colours and type | the `:root` variables at the top of `css/site.css` (one block for dark, one for `[data-theme="light"]`) |
| Ticker words | the `.marquee` block in `index.html` |
| Shapes and material | `js/orb.js` (`shapeAt` for the shapes, `studio` for the reflections) |

The previous version of the site is kept as `index-old.html`; it still uses `css/style.css`, `css/mediaqueries.css`, `css/glowing-effect.css`, `js/script.js` and `js/glowing-effect.js`. Delete those six files when you no longer need it.

Fonts (Bodoni Moda, Instrument Sans) are self-hosted under the SIL Open Font License; three.js r169 is vendored in `js/vendor/` under the MIT license.

## Links

- **GitHub**: [https://github.com/crlsyajie](https://github.com/crlsyajie)
- **LinkedIn**: [https://www.linkedin.com/in/carlos-yajie-fetizanan](https://www.linkedin.com/in/carlos-yajie-fetizanan)

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
