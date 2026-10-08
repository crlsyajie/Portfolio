# Carlos Yajie Fetizanan - Portfolio

A personal portfolio for an ML developer, front-end developer, UI/UX designer and visual artist. Dark graphite with a papaya-orange 3D orb that follows you through the page.

## Overview

A single-page portfolio built with plain HTML, CSS and JavaScript, plus [three.js](https://threejs.org) for the 3D orb. No build step: push to GitHub Pages and it runs.

- **3D orb**: a papaya sphere drawn with a custom shader. It bulges toward the cursor, ripples when clicked, and travels to a new spot in each section as you scroll.
- **Work**: projects from GitHub with category filters.
- **Art**: drawings and paintings on a 3D ring you can drag, turn with the arrow keys, and open full size.
- **Ask about Carlos**: a small assistant that answers from `lib/chatbot/knowledge-base.json` and the page itself, and can jump to sections.
- **Contact**: form with validation that opens a pre-filled Gmail draft.
- Falls back to a flat orb when WebGL isn't available, and respects reduced-motion settings.

## Editing

| What | Where |
| --- | --- |
| Text, projects, certificates | `index.html` (each project is one `<li class="project">`) |
| Where the orb sits in each section | the `data-orb` and `data-orb-mobile` attributes on each `<section>` |
| Artwork | `assets/art/` plus the `ART` list near the top of section 4 in `js/site.js` |
| Colours and type | the `:root` variables at the top of `css/site.css` |
| Orb shape and shading | `js/orb.js` |

The previous version of the site is kept as `index-old.html`; it still uses `css/style.css`, `css/mediaqueries.css`, `css/glowing-effect.css`, `js/script.js` and `js/glowing-effect.js`. Delete those six files when you no longer need it.

Fonts (Unbounded, Instrument Sans) are self-hosted under the SIL Open Font License; three.js r169 is vendored in `js/vendor/` under the MIT license.

## Links

- **GitHub**: [https://github.com/crlsyajie](https://github.com/crlsyajie)
- **LinkedIn**: [https://www.linkedin.com/in/carlos-yajie-fetizanan](https://www.linkedin.com/in/carlos-yajie-fetizanan)

## Local Development

To run the project locally for development and testing, you can use Python's built-in HTTP server:

```bash
python3 -m http.server 8000
```

Then, open your browser and navigate to `http://localhost:8000`. Opening `index.html` directly from disk won't work, because browsers block JavaScript modules on `file://` pages (you'll see the flat orb instead).

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
