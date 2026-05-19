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
    if (saveBtn) {
      saveBtn.addEventListener('click', saveMenus);
    }
  }

  function initMenuTabs() {
    const tabs = document.querySelectorAll('.menu-manager-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const targetTab = tab.dataset.tab;

        // Update tab active states
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');

        // Update content panel active states
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
        .order('menu_type', { ascending: true })
        .order('menu_number', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      renderMenus(data || []);
    } catch (err) {
      console.error('Failed to fetch menus:', err);
      const containers = ['buffet-menus-container', 'table-menus-container'];
      containers.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p style="color:var(--color-mid);padding:2rem 0;">Failed to load menus.</p>';
      });
    }
  }

  function renderMenus(items) {
    // Group by menu_type then menu_number
    const grouped = {};
    items.forEach(function (item) {
      const type = item.menu_type || 'buffet';
      const num = item.menu_number || 1;
      if (!grouped[type]) grouped[type] = {};
      if (!grouped[type][num]) grouped[type][num] = [];
      grouped[type][num].push(item);
    });

    // Render buffet
    const buffetContainer = document.getElementById('buffet-menus-container');
    if (buffetContainer) {
      buffetContainer.innerHTML = renderMenuGroup(grouped['buffet'] || {}, 'buffet');
    }

    // Render table
    const tableContainer = document.getElementById('table-menus-container');
    if (tableContainer) {
      tableContainer.innerHTML = renderMenuGroup(grouped['table'] || {}, 'table');
    }
  }

  function renderMenuGroup(group, type) {
    const menuNums = Object.keys(group).sort(function (a, b) { return a - b; });

    if (!menuNums.length) {
      return '<p style="color:var(--color-mid);padding:2rem 0;">No menus found for this category.</p>';
    }

    return menuNums.map(function (num) {
      const items = group[num];
      const menuLabel = type === 'buffet' ? 'Buffet Menu ' : 'Table Service Menu ';

      const rows = items.map(function (item) {
        return `
          <div class="menu-item-row" data-id="${item.id}">
            <input
              type="text"
              class="form-control menu-item-name-input"
              value="${escapeHtml(item.item_name || '')}"
              placeholder="Menu item name"
              data-id="${item.id}"
            >
            <button class="btn btn--delete menu-item-delete-btn" data-id="${item.id}">Remove</button>
          </div>
        `;
      }).join('');

      return `
        <div class="menu-section">
          <h3 class="menu-section__title">${escapeHtml(menuLabel + num)}</h3>
          <div class="menu-section__items" id="menu-section-${type}-${num}">
            ${rows}
          </div>
        </div>
      `;
    }).join('');
  }

  async function saveMenus() {
    const saveBtn = document.getElementById('save-menus-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    try {
      const rows = document.querySelectorAll('.menu-item-row');
      const updates = [];

      rows.forEach(function (row) {
        const id = row.dataset.id;
        const nameInput = row.querySelector('.menu-item-name-input');
        if (id && nameInput) {
          updates.push({ id: id, item_name: nameInput.value.trim() });
        }
      });

      // Perform updates in parallel
      const promises = updates.map(function (update) {
        return supabaseClient
          .from('catering_menus')
          .update({ item_name: update.item_name })
          .eq('id', update.id);
      });

      const results = await Promise.all(promises);
      const errors = results.filter(function (r) { return r.error; });

      if (errors.length) {
        throw new Error(errors[0].error.message);
      }

      showAlert('success', 'All menu changes saved successfully.');
    } catch (err) {
      console.error('Failed to save menus:', err);
      showAlert('error', 'Failed to save changes: ' + (err.message || 'Unknown error'));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save All Changes';
      }
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

      if (document.getElementById('admin-gallery-grid')) {
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
