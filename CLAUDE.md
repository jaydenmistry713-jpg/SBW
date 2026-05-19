# CLAUDE.md — SBW Events Website

## Project Overview
SBW Events website for sbwevents.co.uk. Family-run Asian wedding and events business based in Scotland. The site is fully built and in revision/maintenance phase.

**Enquiries email:** SBWevents@outlook.com  
**Display emails:** SBWevents@outlook.com + shadibiyahwale@outlook.com  
**Phone:** +44 7831 322188  
**Instagram:** @shadibiyahwale  
**Built by:** Mistuzzo Marketing (Jayden Mistry)

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
- No Netlify Functions — the `/netlify/functions/reviews.js` proxy was removed when switching to Elfsight

## Local Development
**Files use root-relative paths — they MUST be served from a local server, not opened directly.**

**VS Code Live Server** or `python -m http.server 8080` → http://localhost:8080

### Environment Variables
No environment variables required — the Elfsight widget is a client-side CDN embed with no API key.

---

## File Structure (complete build)
```
/
  index.html              — Homepage (hero slider, services, reviews, CTA)
  about.html              — About page (story, values, stats)
  services.html           — Services overview (4 cards)
  gallery.html            — Gallery (Supabase fetch, lightbox — no filters)
  contact.html            — Contact/enquiry form (Netlify Forms)
  netlify.toml            — Netlify build/redirect/header config
  /services/
    event-planning.html
    event-management.html
    bespoke-decor.html
    catering.html         — Menu selector (Buffet/Table Service, Menu 1/2)
  /admin/
    index.html            — Supabase Auth login
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
    admin.css             — Admin dashboard, login, gallery/menu/text managers
  /js/
    main.js               — Global: sticky header, mobile menu, dropdown, active link
    hero-slider.js        — 5-slide auto-cycling hero with dots, swipe, pause on hover
    menu-selector.js      — Tab + sidebar + panel logic; Supabase CMS fetch with static fallback
    contact-form.js       — Conditional show/hide logic; Netlify fetch submit; URL param pre-fill
    gallery.js            — Supabase fetch, lightbox (prev/next/Esc/overlay) — no filter logic
    admin.js              — Supabase Auth, gallery CRUD, menu editor, text editor
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
- File: `/logo.jpg` — circular logo, "SBW" decorative green script, gold diamond frame, blush floral wreath
- Used in nav as `<img src="/logo.jpg" class="nav-logo__img">` (height: 54px)
- Footer still uses text logo (white text on dark bg — image wouldn't work)

## Images
- Real client photos in `/images/` folder (48 JPEG files, names contain spaces)
- URL-encode spaces in `src` attributes: space → `%20`, e.g. `/images/IMG_6084%20Sumayyah.jpeg`
- Key image assignments documented in memory file

---

## Before Go-Live Checklist
1. ~~**supabase-config.js**~~ — Done. Credentials filled in.
2. ~~**Supabase tables**~~ — Done. `gallery_images`, `catering_menus`, `editable_texts` created; storage bucket `gallery` created; RLS set up; admin user at SBWevents@outlook.com created.
3. **Netlify** — Connect repo; set form notification for form `enquiry` → SBWevents@outlook.com
4. **Google Reviews** — Paste the Elfsight widget `<script>` tag into the `<!-- PASTE ELFSIGHT GOOGLE REVIEWS SCRIPT HERE -->` comment in `index.html`. Then add any CSS overrides to `css/cards.css` under the Elfsight section to match brand styles.
5. **Replace stock images** — Client uploads real photos via admin CMS (`/admin/gallery.html`)
6. **About page content** — Client supplies real team story and portrait photo

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
- Mobile drawer: white background — links override back to `var(--color-dark)` in `@media (max-width: 767px)`.
- Hamburger bars: white (`rgba(255,255,255,0.9)`) — readable against both transparent hero and dark scrolled state.
- Mobile: `.nav-toggle` toggles `.is-open` on `#nav-links`; body overflow hidden while open
- Dropdown: uses `visibility: hidden/visible` + `opacity` (NOT `display:none/block`) — this allows CSS transitions and prevents gap-hover bug. Mobile overrides to `display:none/block` for JS accordion.
- Active link: `main.js` matches `window.location.pathname` and adds `.active` to matching `<li>`
- Logo: `<img src="/logo.jpg" class="nav-logo__img">` — 54px tall image
- **Page-hero on sub-pages**: `margin-top` removed, `padding-top: var(--header-height)` added instead — dark green bg extends behind fixed nav so transparent nav has a dark background on all pages.

### Hero Slider (index.html only)
- 5 slides, 5s interval, CSS opacity fade
- `hero-slider.js`: dots, touch swipe, pause on hover
- Dots: `.hero__dot` with `.is-active`, counter in `.hero__counter`

### Menu Selector (catering.html only)
- Tabs: `[data-tab]` → `#tab-buffet` / `#tab-table`
- Sidebar: `[data-panel]` → panel IDs
- Static HTML fallback — Supabase fetches `course_name` + `item_text` rows and updates the DOM in place
- `menu-selector.js` guards with `if (!window.supabaseClient)` before fetching

### Contact Form (contact.html only)
- Netlify AJAX submit via `fetch('/')` with URL-encoded body
- Thank-you div `#form-thankyou` shown on success; form hidden
- URL params: `?service=event-planning|event-management|bespoke-decor|catering` pre-fills form

### Gallery (gallery.html only)
- Static fallback images in HTML; Supabase replaces on load if configured
- No filter buttons — all images shown, visual-first layout
- Grid: editorial CSS Grid with `nth-child` column spans for varied shapes (no row spans — avoids dense-flow complexity). Pattern: mobile 2-col every-3rd full-width; 640px 3-col every-2nd spans 2; 1024px 4-col every-3rd spans 2. Row heights set via `grid-auto-rows` per breakpoint.
- Lightbox: `#lightbox` with prev/next/close/Escape/overlay-click

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
