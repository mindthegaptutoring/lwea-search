/* ── HOMEPAGE LIVE LISTINGS + SEARCH BAR ────────────────────────────────────
   Paste this into BD Design Settings > Custom JS
   Fetches 3 random listings from Algolia, one per educator where possible.
   Also wires the hero search bar to /find-classes?q=
   ──────────────────────────────────────────────────────────────────────── */

(function () {

  /* ── Search bar ───────────────────────────────── */
  function initSearch() {
    var btn = document.getElementById('lp-search-btn');
    var inp = document.getElementById('lp-search-input');
    if (!btn || !inp) { return; }
    function doSearch() {
      var q = inp.value.trim();
      if (!q) { window.location.href = '/find-classes'; return; }
      window.location.href = '/find-classes?q=' + encodeURIComponent(q);
    }
    btn.addEventListener('click', doSearch);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { doSearch(); } });
  }

  /* ── Algolia listings ─────────────────────────── */
  function safe(val) {
    if (val === null || val === undefined) { return ''; }
    return String(val);
  }

  function clean(raw) {
    try {
      if (!raw) { return ''; }
      var d = document.createElement('div');
      d.innerHTML = safe(raw);
      return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
    } catch (e) { return ''; }
  }

  function buildCard(hit) {
    var title    = safe(hit.title) || 'Untitled';
    var url      = safe(hit.url) || '/find-classes';
    var category = safe(hit.category);
    var desc     = clean(hit.description);
    var format   = safe(hit.format);
    var grades   = safe(hit.grades);
    var rates    = safe(hit.rates);
    var thumb    = safe(hit.thumbnail);

    var coverInner = thumb
      ? '<img src="' + thumb + '" alt="' + title + '" onerror="this.parentNode.innerHTML=\'<div class=lp-live-cover-fallback>&#128218;</div>\'">'
      : '<div class="lp-live-cover-fallback">&#128218;</div>';

    var tags = '';
    if (format) { tags += '<span class="lp-live-tag">' + format + '</span>'; }
    if (grades) { tags += '<span class="lp-live-tag">' + grades + '</span>'; }

    return '<a class="lp-live-card" href="' + url + '">'
      + '<div class="lp-live-cover">' + coverInner + '</div>'
      + '<div class="lp-live-body">'
      + (category ? '<div class="lp-live-cat">' + category + '</div>' : '')
      + '<div class="lp-live-title">' + title + '</div>'
      + (desc ? '<div class="lp-live-desc">' + desc + '</div>' : '')
      + (tags ? '<div class="lp-live-tags">' + tags + '</div>' : '')
      + '<div class="lp-live-footer">'
      + '<span class="lp-live-price">' + (rates ? rates : '') + '</span>'
      + '<span class="lp-live-btn">View Listing &rarr;</span>'
      + '</div>'
      + '</div>'
      + '</a>';
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function loadListings() {
    var grid = document.getElementById('lp-live-grid');
    if (!grid) { return; }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://V4Z6530MZ3-dsn.algolia.net/1/indexes/BD_class_posts/query', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Algolia-API-Key', '764e5cea43bb0f0373d65fd3a9edcfa1');
    xhr.setRequestHeader('X-Algolia-Application-Id', 'V4Z6530MZ3');

    xhr.onload = function () {
      try {
        var data = JSON.parse(xhr.responseText);
        var hits = data.hits || [];
        if (hits.length === 0) { return; }

        var chosen = [];
        var seen = {};
        var shuffled = shuffle(hits);

        /* First pass: one listing per educator */
        for (var i = 0; i < shuffled.length && chosen.length < 3; i++) {
          var key = shuffled[i].educator_name || 'x';
          if (!seen[key]) {
            seen[key] = true;
            chosen.push(shuffled[i]);
          }
        }
        /* Second pass: fill remaining slots if fewer than 3 educators */
        for (var j = 0; j < shuffled.length && chosen.length < 3; j++) {
          if (chosen.indexOf(shuffled[j]) === -1) {
            chosen.push(shuffled[j]);
          }
        }

        var html = '';
        for (var k = 0; k < chosen.length; k++) {
          var cls = k === 2 ? 'lp-listing-hide-mobile' : '';
          html += '<div class="' + cls + '">' + buildCard(chosen[k]) + '</div>';
        }
        grid.innerHTML = html;

      } catch (e) { /* Silent fail — shimmer cards remain */ }
    };

    xhr.onerror = function () { /* Silent fail */ };

    xhr.send(JSON.stringify({
      hitsPerPage: 100,
      attributesToRetrieve: ['title', 'url', 'category', 'description', 'format', 'grades', 'rates', 'thumbnail', 'educator_name']
    }));
  }

  /* ── Init ─────────────────────────────────────── */
  function init() {
    initSearch();
    loadListings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
