# CLAUDE.md — SBW Events Website

## Project Overview
SBW Events website for sbwevents.co.uk. Family-run weddings and events business based in Scotland. The site is fully built and in revision/maintenance phase.

**Tone/identity note:** SBW Events is open to all occasions and cultures — not exclusively Asian weddings. South Asian expertise is mentioned sparingly (once in the About "Cultural Expertise" value card and implicitly through the business name "Shadi Biyah Wale"). Do NOT lead with "Asian weddings" in headlines or descriptions.

**Enquiries email:** SBWevents@outlook.com  
**Display emails:** SBWevents@outlook.com + shadibiyahwale@outlook.com  
**Phone:** +44 7831 322188  
**Instagram:** @shadibiyahwale  
**Built by:** Mistuzzo Marketing (Jayden Mistry)

### Pending client message — Asian identity direction
> Hey! Just a heads up on a change we made — the site previously mentioned Asian weddings quite heavily throughout, but we felt it was making things seem too niche and could put off potential clients from other backgrounds. We've broadened the language across the site so it now reads as weddings and events for everyone, while still keeping a nod to South Asian expertise in the About section.
>
> When you have a look at the demo, let us know — are you happy with that direction, or would you prefer we lean back into the Asian weddings angle more?

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
- **Netlify plan: Pro** — Functions are available if ever needed (not currently used; `/netlify/functions/reviews.js` was removed when switching to Elfsight)

## Local Development
**Files use root-relative paths — they MUST be served from a local server, not opened directly.**

**VS Code Live Server** or `python -m http.server 8080` → http://localhost:8080

### Environment Variables
No environment variables required — the Elfsight widget is a client-side CDN embed with no API key.

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
  sitemap.xml             — SEO sitemap (all 15 public pages; update when adding/removing pages)
  robots.txt             — Allows all, disallows /admin/, points to sitemap.xml
  netlify.toml            — Netlify build/redirect/header config
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
    contact-form.js       — Conditional show/hide logic; Netlify fetch submit; URL param pre-fill
    gallery.js            — Supabase fetch, lightbox (prev/next/Esc/overlay) — no filter logic
    admin.js              — Supabase Auth, gallery CRUD, menu editor, text editor, enquiries viewer
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

---

## Before Go-Live Checklist
1. ~~**supabase-config.js**~~ — Done. Credentials filled in.
2. ~~**Supabase tables**~~ — Done. `gallery_images`, `catering_menus`, `editable_texts` created; storage bucket `gallery` created; RLS set up; admin user at SBWevents@outlook.com created.
   - **`enquiries` table** — RLS + anon INSERT + authenticated SELECT policies, `GRANT INSERT ON public.enquiries TO anon` and `GRANT SELECT ON public.enquiries TO authenticated`. **Long-standing 403/RLS issue (flagged since original build) fixed 2026-07-23** — `SELECT count(*) FROM public.enquiries` showed 0 real rows had ever saved. Root cause was never actually a missing/broken INSERT policy (the original `enquiries_insert` policy was fine); **it only ever looked broken when a request also asked Postgres to return the inserted row** (`Prefer: return=representation`, or supabase-js `.insert().select()`) — that makes Postgres additionally enforce a SELECT policy on the new row, and `anon` was only ever granted INSERT, not SELECT, so the RETURNING clause failed with the exact same generic RLS error text, masking the fact that a plain `.insert()` (no `.select()`) — which is what `contact-form.js` actually calls — was fine all along. **Do not add `.select()` to the anon-facing insert in `contact-form.js`** — it would immediately reintroduce this failure. A duplicate pair of policies (`Allow anon insert` / `Allow authenticated select`) was added on top of the pre-existing `enquiries_insert` / `enquiries_select` during this debugging session; they're redundant but harmless (multiple permissive policies are OR'd) and were left in place rather than risk breaking anything by removing them.
   - **Residual per-visitor gap (not a code bug, confirmed 2026-07-23):** some browsers with ad blockers / tracking-prevention (e.g. the client's own daily-driver browser) silently block the client-side `fetch` from the live production domain straight to `*.supabase.co`, so that specific visitor's enquiry never mirrors into `enquiries`/the admin dashboard — reproduced live: same code + same Supabase project succeeded from a plain `curl` and from `localhost`, but failed every time from the live HTTPS domain in that one browser, and succeeded again from a different browser on the same machine. This can't be fixed from the codebase (it's the visitor's own client blocking a cross-origin fetch). **The Netlify Forms email notification is unaffected** (same-origin POST to `/`, not blocked by the same tooling) and remains the reliable channel for every enquiry — the admin dashboard should be treated as a convenience mirror, not the sole source of truth, until/unless this is moved server-side.
3. **Netlify** — Connect repo; set form notification for form `enquiry` → SBWevents@outlook.com
4. **Google Reviews** — Paste the Elfsight widget `<script>` tag into the `<!-- PASTE ELFSIGHT GOOGLE REVIEWS SCRIPT HERE -->` comment in `index.html`. Then add any CSS overrides to `css/cards.css` under the Elfsight section to match brand styles.
5. **Replace stock images** — Client uploads real photos via admin CMS (`/admin/gallery.html`)
6. **About page content** — Client supplies real team story and portrait photo
7. **About stats** — Currently shows 100+ Events Delivered, 5★ Google Rating, 52.8K Instagram Followers (3 stats, 3-col layout at 1024px+)

---

## Netlify Forms — Required on Every Form
Every `<form>` element must include:
- `data-netlify="true"`
- `name="[form-name]"` (e.g. `name="enquiry"`)
- `<input type="hidden" name="form-name" value="[form-name]">`
- Zero email code — Netlify handles all routing

Contact form: `name="enquiry"`, forwards to SBWevents@outlook.com (set in Netlify dashboard).

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

### SEO (sitemap, robots, structured data, social meta)
- **`sitemap.xml`** lists all 15 public pages (excludes `/admin/`). **When you add or remove a page, update the sitemap.**
- **`robots.txt`** allows everything except `/admin/` and references the sitemap.
- **Structured data (JSON-LD)**: every public page carries a `LocalBusiness` block (name, `areaServed` = Scotland, phone, email, logo, social `sameAs`). Each `/blog/*` article additionally carries a `BlogPosting` block (headline, description, hero image, `datePublished`/`dateModified`, publisher). Admin pages have none.
- **Social meta**: every public page has `og:image`, `og:url`, `twitter:card` (summary) and `twitter:image`. **The image is the logo (`/logo.png`)** per client request. Note: a transparent-background logo can render with a plain/box background on some social platforms — if richer social previews are wanted later, swap to a dedicated 1200×630 banner and switch `twitter:card` to `summary_large_image`.
- These were applied in bulk via a Node script (UTF-8 safe). New pages do NOT get them automatically — add the tags + JSON-LD when creating a page, or re-run the injection logic.

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
- **Netlify form email body cannot be customised** — regardless of plan tier, Netlify's form notification emails have a fixed plain-text body. Only the subject line and recipient can be configured in the dashboard. To get HTML-designed emails in future, the path is: Netlify Function triggered by form submission → Outlook SMTP (`smtp.office365.com`, `SBWevents@outlook.com`) → custom HTML template.
- **Décor/Catering is a single checkbox + dropdown** (`#cb-decor-catering` → reveals `#decor-catering-package-section` with a "Food & Décor" / "Décor Only" select, `name="decor_catering_package"`) — added 2026-07-23 because catering is never sold as a stand-alone service. Event Planning and Event Management remain separate checkboxes. The dropdown value drives which of `#decor-section` / `#catering-section` show, mirroring the old separate-checkbox behaviour.
- **General fields added 2026-07-23**: `venue_location` (free text, always visible, next to Event Type), `number_of_events` (select 1/2/3/4+, for people enquiring about multiple functions), `menu_preference` (optional Menu 1/Menu 2 select inside the catering sub-section, distinct from the existing Buffet/Table Service `menu_type` radio), `budget` (free text, placed near the end of the form before Additional Notes).
- **Supabase `enquiries` table**: the columns above (`venue_location`, `number_of_events`, `menu_preference`, `budget`, `service_decor_catering`, `decor_catering_package`) are written by `contact-form.js` but have not yet been added to the Supabase table — add them (or the Supabase insert will just log a console warning; Netlify Forms submission is unaffected since it doesn't depend on the DB schema).

### Gallery (gallery.html only)
- Static fallback images in HTML; Supabase replaces on load if configured
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
- Login at `/admin/index.html` → `supabaseClient.auth.signInWithPassword()`
- All admin pages check session on load; redirect to login if none
- `admin.js` detects current page by checking for key element IDs
- **Menus manager** (`/admin/menus.html`): groups items by `course_name`; supports add/remove items per course, add/remove courses, and a "Seed default menus" button for first-time setup. Save uses delete+reinsert for the full type+number combo.
- **Enquiries viewer** (`/admin/enquiries.html`): reads from the `enquiries` Supabase table (populated by `contact-form.js` on every submission). Lists submissions as tap-to-expand cards (name, submitted date, event type badge, event date in header; all form fields in the body). Enquiries is the first nav item in the sidebar (most frequent use).

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
- Do not use Node.js, Express, or any server-side runtime
- Do not write any email sending code — Netlify Forms handles this
- Do not use inline styles except for truly dynamic JS-set values
- Do not add npm, yarn, package.json, or any build step
- Do not open HTML files directly in the browser — serve via local server
