/* === menu-selector.js — Catering page tab & sidebar switcher with Supabase sync === */

(function () {
  'use strict';

  /* ============================================================
     MENU DATA — hardcoded fallback (used if Supabase is absent
     or returns no rows)
  ============================================================ */
  var MENU_DATA = {
    buffet: {
      1: {
        title: 'Buffet Menu 1',
        subtitle: 'Perfect for Mehndi, Engagement, Baat Pakki and more',
        courses: [
          {
            name: 'Menu Items',
            items: [
              'Chicken Pilau',
              'Lamb Korma',
              'Naan',
              'Chapli Kebab',
              'Mini Sliders',
              'Creamy Pasta',
              'Salad, Raita & Red Chilli Sauce'
            ]
          }
        ]
      },
      2: {
        title: 'Buffet Menu 2',
        subtitle: 'Perfect for Mehndi, Engagement, Baat Pakki and more',
        courses: [
          {
            name: 'Menu Items',
            items: [
              'Achari Aloo',
              'Seekh Kabab',
              'Chicken Jalfrezi',
              'Lamb Pilau',
              'Tarka Daal',
              'Naan',
              'Salad, Raita & Red Chilli Sauce'
            ]
          }
        ]
      }
    },
    table: {
      1: {
        title: 'Table Service Menu 1',
        subtitle: 'Ideal for Weddings, Walimah, Corporate & more',
        courses: [
          { name: 'Appetiser',  items: ['Channa Chaat', 'Mixed Fruit Juices'] },
          { name: 'Starters',   items: ['Peri Peri Chicken Steaks', 'Seekh Kebab', 'Achari Aloo'] },
          { name: 'Mains',      items: ['Chicken Pilau', 'Lamb Korma', 'Tarka Daal'] },
          { name: 'Dessert',    items: ['Gulab Jaman & Ice Cream'] }
        ]
      },
      2: {
        title: 'Table Service Menu 2',
        subtitle: 'Ideal for Weddings, Walimah, Corporate & more',
        courses: [
          { name: 'Appetisers',   items: ['Samosa Chaat', 'Mini Burgers', 'Mojito', 'Strawberry Daiquiri', 'Mango Juice'] },
          { name: 'Starters',     items: ['Peri Peri Chicken Steaks', 'Seekh Kabab', 'Lahore Fish Masala', 'Achari Aloo'] },
          { name: 'Mains',        items: ['Lamb Pilau', 'Lamb Korma', 'Chicken Karahi', 'Aloo Palak'] },
          { name: 'Dessert',      items: ['Trio Dessert'] },
          { name: 'Table Drinks', items: ['Irn Bru', 'Barrs Cola', 'Water'] }
        ]
      }
    }
  };

  /* ============================================================
     DOM HELPERS
  ============================================================ */

  /**
   * Update the course sections inside a menu panel with new data.
   * Finds existing .menu-course blocks and replaces their item lists.
   * If the number of courses in the data differs from the DOM, the
   * function rebuilds the course block list entirely (inside the
   * .menu-panel__body, before the .dietary-note).
   *
   * @param {string} panelId   - e.g. 'buffet-panel-1'
   * @param {Array}  courses   - array of { name, items[] }
   */
  function updateMenuDOM(panelId, courses) {
    var panel = document.getElementById(panelId);
    if (!panel || !courses || !courses.length) return;

    var body = panel.querySelector('.menu-panel__body');
    if (!body) return;

    var existingCourses = body.querySelectorAll('.menu-course');

    if (existingCourses.length === courses.length) {
      // Same structure — update in place to preserve DOM elements
      courses.forEach(function (course, i) {
        var courseEl = existingCourses[i];
        var titleEl  = courseEl.querySelector('.menu-course__title');
        var listEl   = courseEl.querySelector('.menu-course__items');
        if (titleEl) titleEl.textContent = course.name;
        if (listEl)  listEl.innerHTML = course.items.map(function (item) {
          return '<li>' + escapeHTML(item) + '</li>';
        }).join('');
      });
    } else {
      // Course count differs — rebuild the course blocks
      var dietaryNote = body.querySelector('.dietary-note');
      // Remove old course blocks
      existingCourses.forEach(function (el) { el.parentNode.removeChild(el); });
      // Build new course blocks and insert before the dietary note (or append)
      var fragment = document.createDocumentFragment();
      courses.forEach(function (course) {
        var courseEl = document.createElement('div');
        courseEl.className = 'menu-course';
        courseEl.innerHTML =
          '<h4 class="menu-course__title">' + escapeHTML(course.name) + '</h4>' +
          '<ul class="menu-course__items">' +
            course.items.map(function (item) {
              return '<li>' + escapeHTML(item) + '</li>';
            }).join('') +
          '</ul>';
        fragment.appendChild(courseEl);
      });
      if (dietaryNote) {
        body.insertBefore(fragment, dietaryNote);
      } else {
        body.appendChild(fragment);
      }
    }
  }

  /** Basic HTML entity escape to guard against unexpected characters in data */
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================================
     TAB SWITCHING
     .menu-tab-btn[data-tab] → show/hide .menu-tab-content[id="tab-{data-tab}"]
  ============================================================ */
  function initTabs() {
    var tabBtns = document.querySelectorAll('.menu-tab-btn');
    if (!tabBtns.length) return;

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetTab = btn.getAttribute('data-tab');

        // Deactivate all tab buttons
        tabBtns.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });

        // Deactivate all tab content panels
        document.querySelectorAll('.menu-tab-content').forEach(function (panel) {
          panel.classList.remove('is-active');
        });

        // Activate clicked button
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        // Activate corresponding content panel
        var targetPanel = document.getElementById('tab-' + targetTab);
        if (targetPanel) {
          targetPanel.classList.add('is-active');
          // Reset sidebar to first item whenever we switch tabs
          resetSidebar(targetPanel);
        }
      });
    });
  }

  /* ============================================================
     SIDEBAR SWITCHING (within a tab panel)
     .menu-sidebar-btn[data-panel] → show/hide .menu-panel[id=data-panel]
  ============================================================ */
  function initSidebars() {
    var sidebarBtns = document.querySelectorAll('.menu-sidebar-btn');
    if (!sidebarBtns.length) return;

    sidebarBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetPanelId = btn.getAttribute('data-panel');
        // Scope to the nearest .menu-selector__layout ancestor
        var layout = btn.closest('.menu-selector__layout');
        if (!layout) return;

        // Deactivate sibling sidebar buttons
        layout.querySelectorAll('.menu-sidebar-btn').forEach(function (b) {
          b.classList.remove('is-active');
        });

        // Deactivate all menu panels in this layout
        layout.querySelectorAll('.menu-panel').forEach(function (p) {
          p.classList.remove('is-active');
        });

        // Activate clicked button and target panel
        btn.classList.add('is-active');
        var targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) targetPanel.classList.add('is-active');
      });
    });
  }

  /**
   * Reset a tab content panel so its first sidebar button and first
   * menu panel are active. Called whenever the active tab changes.
   * @param {Element} tabPanel - .menu-tab-content element
   */
  function resetSidebar(tabPanel) {
    var allSidebarBtns = tabPanel.querySelectorAll('.menu-sidebar-btn');
    var allMenuPanels  = tabPanel.querySelectorAll('.menu-panel');

    allSidebarBtns.forEach(function (b) { b.classList.remove('is-active'); });
    allMenuPanels.forEach(function (p)  { p.classList.remove('is-active'); });

    if (allSidebarBtns[0]) allSidebarBtns[0].classList.add('is-active');
    if (allMenuPanels[0])  allMenuPanels[0].classList.add('is-active');
  }

  /* ============================================================
     SUPABASE FETCH
     Table expected: catering_menus
     Columns expected: menu_type (text), menu_number (int),
                       course_name (text), sort_order (int),
                       item_text (text)
  ============================================================ */
  function fetchFromSupabase() {
    if (!window.supabaseClient) return;

    window.supabaseClient
      .from('catering_menus')
      .select('menu_type, menu_number, course_name, sort_order, item_text')
      .order('menu_type')
      .order('menu_number')
      .order('sort_order')
      .then(function (result) {
        var data  = result.data;
        var error = result.error;

        if (error) {
          console.warn('[menu-selector] Supabase error — using static content.', error.message);
          return;
        }

        if (!data || !data.length) {
          // No rows returned — keep static HTML as-is
          return;
        }

        // Group rows into { buffet: { 1: { courses: [...] }, 2: {...} }, table: {...} }
        var grouped = {};
        data.forEach(function (row) {
          var type   = row.menu_type;    // 'buffet' | 'table'
          var num    = row.menu_number;  // 1 | 2
          var course = row.course_name;
          var item   = row.item_text;

          if (!grouped[type])       grouped[type] = {};
          if (!grouped[type][num])  grouped[type][num] = {};
          if (!grouped[type][num][course]) grouped[type][num][course] = [];
          grouped[type][num][course].push(item);
        });

        // For each type+number that has data, build a courses array
        // preserving the order courses were first seen (relies on
        // sort_order having already ordered the rows from Supabase).
        Object.keys(grouped).forEach(function (type) {
          Object.keys(grouped[type]).forEach(function (num) {
            var courseMap = grouped[type][num];
            var courses   = Object.keys(courseMap).map(function (courseName) {
              return { name: courseName, items: courseMap[courseName] };
            });
            var panelId = type + '-panel-' + num;
            updateMenuDOM(panelId, courses);
          });
        });
      })
      .catch(function (err) {
        console.warn('[menu-selector] Supabase fetch failed — using static content.', err);
      });
  }

  /* ============================================================
     INIT
  ============================================================ */
  function init() {
    initTabs();
    initSidebars();
    fetchFromSupabase();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
