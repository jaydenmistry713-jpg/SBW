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
  var decorCateringPackageSection = document.getElementById('decor-catering-package-section');

  var cbDecorCatering = document.getElementById('cb-decor-catering');
  var decorCateringPackageSelect = document.getElementById('decor-catering-package');
  var cbPlanning = document.getElementById('cb-planning');
  var cbManagement = document.getElementById('cb-management');
  var venueYes   = document.getElementById('venue-yes');

  // Guard: only run on contact page
  if (!form) return;

  // Disable all inputs inside hidden conditional sections on load so they're
  // excluded from submission from the very first interaction.
  [servicesSection, corporateSection, cateringSection, decorSection, planningSection, venueNameSection, decorCateringPackageSection].forEach(function (section) {
    if (!section) return;
    section.querySelectorAll('input, select, textarea').forEach(function (f) {
      f.disabled = true;
    });
  });

  // ─── Helper: show / hide a section ───────────────────────────────────────
  // Disabled inputs are excluded from FormData entirely, so Netlify never
  // sees them and won't include them in the email notification.
  function showSection(el) {
    if (!el) return;
    el.classList.add('is-visible');
    el.querySelectorAll('input, select, textarea').forEach(function (f) {
      f.disabled = false;
    });
  }

  function hideSection(el) {
    if (!el) return;
    el.classList.remove('is-visible');
    el.querySelectorAll('input, select, textarea').forEach(function (f) {
      f.disabled = true;
    });
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
      hideSection(decorCateringPackageSection);
      hideSection(cateringSection);
      hideSection(decorSection);
      hideSection(planningSection);
      hideSection(venueNameSection);
      // Uncheck service checkboxes so data isn't submitted unexpectedly
      uncheckServiceBoxes();
    } else {
      hideSection(servicesSection);
      hideSection(corporateSection);
      hideSection(decorCateringPackageSection);
      hideSection(cateringSection);
      hideSection(decorSection);
      hideSection(planningSection);
      hideSection(venueNameSection);
      uncheckServiceBoxes();
    }
  }

  function uncheckServiceBoxes() {
    [cbDecorCatering, cbPlanning, cbManagement].forEach(function (cb) {
      if (cb) cb.checked = false;
    });
    if (decorCateringPackageSelect) decorCateringPackageSelect.value = '';
  }

  if (eventTypeSelect) {
    eventTypeSelect.addEventListener('change', handleEventTypeChange);
  }

  // ─── Service checkbox logic ───────────────────────────────────────────────
  if (cbDecorCatering) {
    cbDecorCatering.addEventListener('change', function () {
      if (cbDecorCatering.checked) {
        showSection(decorCateringPackageSection);
      } else {
        hideSection(decorCateringPackageSection);
        hideSection(decorSection);
        hideSection(cateringSection);
        if (decorCateringPackageSelect) decorCateringPackageSelect.value = '';
      }
    });
  }

  if (decorCateringPackageSelect) {
    decorCateringPackageSelect.addEventListener('change', function () {
      var val = decorCateringPackageSelect.value;
      if (val === 'decor-only') {
        showSection(decorSection);
        hideSection(cateringSection);
      } else if (val === 'food-decor') {
        showSection(decorSection);
        showSection(cateringSection);
      } else {
        hideSection(decorSection);
        hideSection(cateringSection);
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
        if (cbDecorCatering) {
          cbDecorCatering.checked = true;
          showSection(decorCateringPackageSection);
        }
        if (decorCateringPackageSelect) {
          decorCateringPackageSelect.value = 'decor-only';
          showSection(decorSection);
        }
        break;

      case 'catering':
        if (cbDecorCatering) {
          cbDecorCatering.checked = true;
          showSection(decorCateringPackageSection);
        }
        if (decorCateringPackageSelect) {
          decorCateringPackageSelect.value = 'food-decor';
          showSection(decorSection);
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

    // Build submission params — skip fields with no value so Netlify's email
    // only shows fields the user actually filled in.
    var params = new URLSearchParams();
    formData.forEach(function (value, key) {
      if (typeof value === 'string' && value.trim() === '') return;
      params.append(key, value);
    });

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
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
      venue_location:     formData.get('venue_location')     || null,
      number_of_events:   formData.get('number_of_events')   || null,
      service_planning:   !!formData.get('service_planning'),
      service_management: !!formData.get('service_management'),
      service_decor_catering: !!formData.get('service_decor_catering'),
      decor_catering_package: formData.get('decor_catering_package') || null,
      event_details:      formData.get('event_details')      || null,
      menu_type:          formData.get('menu_type')          || null,
      menu_preference:    formData.get('menu_preference')    || null,
      dietary_notes:      formData.get('dietary_notes')      || null,
      decor_theme:        formData.get('decor_theme')        || null,
      venue_confirmed:    formData.get('venue_confirmed')    || null,
      venue_name:         formData.get('venue_name')         || null,
      guest_count:        formData.get('guest_count')        || null,
      budget:             formData.get('budget')             || null,
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
