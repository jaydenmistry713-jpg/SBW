/*
 * stats-compact — runs every night at 03:15 UTC.
 *
 * Folds each finished day's single-event blobs into one blob (`d/<day>`), so
 * the dashboard reads one blob per day rather than hundreds, and deletes the
 * single ones after. If a run dies half way, the next run merges what it finds
 * by event id, so nothing is counted twice and nothing is lost.
 *
 * It also deletes every day's salt once the day is over (visit.mjs). That is
 * what makes a past day's visitor codes impossible to tie back to an IP address.
 */
import { getStore } from "@netlify/blobs";
import { STORE, ukDay } from "../lib/stats-core.mjs";

export default async () => {
  const store = getStore({ name: STORE, consistency: "strong" });
  const today = ukDay(Date.now());

  const { blobs: salts } = await store.list({ prefix: "salt/" });
  for (const s of salts) if (s.key.slice(5) < today) await store.delete(s.key);

  const { directories } = await store.list({ prefix: "e/", directories: true });
  for (const dir of directories) {
    const day = dir.replace(/^e\//, "").replace(/\/$/, "");
    if (!(day < today)) continue;
    const { blobs } = await store.list({ prefix: `e/${day}/` });
    if (!blobs.length) continue;

    const byId = new Map(((await store.get(`d/${day}`, { type: "json" })) || []).map((e) => [e.id, e]));
    for (let i = 0; i < blobs.length; i += 50) {
      const evs = await Promise.all(blobs.slice(i, i + 50).map((b) => store.get(b.key, { type: "json" }).catch(() => null)));
      for (const e of evs) if (e) byId.set(e.id, e);
    }
    await store.setJSON(`d/${day}`, [...byId.values()].sort((a, b) => a.at - b.at));
    for (let i = 0; i < blobs.length; i += 50) await Promise.all(blobs.slice(i, i + 50).map((b) => store.delete(b.key)));
    console.log(`stats-compact: ${day} folded, ${blobs.length} new events, ${byId.size} in all`);
  }
};

export const config = { schedule: "15 3 * * *" };
