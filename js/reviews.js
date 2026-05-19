/* === reviews.js — Google Reviews fetch and render === */

(function () {
  'use strict';

  const container = document.getElementById('reviews-container');
  if (!container) return;

  const REVIEWS_ENDPOINT = '/.netlify/functions/reviews';

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let stars = '';
    for (let i = 0; i < full; i++)  stars += '★';
    if (half) stars += '½';
    for (let i = 0; i < empty; i++) stars += '☆';
    return stars;
  }

  function timeAgo(timestamp) {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400);
    if (days < 7)   return days <= 1 ? 'Today' : days + ' days ago';
    if (days < 30)  return Math.floor(days / 7) + ' weeks ago';
    if (days < 365) return Math.floor(days / 30) + ' months ago';
    return Math.floor(days / 365) + ' years ago';
  }

  function renderCard(review) {
    const initial = review.author_name ? review.author_name[0].toUpperCase() : '?';
    const shortText = review.text && review.text.length > 220;
    const displayText = shortText ? review.text.slice(0, 220) + '…' : (review.text || '');

    return `
      <article class="review-card">
        <div class="review-card__stars" aria-label="${review.rating} out of 5 stars">
          ${renderStars(review.rating)}
        </div>
        <p class="review-card__text${shortText ? ' is-truncated' : ''}" data-full="${encodeURIComponent(review.text || '')}">${displayText}</p>
        ${shortText ? '<button class="review-card__expand" aria-label="Read full review">Read more</button>' : ''}
        <div class="review-card__author">
          <div class="review-card__avatar" aria-hidden="true">${initial}</div>
          <div>
            <p class="review-card__name">${review.author_name || 'Anonymous'}</p>
            <p class="review-card__date">${review.time ? timeAgo(review.time) : ''}</p>
          </div>
        </div>
      </article>`;
  }

  function renderFallback() {
    container.innerHTML = `
      <div class="reviews-fallback">
        <div class="reviews-fallback__icon">★★★★★</div>
        <h3>See Our Reviews on Google</h3>
        <p>Our clients love what we do. Read their experiences on Google.</p>
        <a href="https://www.google.com/search?q=SBW+Events+Scotland+reviews" target="_blank" rel="noopener" class="btn btn--green">
          View Google Reviews
        </a>
      </div>`;
  }

  function attachExpandHandlers() {
    container.querySelectorAll('.review-card__expand').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const textEl = btn.previousElementSibling;
        const full = decodeURIComponent(textEl.dataset.full || '');
        textEl.textContent = full;
        textEl.classList.remove('is-truncated');
        btn.remove();
      });
    });
  }

  // Fetch from Netlify Function proxy
  fetch(REVIEWS_ENDPOINT)
    .then(function (res) {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then(function (data) {
      const reviews = data.reviews || [];
      if (!reviews.length) {
        renderFallback();
        return;
      }
      // Show top 3 reviews with rating >= 4
      const top = reviews
        .filter(function (r) { return r.rating >= 4; })
        .slice(0, 3);

      if (!top.length) {
        renderFallback();
        return;
      }

      container.innerHTML = '<div class="reviews-grid">' + top.map(renderCard).join('') + '</div>';
      attachExpandHandlers();
    })
    .catch(function () {
      renderFallback();
    });
})();
