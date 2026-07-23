const nodemailer = require('nodemailer');

const ADMIN_URL = 'https://sbweventslive.netlify.app/admin/';
const NOTIFY_TO = 'SBWevents@outlook.com';

const FIELD_LABELS = {
  full_name: 'Name',
  phone: 'Phone',
  email: 'Email',
  event_date: 'Event Date',
  event_type: 'Event Type',
  venue_location: 'Venue / Location',
  number_of_events: 'Number of Events',
  event_details: 'Event Details',
  menu_type: 'Menu Type',
  menu_preference: 'Preferred Menu',
  dietary_notes: 'Dietary Notes',
  decor_theme: 'Décor Theme',
  venue_confirmed: 'Venue Confirmed',
  venue_name: 'Venue Name',
  guest_count: 'Guest Count',
  budget: 'Budget',
  additional_notes: 'Additional Notes'
};

const VALUE_LABELS = {
  event_type: { engagement: 'Engagement', nikkah: 'Nikkah', mehndi: 'Mehndi', wedding: 'Wedding & Walimah', corporate: 'Corporate', other: 'Other' },
  menu_type: { buffet: 'Buffet', 'table-service': 'Table Service' },
  menu_preference: { 'menu-1': 'Menu 1', 'menu-2': 'Menu 2' },
  venue_confirmed: { yes: 'Yes', no: 'No' }
};

// Fields rolled up into a single "Services" row instead of listed individually.
const SERVICE_FIELDS = ['service_planning', 'service_management', 'service_decor_catering', 'decor_catering_package'];
const SKIP_FIELDS = ['form-name'].concat(SERVICE_FIELDS);

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.OUTLOOK_SMTP_USER,
      pass: process.env.OUTLOOK_SMTP_PASS
    }
  });

  const html = buildEmailHtml(data);

  try {
    await transporter.sendMail({
      from: '"SBW Events Website" <' + NOTIFY_TO + '>',
      to: NOTIFY_TO,
      subject: 'New Enquiry — ' + (data.full_name || 'SBW Events Website'),
      html: html
    });
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Failed to send enquiry notification email:', err);
    return { statusCode: 500, body: 'Failed to send email' };
  }
};

function buildEmailHtml(data) {
  var services = [];
  if (data.service_planning) services.push('Event Planning & Co-ordination');
  if (data.service_management) services.push('Event Management (On-the-day)');
  if (data.service_decor_catering) {
    if (data.decor_catering_package === 'food-decor') services.push('Food & Décor');
    else if (data.decor_catering_package === 'decor-only') services.push('Décor Only');
    else services.push('Décor / Catering');
  }

  var rows = '';
  if (services.length) {
    rows += fieldRow('Services', services.join(', '));
  }
  Object.keys(FIELD_LABELS).forEach(function (key) {
    if (SKIP_FIELDS.indexOf(key) !== -1) return;
    var raw = data[key];
    if (!raw) return;
    var label = FIELD_LABELS[key];
    var value = (VALUE_LABELS[key] && VALUE_LABELS[key][raw]) || raw;
    rows += fieldRow(label, value);
  });

  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#FAF7F2;">' +
    '<div style="background:#2D5016;padding:28px 24px;text-align:center;">' +
    '<h1 style="color:#FFFFFF;font-size:20px;font-weight:normal;margin:0;letter-spacing:0.02em;">SBW Events &mdash; New Enquiry</h1>' +
    '</div>' +
    '<div style="padding:28px 24px;">' +
    '<table style="width:100%;border-collapse:collapse;">' + rows + '</table>' +
    '<div style="text-align:center;margin-top:28px;">' +
    '<a href="' + ADMIN_URL + '" style="background:#C9A84C;color:#1A1A1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">View in Admin Panel</a>' +
    '</div>' +
    '<p style="text-align:center;color:#999999;font-size:11px;margin-top:16px;">' + escapeHtml(ADMIN_URL) + '</p>' +
    '</div>' +
    '</div>'
  );
}

function fieldRow(label, value) {
  return (
    '<tr>' +
    '<td style="padding:6px 12px 6px 0;color:#555555;font-size:13px;vertical-align:top;white-space:nowrap;">' + escapeHtml(label) + '</td>' +
    '<td style="padding:6px 0;color:#1A1A1A;font-size:13px;">' + escapeHtml(String(value)) + '</td>' +
    '</tr>'
  );
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
