/*
 * stats-api — everything /dashboard shows, behind one password.
 *
 * POST { password | token, from, to, group, filter, compare?: { from, to } }
 *   401  the password or token was not accepted
 *   200  { token, from, to, group, live, totals, series, pages, sources, channels,
 *          campaigns, entries, countries, cities, devices, browsers, oses,
 *          enquiryTypes, clicks, heatmap, journeys, compare? }
 *
 * The password is DASHBOARD_PASSWORD, set in Netlify by Jayden and known to
 * nobody else; there is no username. A correct password gets a signed token
 * the browser keeps instead of the password. Each call returns a fresh one, so
 * a kept sign-in only lapses after 90 days without a visit. Changing the
 * password signs every device out, because it is part of the signing key.
 *
 * Wrong passwords are limited to 8 per 15 minutes per connection.
 *
 * Days that are over are read from one blob each (stats-compact.mjs folds
 * them); today, and any day not yet folded, from its single-event blobs.
 */
import { getStore } from "@netlify/blobs";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { STORE, cleanFilter, daysBetween, isDay, liveCount, summarise, ukDay } from "../lib/stats-core.mjs";

const TOKEN_DAYS = 90;
const GROUPS = new Set(["hour", "day", "week", "month"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
});

const key = (pw) => createHash("sha256").update(`sbw-dashboard-token|${pw}`).digest();
const sign = (pw, payload) => createHmac("sha256", key(pw)).update(payload).digest("base64url");

function makeToken(pw) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_DAYS * 86400000 })).toString("base64url");
  return `${payload}.${sign(pw, payload)}`;
}
function tokenOk(pw, token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const want = Buffer.from(sign(pw, payload));
  const got = Buffer.from(String(sig));
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
function passwordOk(pw, given) {
  const a = createHash("sha256").update(String(given)).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

/** Failed sign-ins per connection, in a window of 15 minutes. The key is a hash, never the IP itself. */
async function tooMany(store, ip, failed) {
  const k = `rl/${createHash("sha256").update(`rl|${ip}`).digest("hex").slice(0, 24)}`;
  const now = Date.now();
  const rec = (await store.get(k, { type: "json" }).catch(() => null)) || { n: 0, since: now };
  const fresh = now - rec.since > 15 * 60000 ? { n: 0, since: now } : rec;
  if (failed) { fresh.n++; await store.setJSON(k, fresh).catch(() => {}); }
  return fresh.n >= 8;
}

/** Every event for a list of days, folded days from one blob each. */
async function loadDays(store, days, today) {
  const out = [];
  const batch = async (list, fn) => { for (let i = 0; i < list.length; i += 40) (await Promise.all(list.slice(i, i + 40).map(fn))).forEach((x) => x && out.push(...x)); };
  await batch(days, async (day) => {
    if (day < today) {
      const folded = await store.get(`d/${day}`, { type: "json" }).catch(() => null);
      if (folded) return folded;
    }
    const { blobs } = await store.list({ prefix: `e/${day}/` });
    const evs = [];
    for (let i = 0; i < blobs.length; i += 50) {
      evs.push(...(await Promise.all(blobs.slice(i, i + 50).map((b) => store.get(b.key, { type: "json" }).catch(() => null)))));
    }
    return evs.filter(Boolean);
  });
  return out;
}

function period(from, to, today) {
  if (!isDay(from) || !isDay(to)) return null;
  if (from > to) [from, to] = [to, from];
  if (to > today) to = today;
  if (from > to) from = to;
  if (daysBetween(from, to).length > 400) return null;
  return { from, to };
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return json({ error: "The dashboard password has not been set (DASHBOARD_PASSWORD)." }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  const store = getStore({ name: STORE, consistency: "strong" });

  if (body.password !== undefined) {
    if (await tooMany(store, context.ip || "", false)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 401);
    if (!passwordOk(pw, body.password)) { await tooMany(store, context.ip || "", true); return json({ error: "Not accepted." }, 401); }
  } else if (!tokenOk(pw, body.token)) {
    return json({ error: "Sign in again." }, 401);
  }

  const now = Date.now();
  const today = ukDay(now);
  const main = period(body.from, body.to, today);
  if (!main) return json({ error: "Bad dates." }, 400);
  const group = GROUPS.has(body.group) ? body.group : "day";
  const filter = cleanFilter(body.filter);
  const cmp = body.compare ? period(body.compare.from, body.compare.to, today) : null;

  const days = new Set(daysBetween(main.from, main.to));
  if (cmp) daysBetween(cmp.from, cmp.to).forEach((d) => days.add(d));
  days.add(today);
  // A visitor near midnight can have a leave event on the next day; the day
  // after `to` is not needed for that, because events belong to the day they arrived.
  const events = await loadDays(store, [...days].sort(), today);

  const a = summarise(events, { ...main, group, filter });
  const res = { token: makeToken(pw), ...main, group, live: liveCount(events.filter((e) => e.at >= now - 3600000), now), ...a };
  if (cmp) {
    const { heatmap: _h, journeys: _j, ...b } = summarise(events, { ...cmp, group, filter });
    res.compare = { ...cmp, ...b };
  }
  return json(res);
};

