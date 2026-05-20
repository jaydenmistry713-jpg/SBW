(function () {
  'use strict';

  // Only run admin code on admin pages
  if (!document.body.classList.contains('admin-page') &&
      !window.location.pathname.includes('/admin/')) return;

  // ---------------------------------------------------------------------------
  // SESSION CHECK
  // ---------------------------------------------------------------------------
  async function checkSession() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session && !window.location.pathname.includes('/admin/index.html')) {
        window.location.href = '/admin/index.html';
        return null;
      }
      if (session) {
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = session.user.email;
      }
      return session;
    } catch (err) {
      console.error('Session check failed:', err);
      if (!window.location.pathname.includes('/admin/index.html')) {
        window.location.href = '/admin/index.html';
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // LOGIN FORM
  // ---------------------------------------------------------------------------
  function initLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = form.querySelector('button[type="submit"]');

      // Clear previous error
      errorEl.style.display = 'none';
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          window.location.href = '/admin/gallery.html';
        }
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed. Please try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // SIGN OUT
  // ---------------------------------------------------------------------------
  function initSignOut() {
    const btn = document.getElementById('signout-btn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
      window.location.href = '/admin/index.html';
    });
  }

  // ---------------------------------------------------------------------------
  // ALERT HELPER
  // ---------------------------------------------------------------------------
  function showAlert(type, message) {
    const alertEl = document.getElementById('admin-alert');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = 'admin-alert is-visible admin-alert--' + type;
    // Auto-hide after 5 seconds
    clearTimeout(alertEl._hideTimeout);
    alertEl._hideTimeout = setTimeout(function () {
      alertEl.classList.remove('is-visible');
    }, 5000);
  }

  // ---------------------------------------------------------------------------
  // GALLERY MANAGER
  // ---------------------------------------------------------------------------
  function initGallery() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    fetchGallery();

    // Drag and drop handlers
    if (uploadZone) {
      uploadZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadZone.classList.add('is-dragging');
      });

      uploadZone.addEventListener('dragleave', function (e) {
        if (!uploadZone.contains(e.relatedTarget)) {
          uploadZone.classList.remove('is-dragging');
        }
      });

      uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.classList.remove('is-dragging');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) uploadFiles(files);
      });
    }

    // File input change
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        const files = Array.from(fileInput.files);
        if (files.length) uploadFiles(files);
        fileInput.value = '';
      });
    }
  }

  async function fetchGallery() {
    const grid = document.getElementById('admin-gallery-grid');
    if (!grid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gallery_images')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      renderGallery(data || []);
    } catch (err) {
      console.error('Failed to fetch gallery:', err);
      if (grid) {
        grid.innerHTML = '<p style="color:var(--color-mid);grid-column:1/-1;text-align:center;padding:3rem 0;">Failed to load gallery. Please refresh the page.</p>';
      }
    }
  }

  function renderGallery(images) {
    const grid = document.getElementById('admin-gallery-grid');
    if (!grid) return;

    if (!images.length) {
      grid.innerHTML = '<p style="color:var(--color-mid);grid-column:1/-1;text-align:center;padding:3rem 0;">No images yet. Upload some above.</p>';
      return;
    }

    grid.innerHTML = images.map(function (img) {
      return `
        <div class="admin-gallery-item" data-id="${img.id}">
          <div class="admin-gallery-item__img-wrap">
            <img src="${escapeHtml(img.url || '')}" alt="${escapeHtml(img.alt_text || '')}" loading="lazy">
          </div>
          <div class="admin-gallery-item__controls">
            <input
              type="text"
              class="form-control gallery-alt-input"
              placeholder="Alt text / description"
              value="${escapeHtml(img.alt_text || '')}"
              data-id="${img.id}"
              data-field="alt_text"
            >
            <select class="form-control gallery-category-select" data-id="${img.id}" data-field="category">
              <option value="all"${img.category === 'all' ? ' selected' : ''}>All</option>
              <option value="decor"${img.category === 'decor' ? ' selected' : ''}>Decor</option>
              <option value="catering"${img.category === 'catering' ? ' selected' : ''}>Catering</option>
              <option value="events"${img.category === 'events' ? ' selected' : ''}>Events</option>
            </select>
            <button class="btn btn--delete gallery-delete-btn" data-id="${img.id}" data-path="${escapeHtml(img.storage_path || '')}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach update listeners (blur on inputs, change on selects)
    grid.querySelectorAll('.gallery-alt-input').forEach(function (input) {
      input.addEventListener('blur', handleGalleryFieldUpdate);
    });
    grid.querySelectorAll('.gallery-category-select').forEach(function (select) {
      select.addEventListener('change', handleGalleryFieldUpdate);
    });
    grid.querySelectorAll('.gallery-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', handleGalleryDelete);
    });
  }

  async function handleGalleryFieldUpdate(e) {
    const el = e.target;
    const id = el.dataset.id;
    const field = el.dataset.field;
    const value = el.value;

    try {
      const update = {};
      update[field] = value;
      const { error } = await supabaseClient
        .from('gallery_images')
        .update(update)
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update gallery item:', err);
      showAlert('error', 'Failed to save change: ' + (err.message || 'Unknown error'));
    }
  }

  async function handleGalleryDelete(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const storagePath = btn.dataset.path;

    if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) return;

    btn.disabled = true;
    btn.textContent = 'Deleting…';

    try {
      // Delete from database
      const { error: dbError } = await supabaseClient
        .from('gallery_images')
        .delete()
        .eq('id', id);
      if (dbError) throw dbError;

      // Delete from storage if path available
      if (storagePath) {
        const { error: storageError } = await supabaseClient.storage
          .from('gallery')
          .remove([storagePath]);
        if (storageError) console.warn('Storage delete warning:', storageError);
      }

      // Remove card from DOM
      const card = document.querySelector('.admin-gallery-item[data-id="' + id + '"]');
      if (card) card.remove();

      showAlert('success', 'Image deleted successfully.');
    } catch (err) {
      console.error('Failed to delete image:', err);
      showAlert('error', 'Failed to delete image: ' + (err.message || 'Unknown error'));
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  }

  async function uploadFiles(files) {
    const uploadZone = document.getElementById('upload-zone');
    if (uploadZone) {
      uploadZone.classList.add('is-uploading');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // Generate a unique file path
        const ext = file.name.split('.').pop().toLowerCase();
        const fileName = Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.' + ext;
        const storagePath = 'gallery/' + fileName;

        // Upload to Supabase storage
        const { error: uploadError } = await supabaseClient.storage
          .from('gallery')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('gallery')
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;

        // Insert into database
        const { error: dbError } = await supabaseClient
          .from('gallery_images')
          .insert({
            url: publicUrl,
            storage_path: storagePath,
            alt_text: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            category: 'all',
            sort_order: Date.now()
          });

        if (dbError) throw dbError;

        successCount++;
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        errorCount++;
      }
    }

    if (uploadZone) uploadZone.classList.remove('is-uploading');

    if (successCount > 0) {
      showAlert('success', successCount + ' image' + (successCount > 1 ? 's' : '') + ' uploaded successfully.' + (errorCount > 0 ? ' ' + errorCount + ' failed.' : ''));
      fetchGallery();
    } else if (errorCount > 0) {
      showAlert('error', 'Upload failed. Please try again.');
    }
  }

  // ---------------------------------------------------------------------------
  // MENU MANAGER
  // ---------------------------------------------------------------------------
  function initMenus() {
    fetchMenus();
    initMenuTabs();
    const saveBtn = document.getElementById('save-menus-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveMenus);
  }

  function initMenuTabs() {
    const tabs = document.querySelectorAll('.menu-manager-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const targetTab = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        document.querySelectorAll('.menu-manager-content').forEach(function (panel) {
          panel.classList.remove('is-active');
        });
        const targetPanel = document.getElementById('menu-tab-' + targetTab);
        if (targetPanel) targetPanel.classList.add('is-active');
      });
    });
  }

  async function fetchMenus() {
    try {
      const { data, error } = await supabaseClient
        .from('catering_menus')
        .select('*')
        .order('menu_number', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      renderMenus(data || []);
    } catch (err) {
      console.error('Failed to fetch menus:', err);
      ['buffet-menus-container', 'table-menus-container'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p style="color:var(--color-mid);padding:2rem 0;">Failed to load. Ensure the catering_menus table exists in Supabase.</p>';
      });
    }
  }

  function renderMenus(rows) {
    const grouped = {};
    rows.forEach(function (row) {
      const type = row.menu_type || 'buffet';
      const num  = String(row.menu_number || 1);
      if (!grouped[type])      grouped[type] = {};
      if (!grouped[type][num]) grouped[type][num] = [];
      grouped[type][num].push(row);
    });

    const buffetContainer = document.getElementById('buffet-menus-container');
    const tableContainer  = document.getElementById('table-menus-container');
    if (buffetContainer) buffetContainer.innerHTML = buildMenuGroupHTML(grouped['buffet'] || {}, 'buffet');
    if (tableContainer)  tableContainer.innerHTML  = buildMenuGroupHTML(grouped['table']  || {}, 'table');

    attachMenuListeners();
  }

  function buildMenuGroupHTML(group, type) {
    const nums = Object.keys(group).sort(function (a, b) { return Number(a) - Number(b); });

    if (!nums.length) {
      return '<div class="menu-empty-state">'
        + '<p>No menu data yet.</p>'
        + '<button class="btn btn--green menu-seed-btn" data-type="' + type + '">Seed default menus</button>'
        + '</div>';
    }

    return nums.map(function (num) {
      const rows  = group[num];
      const label = type === 'buffet' ? 'Buffet Menu ' : 'Table Service Menu ';

      // Group by course_name, preserving row order
      const courseMap   = {};
      const courseOrder = [];
      rows.forEach(function (row) {
        const cn = row.course_name || 'Menu Items';
        if (!courseMap[cn]) { courseMap[cn] = []; courseOrder.push(cn); }
        courseMap[cn].push(row);
      });

      const coursesHTML = courseOrder.map(function (cname) {
        const itemsHTML = courseMap[cname].map(function (row) {
          return '<div class="menu-item-row" data-id="' + escapeHtml(row.id) + '">'
            + '<input type="text" class="form-control menu-item-input" value="' + escapeHtml(row.item_text || '') + '" placeholder="Item name">'
            + '<button class="menu-item-delete-btn" title="Remove item">&#x2715;</button>'
            + '</div>';
        }).join('');

        return '<div class="menu-course-block" data-type="' + type + '" data-num="' + num + '">'
          + '<div class="menu-course-block__header">'
          + '<input type="text" class="form-control menu-course-name-input" value="' + escapeHtml(cname) + '" placeholder="Course name">'
          + '<button class="menu-course-delete-btn">Delete course</button>'
          + '</div>'
          + '<div class="menu-course-block__items">' + itemsHTML + '</div>'
          + '<button class="menu-add-item-btn">+ Add item</button>'
          + '</div>';
      }).join('');

      return '<div class="menu-section" data-type="' + type + '" data-num="' + num + '">'
        + '<h3 class="menu-section__title">' + escapeHtml(label + num) + '</h3>'
        + coursesHTML
        + '<button class="menu-add-course-btn" data-type="' + type + '" data-num="' + num + '">+ Add course</button>'
        + '</div>';
    }).join('');
  }

  function attachMenuListeners() {
    document.querySelectorAll('.menu-seed-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { seedDefaultMenus(btn.dataset.type); });
    });
    document.querySelectorAll('.menu-add-item-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { addItemToBlock(btn.closest('.menu-course-block')); });
    });
    document.querySelectorAll('.menu-add-course-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { addCourseToSection(btn.closest('.menu-section'), btn.dataset.type, btn.dataset.num); });
    });
    document.querySelectorAll('.menu-course-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Delete this course and all its items?')) btn.closest('.menu-course-block').remove();
      });
    });
    document.querySelectorAll('.menu-item-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { btn.closest('.menu-item-row').remove(); });
    });
  }

  function addItemToBlock(courseBlock) {
    const items = courseBlock.querySelector('.menu-course-block__items');
    const row = document.createElement('div');
    row.className = 'menu-item-row';
    row.innerHTML = '<input type="text" class="form-control menu-item-input" value="" placeholder="Item name">'
      + '<button class="menu-item-delete-btn" title="Remove item">&#x2715;</button>';
    items.appendChild(row);
    row.querySelector('input').focus();
    row.querySelector('.menu-item-delete-btn').addEventListener('click', function () { row.remove(); });
  }

  function addCourseToSection(section, type, num) {
    const addCourseBtn = section.querySelector('.menu-add-course-btn');
    const block = document.createElement('div');
    block.className = 'menu-course-block';
    block.dataset.type = type;
    block.dataset.num  = num;
    block.innerHTML =
      '<div class="menu-course-block__header">'
      + '<input type="text" class="form-control menu-course-name-input" value="" placeholder="Course name (e.g. Starters)">'
      + '<button class="menu-course-delete-btn">Delete course</button>'
      + '</div>'
      + '<div class="menu-course-block__items"></div>'
      + '<button class="menu-add-item-btn">+ Add item</button>';
    addCourseBtn.before(block);
    block.querySelector('.menu-course-name-input').focus();
    block.querySelector('.menu-add-item-btn').addEventListener('click', function () { addItemToBlock(block); });
    block.querySelector('.menu-course-delete-btn').addEventListener('click', function () {
      if (confirm('Delete this course and all its items?')) block.remove();
    });
  }

  async function saveMenus() {
    const saveBtn = document.getElementById('save-menus-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
      const newRows = [];
      let order = 0;

      document.querySelectorAll('.menu-section').forEach(function (section) {
        const type = section.dataset.type;
        const num  = parseInt(section.dataset.num, 10);
        section.querySelectorAll('.menu-course-block').forEach(function (block) {
          const courseName = (block.querySelector('.menu-course-name-input').value || '').trim();
          if (!courseName) return;
          block.querySelectorAll('.menu-item-row').forEach(function (row) {
            const itemText = (row.querySelector('.menu-item-input').value || '').trim();
            if (!itemText) return;
            newRows.push({ menu_type: type, menu_number: num, course_name: courseName, item_text: itemText, sort_order: order++ });
          });
        });
      });

      // Collect which type+num combos are in the DOM
      const combos = {};
      newRows.forEach(function (r) { combos[r.menu_type + '_' + r.menu_number] = { type: r.menu_type, num: r.menu_number }; });

      // Delete existing rows for each combo then reinsert
      for (const key of Object.keys(combos)) {
        const { type, num } = combos[key];
        const { error } = await supabaseClient.from('catering_menus').delete().eq('menu_type', type).eq('menu_number', num);
        if (error) throw error;
      }

      if (newRows.length) {
        const { error } = await supabaseClient.from('catering_menus').insert(newRows);
        if (error) throw error;
      }

      showAlert('success', 'Menus saved successfully.');
      await fetchMenus();
    } catch (err) {
      console.error('Failed to save menus:', err);
      showAlert('error', 'Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save All Changes'; }
    }
  }

  async function seedDefaultMenus(type) {
    const defaults = {
      buffet: {
        1: [{ course: 'Menu Items', items: ['Chicken Pilau','Lamb Korma','Naan','Chapli Kebab','Mini Sliders','Creamy Pasta','Salad, Raita & Red Chilli Sauce'] }],
        2: [{ course: 'Menu Items', items: ['Achari Aloo','Seekh Kabab','Chicken Jalfrezi','Lamb Pilau','Tarka Daal','Naan','Salad, Raita & Red Chilli Sauce'] }]
      },
      table: {
        1: [
          { course: 'Appetiser',  items: ['Channa Chaat','Mixed Fruit Juices'] },
          { course: 'Starters',   items: ['Peri Peri Chicken Steaks','Seekh Kebab','Achari Aloo'] },
          { course: 'Mains',      items: ['Chicken Pilau','Lamb Korma','Tarka Daal'] },
          { course: 'Dessert',    items: ['Gulab Jaman & Ice Cream'] }
        ],
        2: [
          { course: 'Appetisers',   items: ['Samosa Chaat','Mini Burgers','Mojito','Strawberry Daiquiri','Mango Juice'] },
          { course: 'Starters',     items: ['Peri Peri Chicken Steaks','Seekh Kabab','Lahore Fish Masala','Achari Aloo'] },
          { course: 'Mains',        items: ['Lamb Pilau','Lamb Korma','Chicken Karahi','Aloo Palak'] },
          { course: 'Dessert',      items: ['Trio Dessert'] },
          { course: 'Table Drinks', items: ['Irn Bru','Barrs Cola','Water'] }
        ]
      }
    };

    const menus = defaults[type];
    if (!menus) return;

    const rows = [];
    let order = 0;
    Object.keys(menus).forEach(function (num) {
      menus[num].forEach(function (c) {
        c.items.forEach(function (item) {
          rows.push({ menu_type: type, menu_number: parseInt(num), course_name: c.course, item_text: item, sort_order: order++ });
        });
      });
    });

    try {
      const { error } = await supabaseClient.from('catering_menus').insert(rows);
      if (error) throw error;
      showAlert('success', 'Default ' + (type === 'buffet' ? 'buffet' : 'table service') + ' menus seeded.');
      await fetchMenus();
    } catch (err) {
      showAlert('error', 'Failed to seed menus: ' + err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // TEXT MANAGER
  // ---------------------------------------------------------------------------
  function initTexts() {
    fetchTexts();

    const saveBtn = document.getElementById('save-texts-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveTexts);
    }
  }

  async function fetchTexts() {
    const container = document.getElementById('text-fields-container');
    try {
      const { data, error } = await supabaseClient
        .from('editable_texts')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      renderTexts(data || []);
    } catch (err) {
      console.error('Failed to fetch texts:', err);
      if (container) {
        container.innerHTML = '<p style="color:var(--color-mid);">Failed to load text fields.</p>';
      }
    }
  }

  function renderTexts(texts) {
    const container = document.getElementById('text-fields-container');
    if (!container) return;

    if (!texts.length) {
      container.innerHTML = '<p style="color:var(--color-mid);">No editable text fields found.</p>';
      return;
    }

    container.innerHTML = texts.map(function (item) {
      const isLong = (item.value || '').length >= 100;
      const fieldId = 'text-field-' + item.id;

      if (isLong) {
        return `
          <div class="text-field-group" data-id="${item.id}">
            <label class="text-field-key" for="${fieldId}">${escapeHtml(item.key || '')}</label>
            <textarea id="${fieldId}" class="form-control text-field-input" rows="4" data-id="${item.id}">${escapeHtml(item.value || '')}</textarea>
          </div>
        `;
      } else {
        return `
          <div class="text-field-group" data-id="${item.id}">
            <label class="text-field-key" for="${fieldId}">${escapeHtml(item.key || '')}</label>
            <input type="text" id="${fieldId}" class="form-control text-field-input" value="${escapeHtml(item.value || '')}" data-id="${item.id}">
          </div>
        `;
      }
    }).join('');
  }

  async function saveTexts() {
    const saveBtn = document.getElementById('save-texts-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    try {
      const fields = document.querySelectorAll('.text-field-input');
      const updates = [];

      fields.forEach(function (field) {
        const id = field.dataset.id;
        if (id) {
          updates.push({ id: id, value: field.value });
        }
      });

      const promises = updates.map(function (update) {
        return supabaseClient
          .from('editable_texts')
          .update({ value: update.value })
          .eq('id', update.id);
      });

      const results = await Promise.all(promises);
      const errors = results.filter(function (r) { return r.error; });

      if (errors.length) {
        throw new Error(errors[0].error.message);
      }

      showAlert('success', 'All text changes saved successfully.');
    } catch (err) {
      console.error('Failed to save texts:', err);
      showAlert('error', 'Failed to save changes: ' + (err.message || 'Unknown error'));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save All Changes';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ENQUIRIES MANAGER
  // ---------------------------------------------------------------------------
  function initEnquiries() {
    fetchEnquiries();
  }

  async function fetchEnquiries() {
    var list = document.getElementById('enquiries-list');
    if (!list) return;

    if (!window.NETLIFY_TOKEN || window.NETLIFY_TOKEN.indexOf('PASTE_') !== -1 ||
        !window.NETLIFY_SITE_ID || window.NETLIFY_SITE_ID.indexOf('PASTE_') !== -1) {
      list.innerHTML = buildSetupNoticeHTML();
      return;
    }

    list.innerHTML = '<p style="color:var(--color-mid);">Loading enquiries…</p>';

    try {
      var headers = { 'Authorization': 'Bearer ' + window.NETLIFY_TOKEN };

      var formsRes = await fetch(
        'https://api.netlify.com/api/v1/sites/' + window.NETLIFY_SITE_ID + '/forms',
        { headers: headers }
      );
      if (!formsRes.ok) throw new Error('API error ' + formsRes.status + ' — check your token and site ID.');
      var forms = await formsRes.json();

      var enquiryForm = forms.find(function (f) { return f.name === 'enquiry'; });

      if (!enquiryForm) {
        list.innerHTML = '<p class="enquiries-empty">No enquiries received yet. Once someone submits the contact form, submissions will appear here.</p>';
        return;
      }

      var subsRes = await fetch(
        'https://api.netlify.com/api/v1/forms/' + enquiryForm.id + '/submissions?per_page=100',
        { headers: headers }
      );
      if (!subsRes.ok) throw new Error('API error ' + subsRes.status + ' fetching submissions.');
      var submissions = await subsRes.json();

      renderEnquiries(submissions);
    } catch (err) {
      console.error('Failed to fetch enquiries:', err);
      list.innerHTML = '<div class="admin-alert admin-alert--error is-visible" style="margin:0;">' + escapeHtml(err.message || 'Failed to load enquiries.') + '</div>';
    }
  }

  function renderEnquiries(submissions) {
    var list = document.getElementById('enquiries-list');
    if (!list) return;

    if (!submissions.length) {
      list.innerHTML = '<p class="enquiries-empty">No enquiries received yet.</p>';
      return;
    }

    var countText = submissions.length + ' enquir' + (submissions.length === 1 ? 'y' : 'ies') + ' received';
    list.innerHTML = '<p class="enquiries-count">' + countText + '</p>'
      + submissions.map(buildEnquiryCardHTML).join('');

    list.querySelectorAll('.enquiry-card__header').forEach(function (header) {
      header.addEventListener('click', function () {
        header.closest('.enquiry-card').classList.toggle('is-open');
      });
    });
  }

  function buildEnquiryCardHTML(sub) {
    var d = sub.data || {};

    var submitted = new Date(sub.created_at);
    var submittedStr = submitted.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    var services = [];
    if (d.service_planning)   services.push('Event Planning');
    if (d.service_management) services.push('Event Management');
    if (d.service_decor)      services.push('Bespoke Décor');
    if (d.service_catering)   services.push('Catering');

    var metaHTML = '<span>' + escapeHtml(submittedStr) + '</span>';
    if (d.event_type) {
      metaHTML += '<span class="enquiry-card__badge">' + escapeHtml(String(d.event_type)) + '</span>';
    }
    if (d.event_date) {
      metaHTML += '<span>Event: ' + escapeHtml(String(d.event_date)) + '</span>';
    }

    var fields = [
      ['Phone',            d.phone,            false],
      ['Email',            d.email,            false],
      ['Event Date',       d.event_date,       false],
      ['Event Type',       d.event_type,       false],
      ['Services',         services.length ? services.join(', ') : null, false],
      ['Event Details',    d.event_details,    true],
      ['Menu Type',        d.menu_type,        false],
      ['Dietary Notes',    d.dietary_notes,    true],
      ['Décor Theme', d.decor_theme,      true],
      ['Venue Confirmed',  d.venue_confirmed,  false],
      ['Venue Name',       d.venue_name,       false],
      ['Guest Count',      d.guest_count,      false],
      ['Additional Notes', d.additional_notes, true]
    ];

    var fieldsHTML = fields
      .filter(function (f) { return f[1]; })
      .map(function (f) {
        var cls = 'enquiry-field' + (f[2] ? ' enquiry-field--full' : '');
        return '<div class="' + cls + '">'
          + '<span class="enquiry-field__label">' + escapeHtml(f[0]) + '</span>'
          + '<span class="enquiry-field__value">' + escapeHtml(String(f[1])) + '</span>'
          + '</div>';
      })
      .join('');

    return '<div class="enquiry-card">'
      + '<div class="enquiry-card__header">'
      + '<div class="enquiry-card__info">'
      + '<div class="enquiry-card__name">' + escapeHtml(d.full_name || 'Unknown') + '</div>'
      + '<div class="enquiry-card__meta">' + metaHTML + '</div>'
      + '</div>'
      + '<svg class="enquiry-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>'
      + '</div>'
      + '<div class="enquiry-card__body">'
      + '<div class="enquiry-fields">' + fieldsHTML + '</div>'
      + '</div>'
      + '</div>';
  }

  function buildSetupNoticeHTML() {
    return '<div class="enquiry-setup-notice">'
      + '<strong>Setup required</strong>'
      + '<p>To view form submissions, add your Netlify credentials to <code>js/netlify-config.js</code>:</p>'
      + '<ol>'
      + '<li>Go to <strong>app.netlify.com → User Settings → Applications</strong> and create a personal access token</li>'
      + '<li>Go to <strong>Site Settings → General → Site information</strong> and copy your Site ID</li>'
      + '<li>Paste both values into <code>js/netlify-config.js</code></li>'
      + '</ol>'
      + '</div>';
  }

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  async function init() {
    if (!window.supabaseClient) {
      console.warn('Supabase client not initialised');
      return;
    }

    const session = await checkSession();

    // Route to appropriate page handler
    if (document.getElementById('login-form')) {
      initLogin();
    } else if (session) {
      initSignOut();

      if (document.getElementById('enquiries-list')) {
        initEnquiries();
      } else if (document.getElementById('admin-gallery-grid')) {
        initGallery();
      } else if (document.getElementById('buffet-menus-container')) {
        initMenus();
      } else if (document.getElementById('text-fields-container')) {
        initTexts();
      }
    }
  }

  init();

})();
