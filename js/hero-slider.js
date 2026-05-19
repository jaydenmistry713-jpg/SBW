/* === hero-slider.js — Homepage hero image slider === */

(function () {
  'use strict';

  const INTERVAL = 5000;
  const slides = document.querySelectorAll('.hero__slide');
  const dots = document.querySelectorAll('.hero__dot');
  const counter = document.querySelector('.hero__counter');

  if (!slides.length) return;

  let current = 0;
  let timer = null;

  function goTo(index) {
    slides[current].classList.remove('is-active');
    dots[current] && dots[current].classList.remove('is-active');

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('is-active');
    dots[current] && dots[current].classList.add('is-active');

    if (counter) {
      counter.textContent = (current + 1) + ' / ' + slides.length;
    }
  }

  function next() {
    goTo(current + 1);
  }

  function start() {
    clearInterval(timer);
    timer = setInterval(next, INTERVAL);
  }

  function stop() {
    clearInterval(timer);
  }

  // Init first slide
  goTo(0);
  start();

  // Dot clicks
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      goTo(i);
      stop();
      start();
    });
  });

  // Pause on hover
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
  }

  // Touch swipe support
  let touchStartX = 0;
  const heroEl = document.querySelector('.hero');

  if (heroEl) {
    heroEl.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    heroEl.addEventListener('touchend', function (e) {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current + 1 : current - 1);
        stop();
        start();
      }
    }, { passive: true });
  }
})();
