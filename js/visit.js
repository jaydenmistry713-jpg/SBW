// Visitor statistics for the dashboard (dashboard.html). Cookieless: nothing is stored
// on the visitor's device. Sends a page view, time spent on the page, contact-link clicks
// and, from contact.html, a successful enquiry to netlify/functions/visit.mjs.
// Copied on 2026-11-08 from the Punjabi Folk Entertainment site, where the dashboard
// was first built; only the names below changed.
//
// On 404.html the script tag carries data-404, so the missing URL is recorded as such.
// The dashboard's "Don't count my visits" switch sets localStorage sbw-stats-ignore.
(function () {
    'use strict';

    try {
        if (localStorage.getItem('sbw-stats-ignore') === '1') return;
    } catch (e) { /* storage blocked: count the visit */ }
    if (navigator.webdriver) return;

    var endpoint = '/.netlify/functions/visit';
    var script = document.currentScript;
    var path = (script && script.hasAttribute('data-404') ? '404:' : '') + location.pathname;

    function send(data) {
        data.p = path;
        var body = JSON.stringify(data);
        try {
            if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
        } catch (e) { /* fall through to fetch */ }
        try {
            fetch(endpoint, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
        } catch (e) { /* statistics must never break the page */ }
    }

    var params = new URLSearchParams(location.search);
    send({
        t: 'view',
        r: document.referrer,
        w: screen.width,
        us: params.get('utm_source'),
        um: params.get('utm_medium'),
        uc: params.get('utm_campaign')
    });

    // Time on page counts only while the tab is visible. Each time it is hidden the time
    // since the last report is sent, so switching tabs and coming back still adds up.
    var shownAt = document.visibilityState === 'visible' ? Date.now() : 0;
    function reportTime() {
        if (!shownAt) return;
        var seconds = Math.round((Date.now() - shownAt) / 1000);
        shownAt = 0;
        if (seconds >= 1) send({ t: 'leave', d: seconds });
    }
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') reportTime();
        else shownAt = Date.now();
    });
    window.addEventListener('pagehide', reportTime);

    // Phone, email, WhatsApp and social links.
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        var label =
            /^tel:/i.test(href) ? 'phone' :
            /^mailto:/i.test(href) ? 'email' :
            /wa\.me|whatsapp\./i.test(href) ? 'whatsapp' :
            /instagram\.com/i.test(href) ? 'instagram' :
            /facebook\.com/i.test(href) ? 'facebook' :
            /youtube\.com|youtu\.be/i.test(href) ? 'youtube' :
            /tiktok\.com/i.test(href) ? 'tiktok' : '';
        if (label) send({ t: 'click', l: label });
    }, true);

    // Called by js/contact-form.js after the enquiry has been sent successfully.
    window.sbwStats = {
        enquiry: function (eventType) {
            send({ t: 'enquiry', e: eventType || '' });
        }
    };
})();
