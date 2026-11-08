/*
 * stats-core — the arithmetic behind /dashboard (visitor statistics).
 *
 * Pure: no storage, no HTTP, no DOM, so netlify/test/stats-core.test.mjs can
 * check every number the dashboard shows. Used by:
 *   netlify/functions/visit.mjs       turns one beacon from js/visit.js into a stored event
 *   netlify/functions/stats-api.mjs   turns the stored events into the dashboard's figures
 *
 * Rebuilt on 2026-11-08 to match the dashboard first made for Punjabi Folk
 * Entertainment (punjabifolkentertainment.com/dashboard). That dashboard's page
 * and tracking script were copied from the live site; its server code was not
 * reachable, so this file is written to produce exactly the response its page
 * reads.
 *
 * A VISITOR is one anonymous code for one UK day (see visit.mjs): the same
 * person on three days is three visitors, which is what the dashboard's
 * footnote says. A visitor's source, device and location are those of their
 * first page view that day.
 *
 * Stored event (one Netlify Blob each, then folded into one blob per day):
 *   { id, t: "view"|"leave"|"click"|"enquiry", v, at (ms), p,
 *     view only:   src, ch, cmp, dev, br, os, co, ci
 *     leave only:  d (seconds the page was on screen)
 *     click only:  l (phone|email|whatsapp|instagram|facebook|youtube|tiktok)
 *     enquiry only: e (the event type picked on the contact form) }
 * Nothing in it identifies a person: no IP, no user agent, no full referrer.
 */

export const TZ = "Europe/London";
/** The Netlify Blobs store every statistics function reads and writes. */
export const STORE = "site-stats";

// ---- Dates (UK calendar) -----------------------------------------------------
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", hourCycle: "h23" });

export const ukDay = (ms) => dayFmt.format(new Date(ms));
/** { hour: "00".."23", weekday: 0 (Mon) .. 6 (Sun) } in UK time. */
export function ukParts(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { hour: p.hour, weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) };
}
export function addDays(d, n) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
export function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
/** The Monday on or before a date. */
export function mondayOf(d) {
  const wd = (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(d, -wd);
}

// ---- Cleaning what a browser sends ---------------------------------------------

/** "/about.html" and "/about" are one page; "/index.html" is "/". Keeps a "404:" prefix. */
export function normPath(raw) {
  let p = String(raw || "").slice(0, 300);
  const missing = p.startsWith("404:");
  if (missing) p = p.slice(4);
  try { p = decodeURIComponent(p); } catch { /* keep as sent */ }
  p = p.split(/[?#]/)[0].toLowerCase();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/").replace(/\.html?$/, "").replace(/\/index$/, "/");
  if (p.length > 1) p = p.replace(/\/$/, "");
  p = p.replace(/[^a-z0-9/_.\-]/g, "").slice(0, 160) || "/";
  return missing ? `404:${p}` : p;
}

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const title = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const SEARCH = [[/(^|\.)google\./, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\./, "Yahoo"], [/(^|\.)ecosia\.org$/, "Ecosia"], [/(^|\.)yandex\./, "Yandex"], [/(^|\.)baidu\.com$/, "Baidu"],
  [/(^|\.)search\.brave\.com$/, "Brave Search"], [/(^|\.)startpage\.com$/, "Startpage"]];
const SOCIAL = [[/(^|\.)instagram\.com$/, "Instagram"], [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, "Facebook"],
  [/(^|\.)tiktok\.com$/, "TikTok"], [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"], [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "LinkedIn"],
  [/(^|\.)pinterest\./, "Pinterest"], [/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "X"], [/(^|\.)snapchat\.com$/, "Snapchat"],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, "WhatsApp"], [/(^|\.)reddit\.com$/, "Reddit"], [/(^|\.)threads\.net$/, "Threads"]];
const EMAIL = [[/mail\.google\.com$|outlook\.(live|office)\.com$|mail\.yahoo\.com$|mail\.aol\.com$/, "Email"]];

/**
 * Where a visitor came from: { src, ch, cmp }. UTM tags win over the referrer,
 * because a tagged link is someone telling you where it was posted. Only the
 * referrer's host is ever looked at, never its path or query.
 */
export function classifySource({ ref, utmSource, utmMedium, utmCampaign, ownHosts = [] }) {
  const cmp = clean(utmCampaign, 80);
  const us = clean(utmSource, 60).toLowerCase();
  const um = clean(utmMedium, 40).toLowerCase();
  let host = "";
  try { host = ref ? new URL(ref).hostname.toLowerCase().replace(/^www\.|^m\.|^l\.|^lm\.|^mobile\./, "") : ""; } catch { host = ""; }
  if (host && ownHosts.some((h) => host === h || host.endsWith(`.${h}`))) host = "";

  const named = (h) => {
    for (const [re, name] of SEARCH) if (re.test(h)) return { src: name, ch: "Search" };
    for (const [re, name] of SOCIAL) if (re.test(h)) return { src: name, ch: "Social" };
    for (const [re, name] of EMAIL) if (re.test(h)) return { src: name, ch: "Email" };
    return null;
  };

  if (us) {
    const known = named(`${us}.com`) || named(us);
    const src = known ? known.src : title(us);
    const ch = /cpc|ppc|paid|ads?$|display/.test(um) ? "Paid"
      : /e-?mail|newsletter/.test(um) ? "Email"
      : /social|bio|story|post|reel/.test(um) ? "Social"
      : known ? known.ch : um ? title(um) : "Referral";
    return { src, ch, cmp };
  }
  if (!host) return { src: "Direct", ch: "Direct", cmp };
  return { ...(named(host) || { src: host, ch: "Referral" }), cmp };
}

/** Browser, system and device from the user agent and the screen width. The user agent itself is never stored. */
export function classifyDevice(ua = "", width = 0) {
  const u = String(ua);
  const br = /Instagram/.test(u) ? "Instagram app" : /FBAN|FBAV|FB_IAB/.test(u) ? "Facebook app" : /TikTok|musical_ly|BytedanceWebview/.test(u) ? "TikTok app"
    : /Edg(e|A|iOS)?\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /OPR\/|Opera/.test(u) ? "Opera"
    : /Firefox|FxiOS/.test(u) ? "Firefox" : /Chrome|CriOS/.test(u) ? "Chrome" : /Safari/.test(u) ? "Safari" : "Other";
  const os = /iPhone|iPod/.test(u) ? "iOS" : /iPad/.test(u) ? "iPadOS" : /Android/.test(u) ? "Android" : /CrOS/.test(u) ? "ChromeOS"
    : /Windows/.test(u) ? "Windows" : /Mac OS X|Macintosh/.test(u) ? "macOS" : /Linux/.test(u) ? "Linux" : "Other";
  const w = Number(width) || 0;
  const tablet = /iPad|Tablet/.test(u) || (/Android/.test(u) && !/Mobile/.test(u)) || (os === "macOS" && w && w <= 1366 && /Mobile\//.test(u));
  const dev = tablet ? "Tablet" : /Mobi|iPhone|Android/.test(u) || (w && w < 600) ? "Phone" : "Computer";
  return { dev, br, os };
}

export const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|node-fetch|axios|go-http|java\/|scrapy|phantom|selenium|puppeteer|playwright/i;

export const CLICK_LABELS = new Set(["phone", "email", "whatsapp", "instagram", "facebook", "youtube", "tiktok"]);
const CONTACT = new Set(["phone", "email", "whatsapp"]);

// ---- From stored events to the dashboard ----------------------------------------

/**
 * One record per visitor-day, built from that day's events in time order.
 * Events with no page view (a "leave" that arrived after midnight under a new
 * code) belong to nobody and are dropped.
 */
export function buildVisits(events) {
  const byKey = new Map();
  for (const ev of [...events].sort((a, b) => a.at - b.at)) {
    if (!ev || !ev.v) continue;
    const key = `${ukDay(ev.at)}|${ev.v}`;
    let vis = byKey.get(key);
    if (!vis) {
      if (ev.t !== "view") continue;
      vis = { key, day: ukDay(ev.at), first: ev, views: [], time: 0, timeByPage: {}, enquiries: [], clicks: [],
        src: ev.src || "Direct", ch: ev.ch || "Direct", cmp: ev.cmp || "", dev: ev.dev || "Computer", br: ev.br || "Other",
        os: ev.os || "Other", co: ev.co || "", ci: ev.ci || "" };
      byKey.set(key, vis);
    }
    if (ev.t === "view") vis.views.push(ev);
    else if (ev.t === "leave") {
      const d = Math.max(0, Math.min(Number(ev.d) || 0, 3600));
      vis.time += d;
      vis.timeByPage[ev.p] = (vis.timeByPage[ev.p] || 0) + d;
    } else if (ev.t === "enquiry") vis.enquiries.push(ev);
    else if (ev.t === "click") vis.clicks.push(ev);
  }
  return [...byKey.values()];
}

/** The dashboard's filter chips: every one given must match. */
export function matches(vis, filter = {}) {
  if (filter.page && !vis.views.some((x) => x.p === filter.page)) return false;
  if (filter.source && vis.src !== filter.source) return false;
  if (filter.channel && vis.ch !== filter.channel) return false;
  if (filter.device && vis.dev !== filter.device) return false;
  if (filter.country && (vis.co || "Unknown") !== filter.country) return false;
  if (filter.city && (vis.ci || "Unknown") !== filter.city) return false;
  return true;
}

const ratio = (a, b) => (b ? a / b : 0);
const byCount = (a, b) => b.visitors - a.visitors || (b.views || 0) - (a.views || 0) || String(a.key).localeCompare(String(b.key));

/** A breakdown table: one row per value of `keyOf`, the columns the dashboard's tables read. */
function breakdown(visits, keyOf) {
  const rows = new Map();
  for (const vis of visits) {
    const key = keyOf(vis);
    if (key == null || key === "") continue;
    const r = rows.get(key) || { key, visitors: 0, bounces: 0, converted: 0 };
    r.visitors++;
    if (vis.views.length === 1) r.bounces++;
    if (vis.enquiries.length) r.converted++;
    rows.set(key, r);
  }
  return [...rows.values()].sort(byCount);
}

function counts(list) {
  const m = new Map();
  for (const k of list) m.set(k, (m.get(k) || 0) + 1);
  return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

/** The chart's buckets for a period, every one present even when empty. */
export function bucketKeys(from, to, group) {
  if (group === "hour") return Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  if (group === "week") {
    const out = [];
    for (let d = mondayOf(from); d <= to; d = addDays(d, 7)) out.push(d);
    return out;
  }
  if (group === "month") {
    const out = [];
    for (let m = from.slice(0, 7); m <= to.slice(0, 7);) {
      out.push(m);
      const [y, mo] = m.split("-").map(Number);
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
    return out;
  }
  return daysBetween(from, to);
}
function bucketOf(ms, group) {
  if (group === "hour") return ukParts(ms).hour;
  const d = ukDay(ms);
  return group === "week" ? mondayOf(d) : group === "month" ? d.slice(0, 7) : d;
}

/**
 * Everything the dashboard draws for one period. `events` may include days
 * outside from..to; they are ignored. Journeys and the heatmap are the
 * caller's to keep or drop (the comparison period shows neither).
 */
export function summarise(events, { from, to, group = "day", filter = {} }) {
  const all = buildVisits(events).filter((v) => v.day >= from && v.day <= to);
  const visits = all.filter((v) => matches(v, filter));

  const views = visits.reduce((n, v) => n + v.views.length, 0);
  const time = visits.reduce((n, v) => n + v.time, 0);
  const bounced = visits.filter((v) => v.views.length === 1).length;
  const enquiries = visits.reduce((n, v) => n + v.enquiries.length, 0);
  const converted = visits.filter((v) => v.enquiries.length).length;
  const contacted = visits.filter((v) => v.enquiries.length || v.clicks.some((c) => CONTACT.has(c.l))).length;
  const contactClicks = visits.reduce((n, v) => n + v.clicks.filter((c) => CONTACT.has(c.l)).length, 0);
  const totals = {
    visitors: visits.length, views,
    pagesPerVisitor: ratio(views, visits.length),
    avgTime: ratio(time, visits.length),
    bounceRate: ratio(bounced, visits.length),
    enquiries, converted, conversionRate: ratio(converted, visits.length),
    contacted, contactRate: ratio(contacted, visits.length),
    contactClicks,
  };

  // The chart: a visitor is counted in the bucket of their first page view,
  // page views and enquiries in the bucket they happened in.
  const series = new Map(bucketKeys(from, to, group).map((key) => [key, { key, visitors: 0, views: 0, enquiries: 0, converted: 0 }]));
  for (const v of visits) {
    const b = series.get(bucketOf(v.first.at, group));
    if (b) { b.visitors++; if (v.enquiries.length) b.converted++; }
    for (const x of v.views) { const s = series.get(bucketOf(x.at, group)); if (s) s.views++; }
    for (const x of v.enquiries) { const s = series.get(bucketOf(x.at, group)); if (s) s.enquiries++; }
  }

  const pages = new Map();
  for (const v of visits) {
    const seen = new Set();
    for (const x of v.views) {
      const r = pages.get(x.p) || { key: x.p, views: 0, visitors: 0, time: 0, avgTime: 0, entries: 0, bounces: 0, converted: 0 };
      r.views++;
      if (!seen.has(x.p)) {
        seen.add(x.p);
        r.visitors++;
        r.time += v.timeByPage[x.p] || 0;
        if (v.enquiries.length) r.converted++;
      }
      pages.set(x.p, r);
    }
    const entry = pages.get(v.first.p);
    if (entry) { entry.entries++; if (v.views.length === 1) entry.bounces++; }
  }
  for (const r of pages.values()) r.avgTime = ratio(r.time, r.visitors);

  return {
    totals,
    series: [...series.values()],
    pages: [...pages.values()].sort((a, b) => b.views - a.views || b.visitors - a.visitors || a.key.localeCompare(b.key)),
    sources: breakdown(visits, (v) => v.src),
    channels: breakdown(visits, (v) => v.ch),
    campaigns: breakdown(visits, (v) => v.cmp),
    entries: breakdown(visits, (v) => v.first.p),
    countries: breakdown(visits, (v) => v.co || "Unknown"),
    cities: breakdown(visits, (v) => v.ci || "Unknown"),
    devices: breakdown(visits, (v) => v.dev),
    browsers: breakdown(visits, (v) => v.br),
    oses: breakdown(visits, (v) => v.os),
    enquiryTypes: counts(visits.flatMap((v) => v.enquiries.map((e) => e.e || ""))),
    clicks: counts(visits.flatMap((v) => v.clicks.map((c) => c.l))),
    heatmap: heatmap(visits),
    journeys: journeys(visits),
  };
}

/** Visitors by weekday (Monday first) and UK hour, by their first page view. */
export function heatmap(visits) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const v of visits) {
    const { weekday, hour } = ukParts(v.first.at);
    if (weekday >= 0) grid[weekday][Number(hour)]++;
  }
  return grid;
}

/** The newest visits that ended in an enquiry: the pages seen before it, in order. No contact details. */
export function journeys(visits, limit = 20) {
  return visits.filter((v) => v.enquiries.length)
    .map((v) => {
      const at = v.enquiries[0].at;
      const path = [];
      for (const x of v.views) if (x.at <= at && path[path.length - 1] !== x.p) path.push(x.p);
      return {
        at: new Date(at).toISOString(), path,
        src: v.src, dev: v.dev,
        place: [v.ci, v.co].filter(Boolean).join(", "),
        types: [...new Set(v.enquiries.map((e) => e.e).filter(Boolean))],
        views: v.views.length, time: v.time,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Visitors seen in the last 30 minutes, for the green dot beside the title. */
export function liveCount(events, now) {
  const since = now - 30 * 60 * 1000;
  return new Set(events.filter((e) => e.at >= since && e.at <= now + 60000).map((e) => e.v)).size;
}

/** The request's filter, kept to the six keys the dashboard can set and to short strings. */
export function cleanFilter(f) {
  const out = {};
  if (!f || typeof f !== "object") return out;
  for (const k of ["page", "source", "channel", "device", "country", "city"]) {
    if (typeof f[k] === "string" && f[k]) out[k] = f[k].slice(0, 160);
  }
  return out;
}
