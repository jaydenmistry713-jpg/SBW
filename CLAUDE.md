# CLAUDE.md — SBW Events Website

## Project Overview
SBW Events website for sbwevents.co.uk. Family-run weddings and events business based in Scotland. The site is fully built and in revision/maintenance phase.

**Tone/identity note:** SBW Events is open to all occasions and cultures — not exclusively Asian weddings. South Asian expertise is mentioned sparingly (once in the About "Cultural Expertise" value card and implicitly through the business name "Shadi Biyah Wale"). Do NOT lead with "Asian weddings" in headlines or descriptions.

**Enquiries email:** SBWevents@outlook.com  
**Display emails:** SBWevents@outlook.com + shadibiyahwale@outlook.com  
**Phone:** +44 7831 322188  
**Instagram:** @shadibiyahwale  
**Built by:** Jayden Mistry, first under Mistuzzo Marketing. **Since 2026-11-07 the client is a Builds by Leo client** (Jayden Mistry trading as Builds by Leo). The studio's own standing context is `C:\Users\jayde\Desktop\buildsbyleo\CLAUDE.md`, and invoices follow its `INVOICES.md`.  
**CRM:** lead `fnft4fah` ("SBW Events", status won) in the Builds by Leo admin console. Read or update it with `node C:/Users/jayde/Desktop/buildsbyleo/site/scripts/crm.mjs show fnft4fah`.  
**Footer credit:** every public page's `.footer-bottom` has a `.footer-credit` line, "Website by Builds by Leo ↗", linking to https://buildsbyleo.com (replaced the old Mistuzzo Marketing link 2026-11-06; styles in `nav.css`)

### Pending client message — Asian identity direction
> Hey! Just a heads up on a change we made — the site previously mentioned Asian weddings quite heavily throughout, but we felt it was making things seem too niche and could put off potential clients from other backgrounds. We've broadened the language across the site so it now reads as weddings and events for everyone, while still keeping a nod to South Asian expertise in the About section.
>
> When you have a look at the demo, let us know — are you happy with that direction, or would you prefer we lean back into the Asian weddings angle more?

---

## Commercial terms (recorded 2026-11-07, from Jayden)
- **Build price £260.** £130 deposit **paid**; the £130 balance is **still awaited** (a CRM follow-up is set for Fri 13 Nov 2026 to check it).
- **£48/year** after the first 12 months.
- **Jayden has told the client that a full page refresh costs £15.** Quote that figure for any refresh request, and never a different one without asking Jayden first.

---

## CRITICAL: File Editing Rules

### NEVER use PowerShell `Get-Content` / `Set-Content` on HTML files
PowerShell 5.1's `Get-Content` reads UTF-8 files as Windows-1252 by default (no BOM = ambiguous encoding). Re-saving with `Set-Content -Encoding utf8` then writes the mis-read bytes as UTF-8, corrupting every non-ASCII character (e.g. `—` → `â€"`, `é` → `Ã©`). This has happened twice.

**Always use one of these safe alternatives instead:**
1. The `Edit` tool (preferred — diff-only, no re-encoding)
2. Python: `open(f, 'r', encoding='utf-8')` / `open(f, 'w', encoding='utf-8')` (no BOM)
3. PowerShell .NET class: `[System.IO.File]::ReadAllText(path, [Text.Encoding]::UTF8)` + `[System.IO.File]::WriteAllText(path, content, (New-Object Text.UTF8Encoding $false))`

If symbols like `â€"` or `Ã©` ever appear in HTML files, run `fix_encoding.py` (in project root) to reverse the mojibake.

### NEVER apply backdrop-filter (or filter/transform/perspective/will-change) directly to an element that has position:fixed descendants
Per the CSS spec, those properties turn the element into a new containing block for fixed-positioned children, which breaks their viewport-relative positioning. The mobile `#nav-links` drawer is `position:fixed` and lives inside `.main-nav`. The scrolled-state blur **must** be applied via `.main-nav::before` (a pseudo-element with `position:absolute; inset:0; z-index:-1`), NOT on `.main-nav` directly. Putting `backdrop-filter` on `.main-nav` itself collapses the drawer to zero height when scrolled.

---

## Tech Stack — STRICTLY HTML, CSS, VANILLA JAVASCRIPT ONLY
- No frameworks (no React, Vue, Next.js, Angular, Svelte)
- No CSS frameworks (no Tailwind, Bootstrap)
- No jQuery
- No build tools, no bundlers, no npm, no package.json
- Plain HTML5, CSS3, vanilla JavaScript (ES6+) in IIFEs
- Hosting: Netlify (static site)
- Database/CMS: Supabase JS SDK loaded via CDN
- Forms: Netlify Forms (zero email backend code)
- Reviews: **Elfsight Google Reviews widget** (CDN embed — no server-side code, no API key needed)
- **Netlify plan: Pro** — one Function in use: `netlify/functions/submission-created.js` (enquiry emails via Resend — see Contact Form). `/netlify/functions/reviews.js` was removed when switching to Elfsight.
- **Email: Resend** (account **jaydenmistry713@gmail.com** — Jayden's own account, using one of its domain slots). Sending domain `sbwevents.co.uk`, from `website@sbwevents.co.uk` (send-only, **no mailbox** — Reply-To is always the customer).

## Local Development
**Files use root-relative paths — they MUST be served from a local server, not opened directly.**

**VS Code Live Server** or `python -m http.server 8080` → http://localhost:8080

### Environment Variables
Set in Netlify → Project configuration → Environment variables (never committed):
- `RESEND_API_KEY` (required for enquiry emails) — from the Resend account jaydenmistry713@gmail.com
- `ENQUIRY_EMAIL_TO` (optional, comma-separated) — defaults to `SBWevents@outlook.com`; was `jayden@buildsbyleo.com` during testing; switched to the client's address 2026-11-06 (by Jayden) — re-point it temporarily if you ever need to test again
- `ENQUIRY_EMAIL_FROM` (optional) — defaults to `SBW Events Website <website@sbwevents.co.uk>`

The Elfsight widget needs no key.

---

## File Structure (complete build)
```
/
  index.html              — Homepage (hero slider, services, reviews) — CTA banner removed. (.cta-banner CSS retained but no longer used anywhere — blog index and /blog/* articles had their CTA banners removed too)
  about.html              — About page (story, values, stats)
  services.html           — Services overview (4 cards)
  gallery.html            — Gallery (Supabase fetch, lightbox — no filters)
  contact.html            — Contact/enquiry form (Netlify Forms)
  blog.html               — Blog index (static card grid linking to /blog/ articles)
  404.html                — Branded 404 (noindex; Netlify serves it automatically for missing paths)
  favicon.ico / favicon-96x96.png / apple-touch-icon.png — Favicons generated from logo.png (Pillow); apple-touch-icon has a cream bg because iOS fills transparency black
  sitemap.xml             — SEO sitemap (all 16 public pages; update when adding/removing pages)
  robots.txt             — Allows all, disallows /admin/, points to sitemap.xml
  netlify.toml            — Netlify build/redirect/header config (incl. 301 sbweventslive.netlify.app/* → sbwevents.co.uk)
  /services/
    event-planning.html
    event-management.html
    bespoke-decor.html
    catering.html         — Menu selector (Buffet/Table Service, Menu 1/2)
  /blog/                  — Static article pages (hand-authored HTML, no CMS)
    5-reasons-to-have-a-wedding-coordinator.html
    weddings-and-celebrations-for-every-culture.html
    questions-to-ask-before-booking-a-wedding-planner.html
    choosing-a-wedding-venue-in-scotland.html
    make-your-wedding-decor-your-own.html
    catering-for-a-large-guest-list.html
  /admin/
    index.html            — Supabase Auth login
    enquiries.html        — Enquiries viewer (reads from Supabase enquiries table; tap/click to expand)
    gallery.html          — Gallery manager (upload, edit, delete)
    menus.html            — Menu item editor
    texts.html            — Editable text fields
  /css/
    main.css              — CSS custom properties, reset, layout, buttons, CTA, typography
    nav.css               — Header, top bar, main nav, dropdown, mobile menu, footer
    hero.css              — Homepage hero slider
    cards.css             — Service cards, review cards, team/value cards
    catering.css          — Menu selector UI + catering intro section
    contact-form.css      — Enquiry form, conditional sections, thank-you
    gallery.css           — Gallery editorial grid (nth-child spans), lightbox
    blog.css              — Blog index card grid + single-article prose/tip/blockquote layout
    admin.css             — Admin dashboard, login, gallery/menu/text managers
  /js/
    main.js               — Global: sticky header, mobile menu, dropdown, active link
    hero-slider.js        — 5-slide auto-cycling hero with dots, swipe, pause on hover
    menu-selector.js      — Tab + sidebar + panel logic; Supabase CMS fetch with static fallback
    contact-form.js       — Conditional show/hide logic; Netlify fetch submit; URL param pre-fill (no Supabase — saved server-side)
    gallery.js            — Supabase fetch, lightbox (prev/next/Esc/overlay) — no filter logic
    admin.js              — Supabase Auth, gallery CRUD, menu editor, text editor, enquiries viewer
  /netlify/functions/
    submission-created.js — Enquiry email via Resend + admin-dashboard row in Supabase (auto-triggered by Netlify Forms; no dependencies)
    supabase-config.js    — Supabase client init (credentials filled in)
```

---

## Section Background System

### Utility classes
| Class | Background |
|---|---|
| `.section` (default) | Plain white |
| `.section--warm` | White + faint gold radial glow at top (5% opacity) — used on key white-bg content sections |
| `.section--cream` | `--color-cream` + repeating 64px concentric diamond SVG pattern (gold, 15–20% stroke-opacity) |
| `.section--dark` | `--color-dark` |
| `.section--green` | `--color-green` |

### Specific section treatments
- **`.intro-strip`** — `--color-cream` + centred radial gold gradient + large 480px diamond ornament watermark pseudo-element (opacity 0.06). `.intro-strip__inner` has `z-index: 1` to sit above the ornament.
- **`.reviews-section`** — `--color-cream-dark` + same diamond SVG pattern (slightly higher opacity).
- **`.review-card`** — `linear-gradient(145deg, white → cream)` + gold top border tint.
- **`.value-card`** — `linear-gradient(160deg, white → cream)` + 2px gold top border (45% opacity).

### SVG pattern note
The diamond tile pattern is a pure CSS data URI — no external image files. Hex `#C9A84C` is hardcoded inside the data URI (CSS variables cannot be used there).

---

## Brand Colours
```css
:root {
  --color-green: #2D5016;
  --color-green-dark: #1E3510;
  --color-green-light: #3D6B20;
  --color-gold: #C9A84C;
  --color-gold-light: #E8D49A;
  --color-gold-dark: #A8873A;
  --color-blush: #C9889A;       /* from logo floral wreath */
  --color-blush-light: #F0DDE2; /* light blush tint */
  --color-cream: #FAF7F2;
  --color-cream-dark: #F0EBE3;
  --color-dark: #1A1A1A;
  --color-mid: #555555;
  --color-border: #E8E0D5;
  --color-white: #FFFFFF;
}
```
Never hardcode hex values in component CSS — always use variables.

## Typography
- Headings: Cormorant Garamond (primary, Google Fonts CDN) — elegant high-contrast serif for luxury feel
- Headings fallback: Playfair Display (also loaded)
- Body: Inter (Google Fonts CDN)
- All three loaded in `<head>` of every HTML page via single Google Fonts link
- Heading `font-weight: 400` (Cormorant looks best at lighter weights)
- Section labels: `letter-spacing: 0.25em` for refined feel

## Logo
- File: `/logo.png` — circular logo, transparent background (converted from logo.jpg via Pillow), "SBW" decorative green script, gold diamond frame, blush floral wreath
- Used in nav as `<img src="/logo.png" class="nav-logo__img">` (height: 88px)
- Footer still uses text logo (white text on dark bg — image wouldn't work)

## Images
- Original high-res photos: `/images/` folder (48 JPEG files, ~421 MB total) — **never referenced by the site directly, do not delete**
- Web-optimised copies: `/images/web/` folder (48 JPEG files, ~17.9 MB total) — **all HTML src/data-src attributes point here**
- Compressed with Pillow: max 2000px, quality 82, ICC colour profiles preserved. Run `fix_encoding.py` equivalent script to re-compress if new images are added.
- URL-encode spaces in `src` attributes: space → `%20`, e.g. `/images/web/IMG_6084%20Sumayyah.jpeg`
- Names contain spaces, `&`, `(` `)` — always URL-encode when writing src attributes manually

### CMS-uploaded images (Supabase Storage) — egress control (added 2026-07-24)
Client uploads via `/admin/gallery.html` are never assumed to be pre-compressed (client uploads straight from phone/camera). Two independent layers keep Supabase Storage egress from scaling with either upload size or site traffic:
1. **Upload-time compression** — `js/admin.js` `compressImage()` runs every file through a canvas resize/re-encode (max 2000px longest edge, JPEG quality 0.82 — same targets as the static Pillow pipeline above) before it reaches `uploadFiles()`. Output is always `.jpg`. Falls back to uploading the original file if canvas decode/export fails (e.g. an undecodable format), so a bad file never blocks the upload.
2. **Netlify Image CDN proxy on serve** — `js/gallery.js` `toCdnUrl()` rewrites any `<img>`/lightbox `src` that points at the Supabase Storage public URL (prefix hardcoded from `SUPABASE_URL` in `supabase-config.js`) to `/.netlify/images?url=...&w=...&q=80` (grid thumbs at `w=900`, lightbox at `w=1800`). Netlify's edge caches the transformed result, so repeat visitors are served from Netlify instead of hitting Supabase Storage again. Requires the `[images].remote_images` allowlist entry in `netlify.toml` matching the Supabase storage URL prefix — update both if the Supabase project URL ever changes. `withCdnFallback()` swaps back to the raw Supabase URL on image load error (covers local dev via `python -m http.server`, where `/.netlify/images` doesn't exist — only live Netlify deploys or `netlify dev` serve it).
- **Cache lifetime is set by Supabase, not Netlify (verified 2026-11-06):** Netlify Image CDN honours the remote source's `Cache-Control` for its own edge cache. Objects uploaded with the old `cacheControl: '3600'` meant Netlify only cached each transform for 1 hour (`Cache-Status: ... hit; ttl=3600`), after which every edge node re-pulled the full original from Supabase — the egress risk this whole setup exists to avoid. New uploads now use `cacheControl: '31536000'` (safe: filenames are unique and never overwritten). All 48 existing objects were re-uploaded in place with the 1-year header on 2026-11-06 (48/48 OK; verified `max-age=31536000` on Supabase and `Cache-Status: ... hit; ttl=31535999` on Netlify). If you ever overwrite an object at the same path, the old version can be served for up to a year — always upload to a new path instead.
- **Admin gallery thumbnails** (`admin.js` `toCdnThumb()`) also go through `/.netlify/images` at `w=400`, with a fallback to the raw URL on error.
- Static `/images/web/*` images are untouched by either layer — they're already compressed and served directly by Netlify, not Supabase, so they aren't an egress concern.
- **Gallery page migrated to the CMS (2026-07-24)**: all 48 images that were hardcoded into `gallery.html`'s `.gallery-grid` markup have been copied into Supabase Storage (`gallery` bucket, `gallery/legacy-*` paths) and `gallery_images`, via a one-off browser-console script (not committed — run once from an authenticated `/admin/gallery.html` session; it read each image's real `data-alt`/`data-category` out of the existing HTML so the CMS rows have proper descriptions and categories, not filename-derived ones). The hardcoded `.gallery-item` markup in `gallery.html` itself was left in place — per the existing "static fallback, Supabase overwrites on load" pattern, it now only renders if the Supabase fetch fails, and is superseded by the 48 (+ any newly admin-uploaded) rows the rest of the time.
- **Hero slider (index.html) and Recent Work grid (index.html) are separate and still fully hardcoded** — they were not part of this migration and are not sourced from `gallery_images`. Only the dedicated Gallery page (`gallery.html`) pulls from the CMS.

---

## Before Go-Live Checklist
1. ~~**supabase-config.js**~~ — Done. Credentials filled in.
2. ~~**Supabase tables**~~ — Done. `gallery_images`, `catering_menus`, `editable_texts` created; storage bucket `gallery` created; RLS set up. **Client CMS user** (SBWevents@outlook.com) re-created 2026-11-06 via Auth → Users → Add user (Auto Confirm) with a password she chose; Jayden keeps his own separate login. Public sign-ups disabled the same day.
   - **`enquiries` table** — RLS + anon INSERT + authenticated SELECT policies, `GRANT INSERT ON public.enquiries TO anon` and `GRANT SELECT ON public.enquiries TO authenticated`. **Long-standing 403/RLS issue (flagged since original build) fixed 2026-07-23** — `SELECT count(*) FROM public.enquiries` showed 0 real rows had ever saved. Root cause was never actually a missing/broken INSERT policy (the original `enquiries_insert` policy was fine); **it only ever looked broken when a request also asked Postgres to return the inserted row** (`Prefer: return=representation`, or supabase-js `.insert().select()`) — that makes Postgres additionally enforce a SELECT policy on the new row, and `anon` was only ever granted INSERT, not SELECT, so the RETURNING clause failed with the exact same generic RLS error text, masking the fact that a plain `.insert()` (no `.select()`) — which is what `contact-form.js` actually calls — was fine all along. **Do not add `.select()` to the anon-facing insert in `contact-form.js`** — it would immediately reintroduce this failure. A duplicate pair of policies (`Allow anon insert` / `Allow authenticated select`) was added on top of the pre-existing `enquiries_insert` / `enquiries_select` during this debugging session; they're redundant but harmless (multiple permissive policies are OR'd) and were left in place rather than risk breaking anything by removing them.
   - **Dashboard save moved server-side (2026-11-06):** the old browser-side insert in `contact-form.js` was silently blocked by ad blockers / tracking protection for some visitors (confirmed 2026-07-23, and again 2026-11-06 when Jayden's own test enquiry emailed fine but never reached the dashboard). The insert now happens in `netlify/functions/submission-created.js` (`saveToDashboard()`, REST POST with the public anon key, `Prefer: return=minimal`) for every verified submission, so no visitor's browser can block it and Netlify-flagged spam never reaches the dashboard. `contact.html` no longer loads supabase-js. **Do not add `return=representation`/`.select()` to that insert** (same RLS reason as above).
3. **Netlify** — ~~Connect repo~~ Done: project `sbweventslive` (Pro plan), auto-deploys from `master`. Netlify's form notification goes to Jayden's Gmail (Netlify won't allow non-team-member addresses). **Client enquiry emails go via Resend instead** (see Contact Form) — done 2026-11-06: domain verified in Resend (Squarespace DNS), `RESEND_API_KEY` set, tested to jayden@buildsbyleo.com, then switched to the client's address. Server-side dashboard save confirmed working live.
4. ~~**Google Reviews**~~ — Done. Elfsight widget embedded in `index.html` (app `72ea1c53-…`). Note it renders via JS, so review text may not be indexed by Google (see SEO Backlog).
5. **Replace stock images** — Client uploads real photos via admin CMS (`/admin/gallery.html`)
6. **About page content** — Client supplies real team story and portrait photo
7. **About stats** — Currently shows 100+ Events Delivered, 5★ Google Rating, 52.8K Instagram Followers (3 stats, 3-col layout at 1024px+)
8. **Custom domain** (status 2026-11-06) — DNS for `sbwevents.co.uk` (Squarespace Domains) now points at Netlify: apex A → `75.2.60.5`, `www` CNAME → `sbweventslive.netlify.app`; Netlify primary domain is the apex and `www` 301s to it. **HTTPS confirmed live 2026-11-06** (Let's Encrypt issued later that day): `http://` and `www` both 301 to `https://sbwevents.co.uk/`; `sitemap.xml` + `robots.txt` serve 200. netlify.app→custom-domain 301 deployed. **Google Search Console** Domain property verified and `sitemap.xml` submitted 2026-11-06 (16 pages discovered). Indexing requested for home, services, the 4 `/services/*`, about, contact, blog (gallery hit the ~10/day quota — request it + the 6 `/blog/*` articles another day; the sitemap covers them anyway). Google's only prior crawl (Sep 2026, Squarespace parking page) recorded "Blocked by robots.txt" — stale, live robots.txt is fine. Live test enquiry done 2026-11-06 (email + dashboard both confirmed). Remaining (optional — they're in the sitemap): request indexing for `gallery.html` + the 6 `/blog/*` articles in Search Console.
9. **Admin "Texts" editor is not wired up** — `/admin/texts.html` reads/writes `editable_texts`, but **no public page reads that table**, so edits there change nothing on the live site. Decide before the client uses the admin: hide it from the admin nav, or wire specific `data-` keys on public pages to it. The client-facing "what you can edit" message deliberately omitted it.
10. ~~**Handover**~~ — done 2026-11-06. Client account created, enquiry emails switched to her, handover PDF sent. The PDF ("SBW Events - Website Handover.pdf", 9 pages) is kept **outside the repo** in `C:\Users\jayde\Desktop\Websites\` on purpose — anything inside the repo root gets published. Plain English and names no providers. Covers: key links; login (password described only as "the one you chose and sent to Jayden"); Enquiries / Gallery / Menus; enquiry emails; security; SEO in place + SEO as an ongoing process; reminders (add the site to her Google Business Profile, send a test enquiry). It deliberately omits the Texts editor (item 9) and the Facebook link, and tells her to contact Jayden for a forgotten password (reset emails won't reach her until Supabase custom SMTP is configured — the verified Resend domain could be used).
11. **Still open after handover:** Texts editor decision (item 9); Facebook icon still links to bare facebook.com (needs her page URL); optional Supabase custom SMTP so "Forgot your password?" works for her.

---

## Netlify Forms — Required on Every Form
Every `<form>` element must include:
- `data-netlify="true"`
- `name="[form-name]"` (e.g. `name="enquiry"`)
- `<input type="hidden" name="form-name" value="[form-name]">`
- Zero email code — Netlify handles all routing

Contact form: `name="enquiry"` — emailed to SBWevents@outlook.com by `netlify/functions/submission-created.js` via Resend (not the Netlify dashboard notification; see Contact Form).

---

## Supabase Integration
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```
Load before `/js/supabase-config.js` on pages that need it (gallery, catering, admin).

```js
// supabase-config.js — credentials are filled in, window.supabaseClient is set globally
const SUPABASE_URL = 'https://ryvmutpznmjphyghmqvu.supabase.co'
const SUPABASE_ANON_KEY = '...'
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```
Note: uses `window.supabaseClient` (not `const`) so the client is accessible as a global in all scripts.

### Supabase Table Schemas
```sql
-- gallery_images
id uuid primary key, url text, alt_text text, category text, sort_order int, created_at timestamptz

-- catering_menus
id uuid primary key, menu_type text, menu_number int, course_name text, item_text text, sort_order int

-- editable_texts
id uuid primary key, key text unique, value text, updated_at timestamptz
```

---

## Key Rules for Edits
1. Mobile-first always. Write CSS for 375px first, then min-width media queries.
2. All images: `alt` text + `loading="lazy"` (heroes use `loading="eager"`).
3. No placeholder lorem ipsum — use real content.
4. CSS custom properties for all colours — no hardcoded hex in component CSS.
5. Contact form conditional logic is pure vanilla JS (show/hide on `change` events).
6. Menu selector: tab buttons + sidebar buttons + right panel, pure class toggling.
7. Admin pages: `<body class="admin-page">` — `admin.js` checks for Supabase session on every load.
8. NO Node.js, NO server-side code, NO npm.
9. All JS is written as IIFEs with `'use strict'`.
10. No inline styles except truly dynamic JS-set values.

---

## Component Notes

### Navbar
- Sticky: JS adds `.scrolled` class to `#site-header` on scroll (threshold: 60px)
- **Transparent by default**: `.main-nav` has `background: transparent` over the hero/page-hero. Nav links are white (`rgba(255,255,255,0.92)`) with `text-shadow` for readability.
- **On scroll**: `.site-header.scrolled .main-nav` becomes `rgba(15, 25, 10, 0.95)` with `backdrop-filter: blur(8px)` and a shadow.
- **Mobile menu open**: `.main-nav:has(.nav-toggle.is-open)` becomes `rgba(15, 25, 10, 0.97)` so the X icon reads cleanly without the hero image bleeding through. Mobile nav `<a>` elements are `display: flex` (overriding `inline-flex`) so the border-bottom dividers span the full drawer width.
- Mobile drawer: white background — links override back to `var(--color-dark)` in `@media (max-width: 767px)`.
- Hamburger bars: white (`rgba(255,255,255,0.9)`) — readable against both transparent hero and dark scrolled state.
- Mobile: `.nav-toggle` toggles `.is-open` on `#nav-links`; body overflow hidden while open
- Dropdown: uses `visibility: hidden/visible` + `opacity` (NOT `display:none/block`) — this allows CSS transitions and prevents gap-hover bug. On mobile the dropdown is **always visible** (`display: block; visibility: visible`) — no toggle button, no accordion. The `.dropdown-toggle` button is hidden on mobile via `display: none`.
- Active link: `main.js` matches `window.location.pathname` and adds `.active` to matching `<li>`
- Logo: `<img src="/logo.png" class="nav-logo__img">` — 64px tall image, transparent background PNG
- **Page-hero on sub-pages**: `margin-top` removed, `padding-top: var(--header-height)` added instead — dark green bg extends behind fixed nav so transparent nav has a dark background on all pages.

### Scroll Reveal Animations (added 2026-11-06)
- `main.js` (every public page) tags below-the-fold content matching `REVEAL_SELECTORS` with `.reveal` and uses an IntersectionObserver to add `.is-revealed` — a 0.7s fade + 24px rise. Siblings entering together stagger 90ms (max 4 steps) via a JS-set `--reveal-delay` custom property.
- **Elements already on screen at load are never touched** (no flash, no LCP delay) — so above-the-fold heroes never animate.
- Uses the standalone CSS `translate` property (not `transform`) so it can't clash with components' `transform` hover effects; once revealed, both classes and the delay are removed so each component's own transitions apply untouched.
- The transition lives only on `.reveal.is-revealed` (hiding is instant). Selectors are `html .reveal…` to out-rank later component CSS (`cards.css`, page `<style>` blocks) that set their own `transition`.
- Disabled entirely under `prefers-reduced-motion` and when IntersectionObserver is missing. Gallery items are excluded (`gallery.js` has its own Load More reveal); blog article prose and the Elfsight widget are deliberately not animated.
- To animate a new component, add its selector to `REVEAL_SELECTORS` — no markup changes needed.

### SEO (sitemap, robots, structured data, social meta)
- **`sitemap.xml`** lists all 16 public pages (excludes `/admin/`). **When you add or remove a page, update the sitemap.**
- **`robots.txt`** allows everything except `/admin/` and references the sitemap.
- **Structured data (JSON-LD)** (expanded 2026-11-06): every public page carries a `LocalBusiness` block with `@id` `https://sbwevents.co.uk/#business` (name, `alternateName` = Shadi Biyah Wale, typed `areaServed` = Scotland / Glasgow / Edinburgh, phone, email, logo, `knowsAbout`, `sameAs` Instagram + TikTok). Homepage adds a `WebSite` block (drives Google's site-name display). Every sub-page adds a `BreadcrumbList` that **mirrors its visible `.breadcrumb` nav exactly** — if you change a visible breadcrumb, change the JSON-LD too. `/services/*` pages add a `Service` block (`provider` → the `#business` @id). `/blog/*` articles carry `BlogPosting` (headline, description, hero image, `datePublished`/`dateModified`, url, author/publisher). Admin pages have none. Validate with Google's Rich Results Test after changes.
- **Social meta**: every public page has the same ordered head block: canonical, favicons, `og:site_name`, `og:locale` (en_GB), `og:type`, `og:title`, `og:description`, `og:url`, `og:image` (+alt), `article:published_time`/`modified_time` on blog posts, `twitter:card` (summary), `twitter:title`, `twitter:description`, `twitter:image`. **The image is the logo (`/logo.png`)** per client request. Note: a transparent-background logo can render with a plain/box background on some social platforms — if richer social previews are wanted later, swap to a dedicated 1200×630 banner and switch `twitter:card` to `summary_large_image`.
- These were applied in bulk via a Python script (UTF-8 safe, idempotent; 2026-11-06 — not committed). New pages do NOT get them automatically — add the tags + JSON-LD when creating a page, or re-run the injection logic.
- **Homepage H1** (2026-11-02): the small gold `.hero__eyebrow` line is the `<h1>` ("Wedding & Event Specialists in Scotland"); the big "Shadi Biyah *Wale*" `.hero__tagline` is a `<p>` (visual only — the brand name has no search volume). Keep exactly one H1 per page.
- **Keyword titles** (2026-11-02): homepage + event-planning / event-management / bespoke-decor `<title>` and `og:title` now lead with "Wedding … Scotland" search terms, ending `| SBW Events`.
- **Related Reading** (2026-11-02): each `/services/*` page has a `.related-reading` section (styles in `main.css`) just before the CTA banner, linking 2 relevant `/blog/` articles using the article title as anchor text. When adding a blog article, consider linking it from the matching service page.

### SEO Backlog (deferred — revisit in the SEO pass)
Derived from an SEO plan Jayden used on another project, adapted to SBW. Agreed 2026-11-02 to defer these:

**Item 6 — Location mentions (remainder).** Structured data `areaServed` already done. Still to apply — only reuses the coverage the client already approved on the contact page ("Glasgow, Edinburgh, the Central Belt and beyond"):
| Where | Current | Proposed |
|---|---|---|
| `index.html` intro strip `<p>` | "…based in Scotland, bringing warmth, expertise, and creativity to every occasion. From intimate mehndi nights…" | "SBW Events is a family-run events business based in Scotland, working across Glasgow, Edinburgh, the Central Belt and beyond. We bring warmth, expertise and creativity to every occasion — from intimate mehndi nights to grand weddings — and handle every detail so you can focus on celebrating." |
| `index.html` meta description | "…halal catering across Scotland. Weddings, celebrations…" | "…halal catering across Scotland, from Glasgow and Edinburgh to the Central Belt and beyond. Weddings, celebrations and special occasions of all kinds." |
| `about.html` story `<p>` | "Based in Scotland and operating across the whole country…" | "Based in Scotland and working right across the country — from Glasgow and Edinburgh to the Central Belt and beyond…" |
| `index.html` Recent Work subtitle | "…across Scotland and beyond." | "…brought to life in Glasgow, Edinburgh and across Scotland." — **only if the client confirms real events in both cities** |

Open questions for the client: (a) which town/city they're actually based in — if she's happy to name it, add `addressLocality` to the JSON-LD + mention on the contact page, matching her Google Business Profile; (b) whether they've genuinely delivered events in both Glasgow and Edinburgh. Do NOT create thin per-city landing pages — only build a Glasgow/Edinburgh page if she can supply real venues/events there.

**Other deferred items:**
- **FAQs** — none on the site yet. Plan: booking FAQs on contact page; service-specific FAQs on each service page (halal, minimum numbers, décor-only, 500-guest capacity, multiple events/day, working with the couple's venue). No duplicated answers across pages. Skip FAQPage schema (Google limited FAQ rich results in 2023).
- **Real event case studies** — 3–5 real events (venue, city, guest count, services, photos). Needs client input. Highest-impact item.
- **Crawlable reviews** — Elfsight renders reviews via JS, so Google may not index the text. With permission, hardcode 2–3 real reviews into `index.html` too.
- **Blog cluster** — e.g. wedding planner cost in Scotland (needs pricing ranges), planner vs coordinator, multi-day weddings (mehndi → reception), planning timeline (was previously retired — check with client).
- **Blog → CMS (deferred 2026-11-02)** — client may want to add/edit posts herself. Agreed approach if revisited: **server-render via a single dependency-free Netlify Function** (`netlify/functions/`, plain `fetch` to Supabase REST, no npm) that serves `/blog/*.html` and the blog index from a `blog_posts` table, with CDN caching — keeps existing URLs, per-post meta/OG/JSON-LD, avoids the ad-blocker-blocks-Supabase problem, and can generate the sitemap. **Rejected client-side rendering** (blank articles for ad-blocked visitors, generic social previews, weaker indexing). This would be a deliberate exception to the "no server-side code" rule — needs Jayden's sign-off. Admin side: post list, draft/published, title/slug/summary/tag/read-time/date, cover upload via existing `compressImage()`, vanilla toolbar editor (h2/h3/bold/italic/lists/quote/link, sanitised HTML); optional "tip box" button to preserve `.tip` blocks in migrated articles.
- **Positioning decision (client's call)** — whether to target "Asian wedding planner Glasgow"-type searches via one dedicated page, given the current broad brand direction.

### Blog (blog.html + /blog/*.html)
- **Static, no CMS.** Every article is a hand-authored HTML file in `/blog/`. The index (`blog.html`) is a manually maintained `.blog-grid` of `.blog-card`s — when adding an article, create the `/blog/` file AND add a card to the index.
- All blog pages reuse the standard site chrome (header/nav/footer) byte-identical to other pages, plus `/css/blog.css`. Articles also link `main.css`, `nav.css`, `cards.css`.
- **Nav**: "Blog" is a top-level nav item between Gallery and Contact, and a footer Quick Links item, on **every** page. If the nav/footer changes, update all pages (index, about, services, gallery, contact, the 4 `/services/*`, blog.html, and all `/blog/*`).
- Article layout: `.article` (max 760px) > `.article__meta` (tag/date/read-time) + `.article__lead` + `.article-body` (prose: h2/h3/p/ul/blockquote). Numbered tips use `.tip` > `.tip__num` + `.tip__body`. Footer is just `.article-footer` (back-to-blog) — the shared `.cta-banner` was removed from the blog index and all articles.
- Six articles, SEO-focused for "events company in Scotland" (coordinator tips, questions to ask before booking a planner, choosing a venue in Scotland, bespoke décor, catering at scale, and an inclusive "celebrations for every culture" piece). The planning-timeline article was retired. Content is original and truthful to the business; South Asian heritage referenced sparingly per the brand direction.
- Active-link highlighting: `main.js` won't mark "Blog" active on `/blog/*` article pages (same as Services on `/services/*`) — expected, consistent behaviour.

### Service Area / Coverage
- Client removed North England as a service area (2026-07-23) — the business now states Scotland only. Stated on the contact page ("Where We Work" item): based in Scotland, covering the whole country (Glasgow, Edinburgh, the Central Belt and beyond), with destination events on request. Footer tagline sitewide says "across Scotland." All meta descriptions, JSON-LD `areaServed`, and body copy mentioning "North England" were removed sitewide (index, about, services, gallery, contact, all `/services/*`, blog.html, all `/blog/*`).

### About Page (about.html only)
- Page-specific layout/timeline CSS lives in an inline `<style>` block in the `<head>` (established pattern for this page — `.about-story`, `.about-stats`, `.stat`, `.timeline`).
- **Section order**: Page hero → Story (`section--warm`) → **Our Journey** (`section--cream`, timeline) → Stats (`section--warm`) → Values (`section--warm`). Stats was changed from cream to warm so it doesn't collide with the cream Journey section and so the cream `.stat` cards stand out.
- **Our Journey** — a gold vertical timeline (`.timeline` > `.timeline__item` with `::before` line + `::after` dot, `.timeline__phase` label + `h3` + `p`). Five phases telling the company history (mother-daughter start just before 2020, community-driven growth → team/vans/warehouse/showroom, events up to 500 guests + multiple/day, destination weddings, creativity/no-repeat-décor ethos). Content sourced from a client voice note — South Asian origin mentioned once and sparingly per the brand direction; no fabricated dates or claims.

### Hero Slider (index.html only)
- 5 slides, 5s interval, CSS opacity fade
- `hero-slider.js`: dots, touch swipe, pause on hover
- Dots: `.hero__dot` with `.is-active`, counter in `.hero__counter`
- Tagline: "Shadi Biyah / Wale" (h1 — "Wale" in gold italic via `<span>`) replacing the old "Your Vision / Our Creation" copy

### Menu Selector (catering.html only)
- Tabs: `[data-tab]` → `#tab-buffet` / `#tab-table`
- Sidebar: `[data-panel]` → panel IDs
- Static HTML fallback — Supabase fetches `course_name` + `item_text` rows and updates the DOM in place
- `menu-selector.js` guards with `if (!window.supabaseClient)` before fetching

### Contact Form (contact.html only)
- Netlify AJAX submit via `fetch('/')` with URL-encoded body
- Thank-you div `#form-thankyou` shown on success; form hidden
- URL params: `?service=event-planning|event-management|bespoke-decor|catering` pre-checks the matching service checkbox (and, for décor/catering, the package dropdown) — no longer touches Event Type, since Services Required is always visible
- **Conditional sections use `disabled` on hidden inputs** — `showSection()` enables all child inputs, `hideSection()` disables them. Disabled inputs are excluded from FormData entirely, so Netlify's email only shows fields the user actually filled in. All conditional sections are initialised as disabled on page load — **except** `#services-section` ("Services Required") and `#planning-section` ("Venue Details"), which carry `is-visible` directly in the HTML and are excluded from the disable-on-load loop, so they always show and their inputs are always enabled, regardless of Event Type or navigation path (fixed 2026-07-23 — previously they only appeared for wedding-type Event Types or via a `?service=` link from the services pages). `handleEventTypeChange()` now only toggles `#corporate-section`; it no longer touches Services Required or Venue Details.
- **Enquiry emails (Resend, added 2026-11-06):** Netlify's own form notifications can now only go to Netlify *team members* (non-Enterprise plans), so SBWevents@outlook.com couldn't be added there. Instead `netlify/functions/submission-created.js` runs automatically after every verified (non-spam) Netlify Forms submission, and for `form_name === 'enquiry'` (1) POSTs a branded HTML + plain-text email to the Resend API and (2) inserts the row into Supabase `enquiries` for the admin dashboard — independently via `Promise.allSettled`, so one failing never blocks the other (plain `fetch`, no npm). New form fields also need adding to `toDashboardRow()` (and a matching Supabase column). Sections/labels mirror the form fields and option values in `contact.html` — **if you add/rename a form field or option, update `LABELS` / `buildSections()` in the function too**, or it won't appear in the email. Empty fields/sections are dropped; all customer input is HTML-escaped. Reply-To = the customer's email; buttons for Reply / Call / WhatsApp (UK numbers normalised to 44…); mobile layout stacks via a `max-width:620px` media query. Uses `Idempotency-Key: enquiry-<submission id>` so a re-delivered event can't double-send. Errors are logged (Netlify → Logs → Functions → submission-created). The old Netlify email notification (to Jayden's Gmail) can stay as a backup.
- **Private files:** because the repo root is the publish dir, `netlify.toml` 404s `/netlify/*`, `/CLAUDE.md`, `/fix_encoding.py` and the PRD/old-CLAUDE docs. Add a rule if you commit other internal files at the root.
- **Décor/Catering is a single checkbox + dropdown** (`#cb-decor-catering` → reveals `#decor-catering-package-section` with a "Food & Décor" / "Décor Only" select, `name="decor_catering_package"`) — added 2026-07-23 because catering is never sold as a stand-alone service. Event Planning and Event Management remain separate checkboxes. The dropdown value drives which of `#decor-section` / `#catering-section` show, mirroring the old separate-checkbox behaviour.
- **General fields added 2026-07-23**: `venue_location` (free text, always visible, next to Event Type), `number_of_events` (select 1/2/3/4+, for people enquiring about multiple functions), `menu_preference` (optional Menu 1/Menu 2 select inside the catering sub-section, distinct from the existing Buffet/Table Service `menu_type` radio), `budget` (free text, placed near the end of the form before Additional Notes).
- **Guest Count** (`#guest-count`, `name="guest_count"`): required (was optional and labelled "Approximate Guest Count" until 2026-07-23) — now just "Guest Count" with the `required` attribute, and moved to sit directly after Venue/Location & Number of Events and before the Services Required section (was previously after Venue Details, near the end of the form).
- **Supabase `enquiries` table**: the columns above (`venue_location`, `number_of_events`, `menu_preference`, `budget`, `service_decor_catering`, `decor_catering_package`) are written by `contact-form.js` — **all added to the Supabase table (confirmed 2026-11-02)**, along with `archived boolean not null default false`.

### Gallery (gallery.html only)
- Static fallback images in HTML; Supabase replaces on load if configured. All 48 originally-hardcoded images are now also in `gallery_images` (see the Images section above), so in normal operation the page renders from Supabase and the static markup is a fallback only.
- Supabase-sourced images (grid thumbs + lightbox) are served through the Netlify Image CDN proxy, not directly from Supabase Storage — see [CMS-uploaded images (Supabase Storage) — egress control](#images) above.
- **Load More pagination** (`js/gallery.js`): only the first 12 `.gallery-item`s render initially; the rest carry `.is-deferred` (hidden via CSS) until the "Load More" button reveals them in batches of 12 (`BATCH_SIZE`). The static HTML hand-authors `.is-deferred` on items 13+. Because `buildGridFromSupabase()` wipes and rebuilds the grid from scratch, `applyPagination()` re-derives `.is-deferred` from each item's position in the *new* DOM order every time the grid is rebuilt (not just once at page load) — skipping this after a rebuild was a real bug (fixed 2026-07-24): the "Showing X of Y" counter and Load More button state came from the original static markup and went stale the moment Supabase's fetch replaced it, so the count text didn't match what was actually visible. Also note `bindGalleryItems()` clones every `.gallery-item` on each call (its listener-reset mechanism) — the per-image CDN-fallback `error` listener (`withCdnFallback`) has to be re-attached inside that same function on every bind, not once at creation, or it gets silently dropped by the clone.
- No filter buttons — all images shown, visual-first layout
- Grid: editorial CSS Grid with `nth-child` column spans for varied shapes (no row spans — avoids dense-flow complexity). Pattern: mobile 2-col every-3rd full-width; 640px 3-col every-2nd spans 2; 1024px 4-col every-3rd spans 2. Row heights set via `grid-auto-rows` per breakpoint.
- Lightbox: `#lightbox` with prev/next/close/Escape/overlay-click
- **Page hero**: uses `<img class="page-hero__img">` directly inside `.page-hero` (same as other sub-pages) — NOT a `.page-hero__bg` wrapper div, which would cause the image to flow inline as a flex child instead of filling the hero.

### Recent Work Grid (index.html only)
- **Full-bleed layout**: `.work-grid` is a direct child of the `.section`, NOT wrapped in `.container` — images span full viewport width edge-to-edge.
- Section header and CTA button each have their own `.container` wrapper within the same section.
- `.section > .work-grid` gets `margin-top: var(--space-10)` for spacing after the section header.
- Grid: 2 col mobile, 4 col desktop (`grid-auto-rows: 240/320/380px`), 8 images = 2 rows on desktop
- Images are large and cinematic (no aspect-ratio constraint — rows fill with `object-fit: cover`)
- No nth-child spans — clean uniform grid, visual weight from large row heights

### Admin CMS (/admin/)
- Login at `/admin/index.html` → `supabaseClient.auth.signInWithPassword()` → `/admin/enquiries.html`
- **Stays signed in per device (2026-11-06):** supabase-js persists the session in `localStorage` and auto-refreshes the token, so admin pages never re-prompt until "Sign Out" (or the browser's site data is cleared / a private window is used). The login page itself redirects straight to `/admin/enquiries.html` when a session already exists — except on a password-reset link visit (`IS_RECOVERY_LINK` / `AUTH_LINK_ERROR`), which also creates a session but must still show the reset form.
- **Password reset (added 2026-11-06):** the login card has three views toggled with `hidden` — `#login-form`, `#forgot-form` (`resetPasswordForEmail`, `redirectTo` = `/admin/index.html`) and `#reset-form` (`updateUser({ password })` → `/admin/enquiries.html`). `admin.js` reads the URL hash **at script load, before supabase-js clears it**: `type=recovery` → reset view; `error_description` (expired/used link) → forgot view with a message. Supabase → Authentication → URL Configuration is set (confirmed 2026-11-06): Site URL `https://sbwevents.co.uk`, Redirect URLs include `https://sbwevents.co.uk/admin/*` — keep these if the domain ever changes. This is how the client sets her own password — nobody should ever send her one.
- **Reset emails & Supabase's built-in mailer:** the default Supabase SMTP only delivers to members of the Supabase org/team (and is heavily rate-limited). For the client's address to receive reset emails, either configure custom SMTP (Auth → Emails → SMTP; e.g. Resend with `sbwevents.co.uk` verified in Squarespace DNS) or add her as a team member.
- **Public sign-ups MUST stay disabled** (Auth → Sign In / Providers → "Allow new users to sign up" off). Every RLS policy grants `authenticated` — including SELECT on `enquiries` (customer PII) and gallery storage insert/update/delete — so any self-registered account would get full CMS access. There is deliberately no sign-up UI; add users from the Supabase dashboard (Auth → Users → Add/Invite user). Check with `GET /auth/v1/settings` → `disable_signup: true`.
- **Storage policies:** `storage.objects` has authenticated insert/delete, plus `Authenticated update gallery` + `Authenticated select gallery` (added 2026-11-06 for the cache-header re-upload).
- **Admin form styling:** admin pages don't load `contact-form.css`, so `.form-group`/`.form-control`/`select.form-control` are duplicated in `admin.css` scoped to `.admin-page`. Gallery cards use `__img-wrap` / `__controls` / `.btn--delete` (the older `__meta` / `__actions` CSS is unused).
- All admin pages check session on load; redirect to login if none
- `admin.js` detects current page by checking for key element IDs
- **Menus manager** (`/admin/menus.html`): groups items by `course_name`; supports add/remove items per course, add/remove courses, and a "Seed default menus" button for first-time setup. **Save (rewritten 2026-11-06):** replaces exactly the rows that were loaded (`loadedMenuRows`): (1) delete them by id with `.select('id')` and abort unless *all* were deleted (an RLS-blocked delete returns 0 rows, not an error — the old code then inserted anyway and duplicated every dish on the live Catering page); (2) insert the new rows; (3) if the insert fails, re-insert the old rows so the menu is never left empty. A course with dishes but no name blocks the save with a message (used to be dropped silently). Emptying a whole menu now works.
- **Gallery manager (hardened 2026-11-06):** description/category edits only write when the value changed, verify with `.select('id')`, and confirm "Saved". Delete removes the DB row first and checks it really went **before** removing the storage file (the old order could leave a row pointing at a deleted file = broken image on the live gallery). New uploads get `sort_order` *below* the current minimum (`sort_order` is bigint) so they appear **first** on the Gallery page in the order chosen; a failed DB insert removes the just-uploaded file.
- **RLS rule of thumb for all admin writes:** chain `.select('id')` onto every `update()`/`delete()` and treat an empty result as failure. Required policies for `authenticated`: `enquiries` select/update/delete, `gallery_images` insert/update/delete, `catering_menus` insert/delete (+ `storage.objects` insert/delete/update/select on the `gallery` bucket).
- **Enquiries viewer** (`/admin/enquiries.html`): reads from the `enquiries` Supabase table (populated server-side by `netlify/functions/submission-created.js` on every verified submission). Lists submissions as tap-to-expand cards (name, submitted date, event type badge, event date in header; all form fields in the body). Enquiries is the first nav item in the sidebar (most frequent use).
  - **Archive / Delete (added 2026-07-23):** every card has an "Archive" (or "Restore", if already archived) and a "Delete" button in the header — both use `e.stopPropagation()` so they don't also trigger the card's expand/collapse. "Active" / "Archived" filter tabs sit above the list, each showing a live count; default view is Active. All rows are fetched once into a module-level `allEnquiries` array and filtered/re-rendered client-side on tab switch (no re-fetch), so archiving/deleting updates that in-memory array rather than re-querying Supabase. Delete is permanent (`confirm()` before calling) — there's no undo. Requires an `archived boolean not null default false` column on `public.enquiries` (added via SQL Editor, not a code migration).
  - **RLS gotcha — deletes that "come back" (fixed 2026-11-06):** a Supabase `update()`/`delete()` that row-level security doesn't permit returns **no error and 0 rows**, so the old code removed the card locally and it reappeared on the next load. Both calls now chain `.select('id')` and treat an empty result as a failure (error alert, card stays). Requires these on `public.enquiries` (run 2026-11-06): `GRANT UPDATE, DELETE … TO authenticated` + policies `Authenticated update enquiries` (FOR UPDATE, using/with check true) and `Authenticated delete enquiries` (FOR DELETE, using true). Safe only because public sign-ups are disabled.
  - **Display (audited 2026-11-06):** stored codes are shown as labels via `ENQUIRY_LABELS` (keep in sync with `contact.html` options, like the email function's `LABELS`); event date shown as "Sat 12 Jun 2027"; email/phone are `mailto:`/`tel:` links; cards use one delegated click/keydown listener on `#enquiries-list`, headers are `role="button"` + `aria-expanded` (Enter/Space toggle), expanded cards stay open across re-renders (`openEnquiryIds`); the list quietly re-fetches when the tab becomes visible again after 60s+.

---

## netlify.toml
```toml
[build]
  publish = "/"

[[redirects]]
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

---

## DO NOT
- Do not use React, Vue, Next.js, Svelte, or any JS framework
- Do not use Tailwind, Bootstrap, or any CSS framework
- Do not use jQuery or any JS library except Supabase SDK (CDN)
- Do not use Node.js, Express, or any server-side runtime — **sole approved exception:** the dependency-free `netlify/functions/submission-created.js` (enquiry emails, approved by Jayden 2026-11-06)
- Do not add other email-sending code — enquiry emails go through that one function
- Do not use inline styles except for truly dynamic JS-set values
- Do not add npm, yarn, package.json, or any build step
- Do not open HTML files directly in the browser — serve via local server
