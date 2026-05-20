(function () {
  'use strict';

  // ─── Element references ───────────────────────────────────────────────────
  var form            = document.getElementById('enquiry-form');
  var thankyou        = document.getElementById('form-thankyou');
  var eventTypeSelect = document.getElementById('event-type');

  var servicesSection  = document.getElementById('services-section');
  var corporateSection = document.getElementById('corporate-section');
  var cateringSection  = document.getElementById('catering-section');
  var decorSection     = document.getElementById('decor-section');
  var planningSection  = document.getElementById('planning-section');
  var venueNameSection = document.getElementById('venue-name-section');

  var cbCatering = document.getElementById('cb-catering');
  var cbDecor    = document.getElementById('cb-decor');
  var cbPlanning = document.getElementById('cb-planning');
  var cbManagement = document.getElementById('cb-management');
  var venueYes   = document.getElementById('venue-yes');

  // Guard: only run on contact page
  if (!form) return;

  // ─── Helper: show / hide a section ───────────────────────────────────────
  function showSection(el) {
    if (!el) return;
    el.classList.add('is-visible');
  }

  function hideSection(el) {
    if (!el) return;
    el.classList.remove('is-visible');
  }

  // ─── Event type logic ─────────────────────────────────────────────────────
  var weddingTypes = ['engagement', 'nikkah', 'mehndi', 'wedding'];
  var otherTypes   = ['corporate', 'other'];

  function handleEventTypeChange() {
    if (!eventTypeSelect) return;
    var val = eventTypeSelect.value;

    if (weddingTypes.indexOf(val) !== -1) {
      showSection(servicesSection);
      hideSection(corporateSection);
    } else if (otherTypes.indexOf(val) !== -1) {
      hideSection(servicesSection);
      showSection(corporateSection);
      // When services section is hidden, also hide all service sub-sections
      hideSection(cateringSection);
      hideSection(decorSection);
      hideSection(planningSection);
      hideSection(venueNameSection);
      // Uncheck service checkboxes so data isn't submitted unexpectedly
      uncheckServiceBoxes();
    } else {
      hideSection(servicesSection);
      hideSection(corporateSection);
      hideSection(cateringSection);
      hideSection(decorSection);
      hideSection(planningSection);
      hideSection(venueNameSection);
      uncheckServiceBoxes();
    }
  }

  function uncheckServiceBoxes() {
    [cbCatering, cbDecor, cbPlanning, cbManagement].forEach(function (cb) {
      if (cb) cb.checked = false;
    });
  }

  if (eventTypeSelect) {
    eventTypeSelect.addEventListener('change', handleEventTypeChange);
  }

  // ─── Service checkbox logic ───────────────────────────────────────────────
  if (cbCatering) {
    cbCatering.addEventListener('change', function () {
      if (cbCatering.checked) {
        showSection(cateringSection);
      } else {
        hideSection(cateringSection);
      }
    });
  }

  if (cbDecor) {
    cbDecor.addEventListener('change', function () {
      if (cbDecor.checked) {
        showSection(decorSection);
      } else {
        hideSection(decorSection);
      }
    });
  }

  if (cbPlanning) {
    cbPlanning.addEventListener('change', function () {
      if (cbPlanning.checked) {
        showSection(planningSection);
      } else {
        hideSection(planningSection);
        hideSection(venueNameSection);
        // Reset venue radio buttons
        var venueRadios = document.querySelectorAll('input[name="venue_confirmed"]');
        venueRadios.forEach(function (r) { r.checked = false; });
      }
    });
  }

  // ─── Venue confirmed radio logic ──────────────────────────────────────────
  function initVenueRadios() {
    var venueRadios = document.querySelectorAll('input[name="venue_confirmed"]');
    venueRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.value === 'yes' && radio.checked) {
          showSection(venueNameSection);
        } else {
          hideSection(venueNameSection);
        }
      });
    });
  }

  initVenueRadios();

  // ─── URL parameter pre-fill ───────────────────────────────────────────────
  function prefillFromUrl() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return; // URLSearchParams not supported
    }

    var service = params.get('service');
    if (!service) return;

    // All service params require showing the services section, so set event
    // type to 'wedding' (most common) only if it hasn't been set already.
    if (eventTypeSelect && !eventTypeSelect.value) {
      eventTypeSelect.value = 'wedding';
      handleEventTypeChange();
    } else if (eventTypeSelect && weddingTypes.indexOf(eventTypeSelect.value) === -1) {
      // Current value is not a wedding type — override to wedding
      eventTypeSelect.value = 'wedding';
      handleEventTypeChange();
    }

    showSection(servicesSection);

    switch (service) {
      case 'event-planning':
        if (cbPlanning) {
          cbPlanning.checked = true;
          showSection(planningSection);
        }
        break;

      case 'event-management':
        if (cbManagement) {
          cbManagement.checked = true;
        }
        break;

      case 'bespoke-decor':
        if (cbDecor) {
          cbDecor.checked = true;
          showSection(decorSection);
        }
        break;

      case 'catering':
        if (cbCatering) {
          cbCatering.checked = true;
          showSection(cateringSection);
        }
        break;
    }
  }

  prefillFromUrl();

  // ─── Form submit handler ──────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    var formData = new FormData(form);

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      saveEnquiryToSupabase(formData);
      showThankyou();
    })
    .catch(function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Enquiry';
      }
      form.submit();
    });
  });

  function saveEnquiryToSupabase(formData) {
    if (!window.supabaseClient) return;
    window.supabaseClient.from('enquiries').insert({
      full_name:          formData.get('full_name')          || null,
      phone:              formData.get('phone')              || null,
      email:              formData.get('email')              || null,
      event_date:         formData.get('event_date')         || null,
      event_type:         formData.get('event_type')         || null,
      service_planning:   !!formData.get('service_planning'),
      service_management: !!formData.get('service_management'),
      service_decor:      !!formData.get('service_decor'),
      service_catering:   !!formData.get('service_catering'),
      event_details:      formData.get('event_details')      || null,
      menu_type:          formData.get('menu_type')          || null,
      dietary_notes:      formData.get('dietary_notes')      || null,
      decor_theme:        formData.get('decor_theme')        || null,
      venue_confirmed:    formData.get('venue_confirmed')    || null,
      venue_name:         formData.get('venue_name')         || null,
      guest_count:        formData.get('guest_count')        || null,
      additional_notes:   formData.get('additional_notes')   || null
    }).then(function (result) {
      if (result.error) console.warn('Supabase enquiry save failed:', result.error);
    });
  }

  function showThankyou() {
    form.style.display = 'none';
    if (thankyou) {
      thankyou.classList.add('is-visible');
      var scrollTarget = thankyou.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }

}());
