/*
 * submission-created — Netlify event-triggered function.
 *
 * Netlify runs this automatically after every *verified* (non-spam) Netlify
 * Forms submission. For the `enquiry` form it emails a branded HTML summary
 * via the Resend REST API, and saves it to the Supabase `enquiries` table that
 * the admin dashboard reads (plain fetch — no npm, no dependencies).
 *
 * The dashboard save used to run in the visitor's browser, where ad blockers /
 * tracking protection silently blocked requests to *.supabase.co. Doing it here
 * means every verified enquiry reaches the dashboard, and spam never does.
 *
 * Environment variables (Netlify → Project configuration → Environment variables):
 *   RESEND_API_KEY      required — Resend API key (account: jaydenmistry713@gmail.com)
 *   ENQUIRY_EMAIL_TO    optional — comma-separated recipients (default SBWevents@outlook.com)
 *   ENQUIRY_EMAIL_FROM  optional — default "SBW Events Website <website@sbwevents.co.uk>"
 *
 * website@sbwevents.co.uk has no mailbox — Reply-To is set to the customer's
 * own email so replies go straight to them.
 */
'use strict';

const SITE_URL = 'https://sbwevents.co.uk';
const DEFAULT_TO = 'SBWevents@outlook.com';
const DEFAULT_FROM = 'SBW Events Website <website@sbwevents.co.uk>';

// Same public anon key as js/supabase-config.js — RLS lets `anon` INSERT into
// enquiries but not read them. Never add `select()`/return=representation to
// this insert: anon has no SELECT policy, so RETURNING would fail RLS.
const SUPABASE_URL = 'https://ryvmutpznmjphyghmqvu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dm11dHB6bm1qcGh5Z2htcXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDM4NjIsImV4cCI6MjA5NDc3OTg2Mn0.2VXrORzMt_pkkUnlsLeHXLvICqVVW9Up_0NoPfpquCw';

// Brand palette (email clients need literal hex values, not CSS variables)
const C = {
  green: '#2D5016',
  greenDark: '#1E3510',
  gold: '#C9A84C',
  goldDark: '#8A6D25', // darker than --color-gold-dark for AA contrast on white
  cream: '#FAF7F2',
  creamDark: '#F0EBE3',
  border: '#E8E0D5',
  dark: '#1A1A1A',
  mid: '#555555',
  white: '#FFFFFF'
};

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Form option values → human labels (must match contact.html)
const LABELS = {
  event_type: {
    engagement: 'Engagement',
    nikkah: 'Nikkah',
    mehndi: 'Mehndi',
    wedding: 'Wedding & Walimah',
    corporate: 'Corporate',
    other: 'Other'
  },
  decor_catering_package: {
    'food-decor': 'Food & Décor',
    'decor-only': 'Décor Only'
  },
  menu_type: {
    buffet: 'Buffet',
    'table-service': 'Table Service'
  },
  menu_preference: {
    'menu-1': 'Menu 1',
    'menu-2': 'Menu 2'
  },
  venue_confirmed: {
    yes: 'Yes',
    no: 'No'
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clean(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) v = v.join(', ');
  return String(v).trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escape, then keep the customer's line breaks
function htmlText(s) {
  return escapeHtml(s).replace(/\r?\n/g, '<br>');
}

function label(field, value) {
  const map = LABELS[field];
  return (map && map[value]) || value;
}

function isEmail(s) {
  return /^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]+$/.test(s);
}

// "2027-03-14" → "Sunday 14 March 2027" (no timezone drift: built as UTC)
function formatEventDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).replace(',', '');
}

function formatReceived(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (isNaN(d)) return '';
  const opts = { timeZone: 'Europe/London' };
  const date = d.toLocaleDateString('en-GB', Object.assign({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, opts));
  const time = d.toLocaleTimeString('en-GB', Object.assign({ hour: '2-digit', minute: '2-digit' }, opts));
  return date.replace(',', '') + ' at ' + time;
}

// UK-first phone → WhatsApp digits (07… → 447…, +44… → 44…)
function whatsappNumber(phone) {
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('00')) p = p.slice(2);
  else if (p.startsWith('0')) p = '44' + p.slice(1);
  return /^\d{10,15}$/.test(p) ? p : '';
}

// ---------------------------------------------------------------------------
// Turn raw form data into ordered, labelled sections (empty rows dropped)
// ---------------------------------------------------------------------------
function buildSections(d) {
  const services = [];
  if (d.service_planning) services.push('Event Planning & Co-ordination');
  if (d.service_management) services.push('Event Management (on the day)');
  if (d.service_decor_catering) {
    services.push(d.decor_catering_package
      ? 'Décor / Catering — ' + label('decor_catering_package', d.decor_catering_package)
      : 'Décor / Catering');
  }

  const sections = [
    {
      title: 'Contact',
      rows: [
        ['Name', d.full_name],
        ['Email', d.email, d.email && isEmail(d.email) ? 'mailto:' + d.email : ''],
        ['Phone', d.phone, d.phone ? 'tel:' + d.phone.replace(/[^\d+]/g, '') : '']
      ]
    },
    {
      title: 'The Event',
      rows: [
        ['Event type', label('event_type', d.event_type)],
        ['Event date', d.event_date ? formatEventDate(d.event_date) : ''],
        ['Venue / location', d.venue_location],
        ['Number of events', d.number_of_events],
        ['Guest count', d.guest_count],
        ['Venue confirmed', label('venue_confirmed', d.venue_confirmed)],
        ['Venue name', d.venue_name]
      ]
    },
    {
      title: 'Services Requested',
      rows: services.map(function (s) { return ['', s]; })
    },
    {
      title: 'Catering',
      rows: [
        ['Menu type', label('menu_type', d.menu_type)],
        ['Preferred menu', label('menu_preference', d.menu_preference)],
        ['Dietary notes', d.dietary_notes, '', true]
      ]
    },
    {
      title: 'Décor',
      rows: [['Theme / colours', d.decor_theme, '', true]]
    },
    {
      title: 'Details & Budget',
      rows: [
        ['Budget', d.budget],
        ['Event details', d.event_details, '', true],
        ['Additional notes', d.additional_notes, '', true]
      ]
    }
  ];

  return sections
    .map(function (s) {
      return { title: s.title, rows: s.rows.filter(function (r) { return clean(r[1]); }) };
    })
    .filter(function (s) { return s.rows.length; });
}

// ---------------------------------------------------------------------------
// HTML email (table layout + inline styles; media query stacks on mobile)
// ---------------------------------------------------------------------------
function renderRow(r) {
  const lbl = r[0];
  const value = clean(r[1]);
  const href = r[2];
  const long = r[3];
  const valueHtml = href
    ? '<a href="' + escapeHtml(href) + '" style="color:' + C.green + ';text-decoration:underline;">' + escapeHtml(value) + '</a>'
    : htmlText(value);

  // Service list items: no label column, gold diamond bullet
  if (!lbl) {
    return '<tr><td colspan="2" class="row" style="padding:10px 0;border-bottom:1px solid ' + C.border + ';font-family:' + SANS + ';font-size:15px;line-height:22px;color:' + C.dark + ';">' +
      '<span style="color:' + C.gold + ';">&#9670;</span>&nbsp;&nbsp;' + valueHtml + '</td></tr>';
  }

  const valueStyle = 'font-family:' + SANS + ';font-size:15px;line-height:22px;color:' + C.dark + ';' +
    (long ? 'background-color:' + C.cream + ';border-left:3px solid ' + C.gold + ';padding:10px 12px;' : '');

  return '<tr>' +
    '<td class="label" width="36%" valign="top" style="padding:11px 12px 11px 0;border-bottom:1px solid ' + C.border + ';font-family:' + SANS + ';font-size:12px;line-height:20px;letter-spacing:0.06em;text-transform:uppercase;color:' + C.goldDark + ';font-weight:600;">' + escapeHtml(lbl) + '</td>' +
    '<td class="value" valign="top" style="padding:11px 0;border-bottom:1px solid ' + C.border + ';">' +
      (long ? '<div style="' + valueStyle + '">' + valueHtml + '</div>' : '<span style="' + valueStyle + '">' + valueHtml + '</span>') +
    '</td></tr>';
}

function renderSection(s) {
  return '<tr><td class="px" style="padding:28px 40px 0 40px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
      '<tr><td colspan="2" style="padding:0 0 6px 0;border-bottom:2px solid ' + C.gold + ';font-family:' + SERIF + ';font-size:19px;line-height:26px;color:' + C.green + ';">' + escapeHtml(s.title) + '</td></tr>' +
      s.rows.map(renderRow).join('') +
    '</table></td></tr>';
}

function button(href, text, primary) {
  const bg = primary ? C.green : C.white;
  const fg = primary ? C.white : C.green;
  return '<td class="btn" align="center" style="padding:0 6px 10px 6px;">' +
    '<a href="' + escapeHtml(href) + '" style="display:block;background-color:' + bg + ';color:' + fg + ';border:1.5px solid ' + C.green + ';border-radius:6px;padding:12px 18px;font-family:' + SANS + ';font-size:14px;line-height:18px;font-weight:600;text-decoration:none;white-space:nowrap;">' + text + '</a></td>';
}

function buildEmail(payload) {
  const raw = (payload && payload.data) || {};
  const d = {};
  Object.keys(raw).forEach(function (k) { d[k] = clean(raw[k]); });

  const name = d.full_name || 'Website visitor';
  const firstName = name.split(/\s+/)[0];
  const eventType = d.event_type ? label('event_type', d.event_type) : '';
  const eventDate = d.event_date ? formatEventDate(d.event_date) : '';
  const received = formatReceived(payload && payload.created_at);
  const sections = buildSections(d);

  // Subject + inbox preview line
  const subjectBits = [eventType, eventDate].filter(Boolean).join(', ');
  const subject = ('New enquiry: ' + name + (subjectBits ? ' — ' + subjectBits : '')).replace(/[\r\n]+/g, ' ');
  const preheader = [eventType, eventDate, d.guest_count ? d.guest_count + ' guests' : '', d.venue_location]
    .filter(Boolean).join(' · ');

  // Quick actions
  const actions = [];
  if (d.email && isEmail(d.email)) {
    actions.push(button('mailto:' + d.email + '?subject=' + encodeURIComponent('Your enquiry with SBW Events'), 'Reply by email', true));
  }
  if (d.phone) {
    actions.push(button('tel:' + d.phone.replace(/[^\d+]/g, ''), 'Call ' + escapeHtml(firstName), false));
    const wa = whatsappNumber(d.phone);
    if (wa) actions.push(button('https://wa.me/' + wa, 'WhatsApp', false));
  }

  const summaryChips = [eventType, eventDate, d.guest_count ? d.guest_count + ' guests' : '']
    .filter(Boolean)
    .map(function (t) { return escapeHtml(t).replace(/ /g, '&nbsp;'); }) // keep each item on one line
    .join(' &nbsp;<span style="color:' + C.gold + ';">&#9670;</span>&nbsp; ');

  const html = '<!DOCTYPE html>' +
'<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>' +
'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="x-apple-disable-message-reformatting">' +
'<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">' +
'<title>' + escapeHtml(subject) + '</title>' +
'<style>' +
  'body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}' +
  'a{color:' + C.green + ';}' +
  'a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}' +
  '@media only screen and (max-width:620px){' +
    '.container{width:100%!important;border-radius:0!important;}' +
    '.px{padding-left:20px!important;padding-right:20px!important;}' +
    '.label,.value{display:block!important;width:100%!important;}' +
    '.label{padding:12px 0 2px 0!important;border-bottom:0!important;}' +
    '.value{padding:0 0 12px 0!important;}' +
    '.btn-table{width:100%!important;}' +
    '.btn{display:block!important;width:100%!important;padding:0 0 10px 0!important;}' +
    '.hero-name{font-size:26px!important;line-height:32px!important;}' +
    '.outer{padding:0!important;}' +
  '}' +
'</style></head>' +
'<body style="margin:0;padding:0;background-color:' + C.creamDark + ';">' +
  // Hidden inbox preview text
  '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:' + C.creamDark + ';">' +
    escapeHtml(preheader) + '&#8199;&#847;'.repeat(60) + '</div>' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + C.creamDark + ';">' +
  '<tr><td class="outer" align="center" style="padding:28px 12px;">' +
    '<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:' + C.white + ';border-radius:10px;overflow:hidden;border:1px solid ' + C.border + ';">' +

      // Header
      '<tr><td align="center" style="background-color:' + C.cream + ';padding:28px 24px 22px 24px;border-bottom:3px solid ' + C.gold + ';">' +
        '<a href="' + SITE_URL + '" style="text-decoration:none;"><img src="' + SITE_URL + '/logo.png" width="76" height="76" alt="SBW Events" style="display:block;width:76px;height:76px;border:0;margin:0 auto;"></a>' +
        '<div style="padding-top:12px;font-family:' + SANS + ';font-size:12px;line-height:16px;letter-spacing:0.25em;text-transform:uppercase;color:' + C.goldDark + ';font-weight:600;">New Website Enquiry</div>' +
      '</td></tr>' +

      // Summary
      '<tr><td class="px" align="center" style="padding:30px 40px 6px 40px;">' +
        '<div class="hero-name" style="font-family:' + SERIF + ';font-size:30px;line-height:36px;color:' + C.green + ';">' + escapeHtml(name) + '</div>' +
        (summaryChips ? '<div style="padding-top:10px;font-family:' + SANS + ';font-size:15px;line-height:22px;color:' + C.mid + ';">' + summaryChips + '</div>' : '') +
        (received ? '<div style="padding-top:8px;font-family:' + SANS + ';font-size:12px;line-height:18px;color:' + C.mid + ';">Received ' + escapeHtml(received) + '</div>' : '') +
      '</td></tr>' +

      // Actions
      (actions.length
        ? '<tr><td class="px" align="center" style="padding:20px 34px 0 34px;">' +
            '<table role="presentation" class="btn-table" cellpadding="0" cellspacing="0" border="0" align="center"><tr>' + actions.join('') + '</tr></table>' +
          '</td></tr>'
        : '') +

      // Detail sections
      sections.map(renderSection).join('') +

      // Footer
      '<tr><td class="px" style="padding:32px 40px 0 40px;"></td></tr>' +
      '<tr><td class="px" align="center" style="background-color:' + C.cream + ';padding:22px 40px;border-top:1px solid ' + C.border + ';font-family:' + SANS + ';font-size:12px;line-height:19px;color:' + C.mid + ';">' +
        (d.email && isEmail(d.email)
          ? 'Just hit <strong>Reply</strong> to answer ' + escapeHtml(firstName) + ' directly at ' + escapeHtml(d.email) + '.<br>'
          : '') +
        'Sent from the enquiry form on <a href="' + SITE_URL + '" style="color:' + C.green + ';">sbwevents.co.uk</a> &middot; ' +
        '<a href="' + SITE_URL + '/admin/enquiries.html" style="color:' + C.green + ';">View all enquiries</a>' +
      '</td></tr>' +

    '</table>' +
  '</td></tr></table>' +
'</body></html>';

  // Plain-text alternative
  const text = [
    'NEW WEBSITE ENQUIRY',
    name + (preheader ? ' — ' + preheader : ''),
    received ? 'Received ' + received : '',
    ''
  ].concat(sections.map(function (s) {
    return s.title.toUpperCase() + '\n' + s.rows.map(function (r) {
      return r[0] ? r[0] + ': ' + clean(r[1]) : '- ' + clean(r[1]);
    }).join('\n') + '\n';
  })).concat([
    d.email && isEmail(d.email) ? 'Reply to this email to answer ' + firstName + ' directly.' : '',
    'Sent from the enquiry form on ' + SITE_URL
  ]).filter(function (l, i) { return l !== '' || i === 3; }).join('\n');

  return { subject: subject, html: html, text: text, replyTo: d.email && isEmail(d.email) ? d.email : '' };
}

// ---------------------------------------------------------------------------
// Admin dashboard row (columns match public.enquiries)
// ---------------------------------------------------------------------------
function toDashboardRow(d) {
  const v = function (k) { return d[k] ? d[k] : null; };
  return {
    full_name: v('full_name'),
    phone: v('phone'),
    email: v('email'),
    event_date: v('event_date'),
    event_type: v('event_type'),
    venue_location: v('venue_location'),
    number_of_events: v('number_of_events'),
    service_planning: !!d.service_planning,
    service_management: !!d.service_management,
    service_decor_catering: !!d.service_decor_catering,
    decor_catering_package: v('decor_catering_package'),
    event_details: v('event_details'),
    menu_type: v('menu_type'),
    menu_preference: v('menu_preference'),
    dietary_notes: v('dietary_notes'),
    decor_theme: v('decor_theme'),
    venue_confirmed: v('venue_confirmed'),
    venue_name: v('venue_name'),
    guest_count: v('guest_count'),
    budget: v('budget'),
    additional_notes: v('additional_notes')
  };
}

async function saveToDashboard(d) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/enquiries', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(toDashboardRow(d))
  });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + (await res.text()));
  console.log('[enquiry-dashboard] Saved to Supabase enquiries');
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set — email not sent');

  const to = (process.env.ENQUIRY_EMAIL_TO || DEFAULT_TO)
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const from = process.env.ENQUIRY_EMAIL_FROM || DEFAULT_FROM;
  const email = buildEmail(payload);

  const body = { from: from, to: to, subject: email.subject, html: email.html, text: email.text };
  if (email.replyTo) body.reply_to = email.replyTo;

  const headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  // Guards against a duplicate email if Netlify ever re-delivers the same submission
  if (payload.id) headers['Idempotency-Key'] = 'enquiry-' + payload.id;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: headers, body: JSON.stringify(body)
  });
  const result = await res.text();
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + result);
  console.log('[enquiry-email] Sent to ' + to.join(', ') + ': ' + result);
}

// ---------------------------------------------------------------------------
// Handler — email and dashboard save run independently; one failing never
// stops the other.
// ---------------------------------------------------------------------------
exports.handler = async function (event) {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}').payload;
  } catch (err) {
    console.error('[enquiry] Could not parse event body', err);
    return { statusCode: 400, body: 'Bad payload' };
  }

  if (!payload || payload.form_name !== 'enquiry') {
    return { statusCode: 200, body: 'Ignored (not the enquiry form)' };
  }

  const raw = payload.data || {};
  const d = {};
  Object.keys(raw).forEach(function (k) { d[k] = clean(raw[k]); });

  const results = await Promise.allSettled([sendEmail(payload), saveToDashboard(d)]);
  const labels = ['enquiry-email', 'enquiry-dashboard'];
  results.forEach(function (r, i) {
    if (r.status === 'rejected') console.error('[' + labels[i] + '] ' + (r.reason && r.reason.message || r.reason));
  });

  const ok = results.every(function (r) { return r.status === 'fulfilled'; });
  return { statusCode: ok ? 200 : 502, body: ok ? 'Sent and saved' : 'Partial failure — see logs' };
};

// Exposed for local previews/tests
exports.buildEmail = buildEmail;
exports.toDashboardRow = toDashboardRow;
