/* === main.js — Global navigation, scroll behaviour, mobile menu === */

(function () {
  'use strict';

  const header = document.getElementById('site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

  // === Sticky header scroll class ===
  function onScroll() {
    if (window.scrollY > 60) {
      header && header.classList.add('scrolled');
    } else {
      header && header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // === Mobile hamburger toggle ===
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        // Use actual rendered header height so the drawer aligns correctly at any scroll position
        navLinks.style.top = header.offsetHeight + 'px';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // === Mobile dropdown accordion ===
  dropdownToggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const parent = btn.closest('.has-dropdown');
      const isOpen = parent.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // === Close nav on outside click ===
  document.addEventListener('click', function (e) {
    if (navLinks && navLinks.classList.contains('is-open')) {
      if (!header.contains(e.target)) {
        navLinks.classList.remove('is-open');
        navToggle && navToggle.classList.remove('is-open');
        navToggle && navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    }
  });

  // === Close nav on window resize to desktop ===
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768) {
      navLinks && navLinks.classList.remove('is-open');
      navToggle && navToggle.classList.remove('is-open');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.querySelectorAll('.has-dropdown.is-open').forEach(function (el) {
        el.classList.remove('is-open');
      });
    }
  });

  // === Mark active nav link ===
  const currentPath = window.location.pathname;

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;
    const normalized = href.replace(/\/index\.html$/, '/');
    const currentNormalized = currentPath.replace(/\/index\.html$/, '/');

    if (
      normalized === currentNormalized ||
      (normalized !== '/' && currentNormalized.startsWith(normalized))
    ) {
      link.closest('li')?.classList.add('active');
      link.closest('.has-dropdown') && link.closest('.has-dropdown').classList.add('active');
    }
  });

  // === Smooth scroll for same-page anchors ===
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const headerOffset = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // === Scroll reveal ===
  // Below-the-fold content fades up gently as it enters the viewport.
  // Anything already on screen at load is left alone (no flash, no LCP delay).
  // Gallery items are excluded — gallery.js has its own reveal for Load More.
  const REVEAL_SELECTORS = [
    '.section-header',
    '.intro-strip__inner',
    '.service-card',
    '.work-grid__item',
    '.service-full-card',
    '.about-story__img-wrap',
    '.about-story__content',
    '.timeline__item',
    '.stat',
    '.value-card',
    '.service-detail__img',
    '.service-detail__body',
    '.feature-item',
    '.dietary-note',
    '.menu-selector',
    '.related-reading__list > li',
    '.blog-intro',
    '.blog-card',
    '.contact-info-item',
    '.enquiry-form-wrapper',
    '.cta-banner__inner'
  ].join(',');
  const STAGGER_MS = 90;
  const MAX_STAGGER_STEPS = 4;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const viewportH = window.innerHeight;
    const targets = Array.prototype.filter.call(
      document.querySelectorAll(REVEAL_SELECTORS),
      function (el) { return el.getBoundingClientRect().top > viewportH; }
    );

    function finishReveal(el) {
      el.classList.remove('reveal', 'is-revealed');
      el.style.removeProperty('--reveal-delay');
    }

    const revealObserver = new IntersectionObserver(function (entries) {
      // Stagger siblings that enter together (e.g. a row of cards)
      const perParent = new Map();
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const step = perParent.get(el.parentElement) || 0;
        perParent.set(el.parentElement, step + 1);
        el.style.setProperty('--reveal-delay', Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS + 'ms');
        el.classList.add('is-revealed');
        revealObserver.unobserve(el);
        // Drop the reveal classes afterwards so each component's own
        // transitions (hover lifts etc.) apply untouched
        el.addEventListener('transitionend', function onEnd(e) {
          if (e.target !== el) return; // ignore bubbling from children
          el.removeEventListener('transitionend', onEnd);
          finishReveal(el);
        });
        setTimeout(function () { finishReveal(el); }, 1500);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    targets.forEach(function (el) {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }
})();
