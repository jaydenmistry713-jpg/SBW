(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  var currentIndex = 0;
  var visibleItems = [];

  // ─── Element references ───────────────────────────────────────────────────
  var grid       = document.getElementById('gallery-grid');
  var lightbox   = document.getElementById('lightbox');
  var lbImg      = document.getElementById('lightbox-img');
  var lbClose    = document.getElementById('lightbox-close');
  var lbPrev     = document.getElementById('lightbox-prev');
  var lbNext     = document.getElementById('lightbox-next');
  var lbCounter  = document.getElementById('lightbox-counter');

  if (!grid) return; // guard: not on gallery page

  // ─── Supabase fetch ───────────────────────────────────────────────────────
  function trySupabaseFetch() {
    // supabaseClient is initialised in supabase-config.js
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    supabaseClient
      .from('gallery_images')
      .select('id, url, alt_text, category, sort_order')
      .order('sort_order', { ascending: true })
      .then(function (result) {
        var data  = result.data;
        var error = result.error;

        if (error || !data || data.length === 0) return; // keep static HTML

        buildGridFromSupabase(data);
      })
      .catch(function () {
        // Silently fall back to static HTML
      });
  }

  function buildGridFromSupabase(rows) {
    grid.innerHTML = '';

    rows.forEach(function (row) {
      var item = createGalleryItem(
        row.url,
        row.alt_text || '',
        row.category  || 'uncategorised'
      );
      grid.appendChild(item);
    });

    // Re-bind events after dynamic insertion
    bindGalleryItems();
    refreshVisibleItems();
  }

  function createGalleryItem(src, alt, category) {
    var div = document.createElement('div');
    div.className = 'gallery-item';
    div.setAttribute('data-category', category);
    div.setAttribute('data-src', src);
    div.setAttribute('data-alt', alt);
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', 'View ' + alt);

    div.innerHTML =
      '<img src="' + src + '" alt="' + escapeAttr(alt) + '" loading="lazy">' +
      '<div class="gallery-item__overlay" aria-hidden="true">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>' +
        '</svg>' +
      '</div>';

    return div;
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Visible items helper ─────────────────────────────────────────────────
  function refreshVisibleItems() {
    visibleItems = Array.prototype.slice.call(
      grid.querySelectorAll('.gallery-item:not(.is-hidden)')
    );
  }

  // ─── Lightbox ─────────────────────────────────────────────────────────────
  function openLightbox(index) {
    if (!lightbox || !lbImg) return;
    refreshVisibleItems();

    if (index < 0 || index >= visibleItems.length) return;

    currentIndex = index;
    loadLightboxImage(visibleItems[currentIndex]);

    lightbox.classList.add('is-open');
    document.body.classList.add('lightbox-open');

    // Focus the close button for accessibility
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');

    // Return focus to the item that opened the lightbox
    if (visibleItems[currentIndex]) {
      visibleItems[currentIndex].focus();
    }
  }

  function loadLightboxImage(item) {
    if (!item || !lbImg) return;

    var src = item.getAttribute('data-src') || '';
    var alt = item.getAttribute('data-alt') || '';

    lbImg.classList.add('is-loading');
    lbImg.src = '';

    var tempImg = new Image();
    tempImg.onload = function () {
      lbImg.src = src;
      lbImg.alt = alt;
      lbImg.classList.remove('is-loading');
    };
    tempImg.onerror = function () {
      lbImg.src = src; // show anyway
      lbImg.alt = alt;
      lbImg.classList.remove('is-loading');
    };
    tempImg.src = src;

    updateCounter();
  }

  function updateCounter() {
    if (!lbCounter) return;
    lbCounter.textContent = (currentIndex + 1) + ' / ' + visibleItems.length;
  }

  function showPrev() {
    refreshVisibleItems();
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    loadLightboxImage(visibleItems[currentIndex]);
  }

  function showNext() {
    refreshVisibleItems();
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex + 1) % visibleItems.length;
    loadLightboxImage(visibleItems[currentIndex]);
  }

  // ─── Bind gallery item events ─────────────────────────────────────────────
  function bindGalleryItems() {
    var items = grid.querySelectorAll('.gallery-item');
    items.forEach(function (item, idx) {
      // Remove existing listeners by replacing with clone
      var clone = item.cloneNode(true);
      item.parentNode.replaceChild(clone, item);
    });

    // Re-query after replacement
    var freshItems = grid.querySelectorAll('.gallery-item');
    freshItems.forEach(function (item) {
      item.addEventListener('click', function () {
        refreshVisibleItems();
        var idx = visibleItems.indexOf(item);
        if (idx !== -1) openLightbox(idx);
      });

      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          refreshVisibleItems();
          var idx = visibleItems.indexOf(item);
          if (idx !== -1) openLightbox(idx);
        }
      });
    });
  }

  // ─── Lightbox controls ────────────────────────────────────────────────────
  function initLightboxControls() {
    if (!lightbox) return;

    if (lbClose) {
      lbClose.addEventListener('click', closeLightbox);
    }

    if (lbPrev) {
      lbPrev.addEventListener('click', function (e) {
        e.stopPropagation();
        showPrev();
      });
    }

    if (lbNext) {
      lbNext.addEventListener('click', function (e) {
        e.stopPropagation();
        showNext();
      });
    }

    // Click on overlay (outside the inner box) to close
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // ─── Keyboard support ─────────────────────────────────────────────────────
  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!lightbox || !lightbox.classList.contains('is-open')) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          showPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          showNext();
          break;
      }
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    bindGalleryItems();
    refreshVisibleItems();
    initLightboxControls();
    initKeyboard();
    trySupabaseFetch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
