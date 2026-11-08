// The dashboard's arithmetic — run: node netlify/test/stats-core.test.mjs
import { strict as assert } from "node:assert";
import {
  normPath, classifySource, classifyDevice, buildVisits, summarise, bucketKeys, liveCount, cleanFilter, isDay, mondayOf, BOT,
} from "../lib/stats-core.mjs";

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };
console.log("stats-core");

// Sunday 8 November 2026 (GMT, so UK time = UTC).
const T = (hhmm, day = "2026-11-08") => Date.parse(`${day}T${hhmm}:00Z`);
let n = 0;
const view = (v, at, p, extra = {}) => ({ id: `e${n++}`, t: "view", v, at, p, src: "Direct", ch: "Direct", cmp: "", dev: "Phone", br: "Safari", os: "iOS", co: "United Kingdom", ci: "Glasgow", ...extra });
const leave = (v, at, p, d) => ({ id: `e${n++}`, t: "leave", v, at, p, d });
const enquiry = (v, at, p, e) => ({ id: `e${n++}`, t: "enquiry", v, at, p, e });
const click = (v, at, p, l) => ({ id: `e${n++}`, t: "click", v, at, p, l });

ok("paths: .html, /index and trailing slashes are one page; a 404 keeps its marker", () => {
  assert.equal(normPath("/about.html"), "/about");
  assert.equal(normPath("/about/"), "/about");
  assert.equal(normPath("/index.html"), "/");
  assert.equal(normPath("/services/Catering.html?x=1#top"), "/services/catering");
  assert.equal(normPath("404:/old-page.html"), "404:/old-page");
  assert.equal(normPath(""), "/");
  assert.equal(normPath("/<script>"), "/script");
});

ok("sources: search, social, own site, unknown site, and UTM tags win", () => {
  const own = ["sbwevents.co.uk"];
  assert.deepEqual(classifySource({ ref: "https://www.google.co.uk/", ownHosts: own }), { src: "Google", ch: "Search", cmp: "" });
  assert.deepEqual(classifySource({ ref: "https://l.instagram.com/?u=x", ownHosts: own }), { src: "Instagram", ch: "Social", cmp: "" });
  assert.deepEqual(classifySource({ ref: "https://lm.facebook.com/l.php", ownHosts: own }), { src: "Facebook", ch: "Social", cmp: "" });
  assert.deepEqual(classifySource({ ref: "https://sbwevents.co.uk/about.html", ownHosts: own }), { src: "Direct", ch: "Direct", cmp: "" });
  assert.deepEqual(classifySource({ ref: "", ownHosts: own }), { src: "Direct", ch: "Direct", cmp: "" });
  assert.deepEqual(classifySource({ ref: "https://www.weddingsite.co.uk/listing/123", ownHosts: own }), { src: "weddingsite.co.uk", ch: "Referral", cmp: "" });
  assert.deepEqual(classifySource({ ref: "https://www.google.com/", utmSource: "instagram", utmMedium: "bio", utmCampaign: "bio-link" }), { src: "Instagram", ch: "Social", cmp: "bio-link" });
  assert.equal(classifySource({ utmSource: "google", utmMedium: "cpc" }).ch, "Paid");
});

ok("devices: phones, iPads, Android tablets, computers and in-app browsers", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  assert.deepEqual(classifyDevice(iphone, 390), { dev: "Phone", br: "Safari", os: "iOS" });
  assert.equal(classifyDevice(`${iphone} Instagram 300.0`, 390).br, "Instagram app");
  assert.equal(classifyDevice("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/120 Safari/537.36", 1200).dev, "Tablet");
  assert.deepEqual(classifyDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Edg/120", 1920), { dev: "Computer", br: "Edge", os: "Windows" });
  assert.ok(BOT.test("Mozilla/5.0 (compatible; Googlebot/2.1)"));
  assert.ok(!BOT.test(iphone));
});

// Three visitors on 8 Nov: A lands on Home from Google, reads two pages and
// enquires; B bounces from Instagram; C views one page, taps the phone number.
const day1 = [
  view("A", T("10:00"), "/", { src: "Google", ch: "Search", dev: "Computer", br: "Chrome", os: "Windows", ci: "Edinburgh" }),
  leave("A", T("10:01"), "/", 60),
  view("A", T("10:01"), "/services"),
  leave("A", T("10:03"), "/services", 120),
  view("A", T("10:03"), "/contact"),
  enquiry("A", T("10:05"), "/contact", "Wedding & Walimah"),
  leave("A", T("10:06"), "/contact", 180),
  view("B", T("21:30"), "/gallery", { src: "Instagram", ch: "Social" }),
  leave("B", T("21:30"), "/gallery", 15),
  view("C", T("12:00"), "/contact"),
  click("C", T("12:01"), "/contact", "phone"),
  click("C", T("12:01"), "/contact", "instagram"),
  leave("A", T("10:00", "2026-11-09"), "/contact", 30), // a leave with no view that day: nobody's
];

ok("visits: one per visitor per day, attributes from the first view, orphan events dropped", () => {
  const vs = buildVisits(day1);
  assert.equal(vs.length, 3);
  const a = vs.find((v) => v.first.v === "A");
  assert.equal(a.views.length, 3);
  assert.equal(a.time, 360);
  assert.equal(a.src, "Google");
  assert.equal(a.ci, "Edinburgh");
});

ok("totals: visitors, views, time, bounce, enquiries and contact taps", () => {
  const t = summarise(day1, { from: "2026-11-08", to: "2026-11-08", group: "hour" }).totals;
  assert.equal(t.visitors, 3);
  assert.equal(t.views, 5);
  assert.equal(t.pagesPerVisitor, 5 / 3);
  assert.equal(t.avgTime, 375 / 3);
  assert.equal(t.bounceRate, 2 / 3);
  assert.equal(t.enquiries, 1);
  assert.equal(t.converted, 1);
  assert.equal(t.conversionRate, 1 / 3);
  assert.equal(t.contacted, 2);
  assert.equal(t.contactClicks, 1); // the Instagram tap is not a contact tap
});

ok("pages, landing pages, sources, places, devices, enquiry types and taps", () => {
  const s = summarise(day1, { from: "2026-11-08", to: "2026-11-08", group: "day" });
  const contact = s.pages.find((p) => p.key === "/contact");
  assert.deepEqual(contact, { key: "/contact", views: 2, visitors: 2, time: 180, avgTime: 90, entries: 1, bounces: 1, converted: 1 });
  assert.deepEqual(s.entries.map((r) => r.key).sort(), ["/", "/contact", "/gallery"]);
  assert.deepEqual(s.sources.find((r) => r.key === "Google"), { key: "Google", visitors: 1, bounces: 0, converted: 1 });
  assert.deepEqual(s.cities.map((r) => r.key), ["Glasgow", "Edinburgh"]);
  assert.equal(s.devices.find((r) => r.key === "Phone").visitors, 2);
  assert.deepEqual(s.enquiryTypes, [{ key: "Wedding & Walimah", count: 1 }]);
  assert.deepEqual(s.clicks, [{ key: "instagram", count: 1 }, { key: "phone", count: 1 }]);
  assert.equal(s.campaigns.length, 0);
});

ok("the chart has a bucket for every hour, day, week or month, empty ones included", () => {
  const s = summarise(day1, { from: "2026-11-08", to: "2026-11-08", group: "hour" });
  assert.equal(s.series.length, 24);
  assert.deepEqual(s.series.find((b) => b.key === "10"), { key: "10", visitors: 1, views: 3, enquiries: 1, converted: 1 });
  assert.equal(bucketKeys("2026-11-01", "2026-11-30", "day").length, 30);
  assert.deepEqual(bucketKeys("2026-11-04", "2026-11-18", "week"), ["2026-11-02", "2026-11-09", "2026-11-16"]);
  assert.deepEqual(bucketKeys("2026-11-15", "2027-01-02", "month"), ["2026-11", "2026-12", "2027-01"]);
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
});

ok("UK time is used across the clocks changing: 23:30 UTC in June is the next day", () => {
  const ev = [view("D", Date.parse("2026-06-10T23:30:00Z"), "/")];
  const s = summarise(ev, { from: "2026-06-11", to: "2026-06-11", group: "hour" });
  assert.equal(s.totals.visitors, 1);
  assert.equal(s.series.find((b) => b.key === "00").visitors, 1);
  assert.equal(s.heatmap[3][0], 1); // Thursday 00:00
});

ok("filters narrow to the visitors that match, and a page filter means 'viewed that page'", () => {
  assert.equal(summarise(day1, { from: "2026-11-08", to: "2026-11-08", filter: { page: "/contact" } }).totals.visitors, 2);
  assert.equal(summarise(day1, { from: "2026-11-08", to: "2026-11-08", filter: { source: "Instagram" } }).totals.visitors, 1);
  assert.equal(summarise(day1, { from: "2026-11-08", to: "2026-11-08", filter: { city: "Glasgow", device: "Phone" } }).totals.visitors, 2);
  assert.deepEqual(cleanFilter({ page: "/x", evil: "y", city: 4 }), { page: "/x" });
});

ok("journeys list the pages before the enquiry, newest first, with no contact details", () => {
  const j = summarise(day1, { from: "2026-11-08", to: "2026-11-08" }).journeys;
  assert.equal(j.length, 1);
  assert.deepEqual(j[0], { at: "2026-11-08T10:05:00.000Z", path: ["/", "/services", "/contact"], src: "Google", dev: "Computer", place: "Edinburgh, United Kingdom", types: ["Wedding & Walimah"], views: 3, time: 360 });
});

ok("live counts distinct visitors in the last 30 minutes", () => {
  assert.equal(liveCount(day1, T("21:45")), 1);
  assert.equal(liveCount(day1, T("23:00")), 0);
});

ok("days outside the period are ignored, and an empty period is all zeros, never NaN", () => {
  const s = summarise(day1, { from: "2026-11-09", to: "2026-11-10" });
  assert.equal(s.totals.visitors, 0);
  assert.equal(s.totals.bounceRate, 0);
  assert.equal(s.series.length, 2);
  assert.ok(isDay("2026-02-28") && !isDay("2026-02-30") && !isDay("08/11/2026"));
});

console.log(`\n${passed} passed\n`);
