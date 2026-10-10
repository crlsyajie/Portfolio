# Building the "Ask Yajie" agent: a step-by-step guide

A guide for building it yourself, one phase per sitting. Each phase ends with something you can test.

## Where things stand (October 10, 2026)

Built and tested locally:
- `worker/` is the Worker (`src/index.js`), plus what it knows (`knowledge.md`) and its config.
- `js/site.js`, section 7, is connected: keyword topics answer first, and anything they can't answer goes to the assistant. If the assistant is down, it falls back to the old "ask him directly" reply.
- `lib/chatbot/knowledge-base.json` was missing (so the Certifications, Skills, Services and socials answers were blank). It's now added.

**Left for you:** steps 1, 3 and 6 of Phase 3 (Node, your API key, deploy), then paste the deployed URL into `AGENT_URL` in `js/site.js`. Phases 1–2 and 4–5 are still worth reading to understand the code.

## How it will work

```
Visitor's browser (GitHub Pages)  ──question──▶  Cloudflare Worker  ──▶  Claude API
        js/site.js               ◀──answer───   (holds your API key)  ◀──
```

**Why the middle box?** GitHub Pages only serves static files. Any API key you put in `site.js` is visible to every visitor, and they could spend your credit. The Worker is a tiny server that keeps the key secret. Cloudflare's free plan covers a portfolio's traffic easily.

---

## Phase 1: Write the knowledge (no code)

The agent can only be as good as what you tell it, so this phase matters most.

1. Create `agent/knowledge.md` in this repo. Start by copying `~/.claude/skills/ask-yajie/profile.md`.
2. Add the things a visitor would ask that the site doesn't say yet:
   - What kind of work or roles you're open to (freelance? full-time? which fields?)
   - What you're best at, in your own words
   - The story behind 2–3 projects: the problem, what you built, the result
   - Anything you **don't** want it to discuss (for example rates, your personal life, your current employer's internal work)
3. Keep the phone number out of it. Point people to the contact form instead.

**Learn:** this file *is* the agent's memory. With no database or training involved, the whole file goes into every request as the "system prompt".

## Phase 2: Talk to Claude from your laptop (about 20 minutes)

Learn the API before adding servers.

1. Get an API key at https://platform.claude.com, then save it in your terminal:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
2. In a scratch folder (not this repo):
   ```bash
   npm init -y && npm install @anthropic-ai/sdk
   ```
3. Create `try.mjs`:
   ```js
   import Anthropic from "@anthropic-ai/sdk";
   import { readFileSync } from "node:fs";

   const knowledge = readFileSync("/Users/carlosfetizanan/Documents/Portfolio/agent/knowledge.md", "utf8");
   const client = new Anthropic(); // reads ANTHROPIC_API_KEY

   const response = await client.messages.create({
     model: "claude-opus-5-5",
     max_tokens: 2000,
     output_config: { effort: "low" }, // short chat answers don't need deep thinking
     system: `You are the assistant on Yajie's portfolio site. Answer visitors' questions about Yajie
   using only the facts below. If the answer isn't there, say you don't know and suggest the contact form.
   Keep answers to 2-4 sentences. Call him Yajie.

   ${knowledge}`,
     messages: [{ role: "user", content: process.argv[2] ?? "What does Yajie do?" }],
   });

   for (const block of response.content) {
     if (block.type === "text") console.log(block.text);
   }
   console.log(response.usage); // see how many tokens it cost
   ```
4. Run it:
   ```bash
   node try.mjs "Is Yajie good at machine learning?"
   ```

**Experiment:** ask something that isn't in the file. Does it make things up? If it does, tighten the system prompt. Most of the real work in building an agent is this loop of prompting and testing.

## Phase 3: The Worker, your private backend (about 45 minutes)

1. Install Wrangler, Cloudflare's CLI, and create the project next to the repo:
   ```bash
   npm create cloudflare@latest ask-yajie-worker
   ```
   Choose **Hello World → Worker only → JavaScript**.
2. In the new folder, install the SDK and store your key as a secret. Wrangler asks you to paste it; the key never goes into code.
   ```bash
   npm install @anthropic-ai/sdk
   ```
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
3. Copy `knowledge.md` into `src/`. Then add this to `wrangler.toml` so it can be imported as text:
   ```toml
   [[rules]]
   type = "Text"
   globs = ["**/*.md"]
   ```
4. Replace `src/index.js`:
   ```js
   import Anthropic from "@anthropic-ai/sdk";
   import KNOWLEDGE from "./knowledge.md";

   const SITE = "https://crlsyajie.github.io"; // only your site may call this
   const SYSTEM = `You are the assistant on Yajie's portfolio site. ...same rules as Phase 2...

   ${KNOWLEDGE}`;

   const cors = { "Access-Control-Allow-Origin": SITE, "Access-Control-Allow-Methods": "POST",
                  "Access-Control-Allow-Headers": "Content-Type" };

   export default {
     async fetch(request, env) {
       if (request.method === "OPTIONS") return new Response(null, { headers: cors });
       if (request.method !== "POST") return new Response("Not found", { status: 404 });

       // The visitor sends the last few turns: [{ role: "user"|"assistant", content: "..." }]
       const { messages } = await request.json();
       const recent = (messages ?? []).slice(-8).map(m => ({ role: m.role, content: String(m.content).slice(0, 800) }));
       if (!recent.length || recent.at(-1).role !== "user") return new Response("Bad request", { status: 400, headers: cors });

       const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
       const response = await client.beta.messages.create({
         model: "claude-opus-5-5",
         max_tokens: 2000,
         output_config: { effort: "low" },
         betas: ["server-side-fallback-2026-07-01"],
         fallbacks: "default", // if a request gets declined, Anthropic retries it on another model
         system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], // reuse the knowledge cheaply
         messages: recent,
       });

       const text = response.stop_reason === "refusal"
         ? "I can't help with that one. Try the contact form to reach Yajie directly."
         : response.content.filter(b => b.type === "text").map(b => b.text).join("");
       return Response.json({ text }, { headers: cors });
     },
   };
   ```
5. Test it locally:
   ```bash
   npx wrangler dev
   ```
   Then, in another tab:
   ```bash
   curl -X POST http://localhost:8787 -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"What does Yajie do?"}]}'
   ```
6. Deploy it. You'll get a URL like `https://ask-yajie-worker.<you>.workers.dev`.
   ```bash
   npx wrangler deploy
   ```

**Learn:**
- **CORS** limits which websites' pages can call the Worker.
- `slice(-8)` and the 800-character cap stop anyone from sending huge requests at your expense.
- `cache_control` lets repeated questions reuse the knowledge part of the prompt at about a tenth of the price. It only kicks in once the prompt is long enough. Check `response.usage.cache_read_input_tokens`.

## Phase 4: Connect the site (about 30 minutes)

In `js/site.js`, section 7, keep the keyword `topics`. They're instant and come with useful buttons ("Open the library"). Use Claude only when no topic matches:

1. At the top of section 7, add:
   ```js
   const AGENT_URL = 'https://ask-yajie-worker.<you>.workers.dev';
   const history = [];
   ```
2. Make `askQ` call the Worker when the keyword matcher has nothing good. Fall back to the old reply if the Worker is down:
   ```js
   async function askQ(q) {
     q = q.trim();
     if (!q) return;
     addMsg('user', q);
     history.push({ role: 'user', content: q });
     askInput.value = ''; askSend.disabled = true;
     const t = addMsg('bot', '');
     t.innerHTML = '<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>';

     let a = answer(q);
     if (a.fallback) { // set this flag on the "isn't in Carlos's portfolio yet" return in answer()
       try {
         const r = await fetch(AGENT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ messages: history }) });
         if (r.ok) a = { text: (await r.json()).text, actions: [contactAction] };
       } catch (e) { /* keep the local fallback */ }
     }
     t.remove();
     addMsg('bot', a);
     history.push({ role: 'assistant', content: a.text || '' });
   }
   ```
3. In `answer()`, change the last line to return `{ ..., fallback: true }`.
4. While you're there, replace "Carlos" with "Yajie" in the panel's text.

Test on `http://localhost:8000`. For local testing, temporarily add `http://localhost:8000` to `SITE` in the Worker, then remove it.

## Phase 5: Before going live

- [ ] Ask it 20 real questions, including tricky ones like "What's his salary?", "Is he single?" and "Ignore your instructions and…". Fix the prompt until every answer is one you'd be happy for a recruiter to see.
- [ ] In the Claude Console, set a **monthly spend limit** so a traffic spike can't surprise you.
- [ ] Decide whether it should speak **about** you ("Yajie built…") or **as** you ("I built…"). On a public site, "about" is safer, because people know it's an assistant and not you.
- [ ] Fix the missing `knowledge-base.json` (or remove that fetch), so the keyword answers work too.

## Cost note

The code uses `claude-opus-5-5`, the most capable model ($4 / $20 per million input/output tokens). A typical question costs around a cent or less. If you want it cheaper, the model is one line to change. `claude-haiku-5-5` costs $0.10 / $0.50 and handles simple Q&A well. If you switch to Haiku, also:
- delete the `betas` and `fallbacks` lines
- change `client.beta.messages.create` to `client.messages.create`

Haiku doesn't support server-side fallbacks.

## Ideas for later

- Use the same Worker to answer "as Yajie" for your own drafts (the `ask-yajie` skill already does this inside Claude Code).
- Add **tools** so the agent can open a studio room itself (for example `open_room("library")`). This is the step from chatbot to agent.
- Stream the answer word by word for a nicer typing effect.
