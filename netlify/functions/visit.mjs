/*
 * visit — receives one beacon from js/visit.js and stores it as one event.
 *
 * Part of the visitor statistics behind /dashboard (rebuilt 2026-11-08 to match
 * the Punjabi Folk Entertainment dashboard; see netlify/lib/stats-core.mjs).
 *
 * Cookieless. The visitor's anonymous code is a hash of a random salt for the
 * UK day, their IP address and their browser's user agent, cut to 16
 * characters. The salt is deleted the day after (stats-compact.mjs), so once a
 * day is over nobody, including us, can work back from an IP address to a
 * code. The IP address and the user agent themselves are never stored, and of
 * the referrer only its host is kept. Country and town come from Netlify's own
 * lookup of the connection, not from the visitor's device.
 *
 * One blob per event, so two visits at the same moment can never overwrite
 * each other (no read-modify-write anywhere on this path).
 */
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";
import { BOT, CLICK_LABELS, STORE, classifyDevice, classifySource, normPath, ukDay } from "../lib/stats-core.mjs";

const OWN_HOSTS = ["sbwevents.co.uk", "sbweventslive.netlify.app"];
const TYPES = new Set(["view", "leave", "click", "enquiry"]);

// A soft brake on one browser flooding the store. It lives as long as this
// function instance does, so it is a brake rather than a wall.
const recent = new Map();
const LIMIT_PER_HOUR = 300;

const ok = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

async function saltFor(store, day) {
  const key = `salt/${day}`;
  const have = await store.get(key, { consistency: "strong" });
  if (have) return have;
  // First visit of the day: make one. If two arrive together only one write
  // wins (onlyIfNew), and both read back the winner.
  await store.set(key, randomBytes(32).toString("hex"), { onlyIfNew: true }).catch(() => {});
  return store.get(key, { consistency: "strong" });
}

export default async (req, context) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405 });
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return ok();

  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > 2000) return ok();
  let b;
  try { b = JSON.parse(raw); } catch { return ok(); }
  if (!b || !TYPES.has(b.t)) return ok();

  const now = Date.now();
  const day = ukDay(now);
  const store = getStore({ name: STORE, consistency: "strong" });
  const salt = await saltFor(store, day);
  if (!salt) return ok();
  const v = createHash("sha256").update(`${salt}|${context.ip || ""}|${ua}`).digest("hex").slice(0, 16);

  const hour = Math.floor(now / 3600000);
  const n = (recent.get(`${v}|${hour}`) || 0) + 1;
  recent.set(`${v}|${hour}`, n);
  if (recent.size > 5000) recent.clear();
  if (n > LIMIT_PER_HOUR) return ok();

  const id = `${now.toString(36)}-${randomBytes(4).toString("hex")}`;
  const ev = { id, t: b.t, v, at: now, p: normPath(b.p) };

  if (b.t === "view") {
    Object.assign(ev, classifySource({ ref: typeof b.r === "string" ? b.r : "", utmSource: b.us, utmMedium: b.um, utmCampaign: b.uc, ownHosts: OWN_HOSTS }));
    Object.assign(ev, classifyDevice(ua, b.w));
    ev.co = String(context.geo?.country?.name || "").slice(0, 60);
    ev.ci = String(context.geo?.city || "").slice(0, 60);
  } else if (b.t === "leave") {
    const d = Math.round(Number(b.d));
    if (!(d >= 1 && d <= 3600)) return ok();
    ev.d = d;
  } else if (b.t === "click") {
    if (!CLICK_LABELS.has(b.l)) return ok();
    ev.l = b.l;
  } else if (b.t === "enquiry") {
    ev.e = String(b.e || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  }

  await store.setJSON(`e/${day}/${id}`, ev).catch((err) => console.error("visit: could not store", err?.message));
  return ok();
};
