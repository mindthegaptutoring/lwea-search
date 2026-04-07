(function () {

  function safe(val) {
    if (val === null || val === undefined) { return ''; }
    return String(val);
  }

  function buildMarqueeCard(hit) {
    var title = safe(hit.title) || 'Untitled';
    var url   = safe(hit.url) || '/find-classes';
    var thumb = safe(hit.thumbnail);
    var inner = thumb
      ? '<img src="' + thumb + '" alt="' + title.replace(/"/g, '') + '" loading="lazy" onerror="this.parentNode.innerHTML=\'<div class=lp-mq-fallback></div>\'">'
      : '<div class="lp-mq-fallback"></div>';
    return '<a class="lp-mq-card" href="' + url + '" title="' + title.replace(/"/g, '') + '" onclick="event.stopPropagation();">'
      + inner
      + '<div class="lp-mq-label">' + title + '</div>'
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

  function loadMarquee() {
    var track = document.getElementById('lp-mq-track');
    if (!track) { return; }

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
        var seen   = {};
        var shuffled = shuffle(hits);

        /* First pass: one per educator, thumbnail required */
        for (var i = 0; i < shuffled.length && chosen.length < 10; i++) {
          var hit = shuffled[i];
          if (!safe(hit.thumbnail)) { continue; }
          var key = hit.educator_name || 'unknown';
          if (!seen[key]) {
            seen[key] = true;
            chosen.push(hit);
          }
        }

        /* Second pass: fill to at least 8 from any remaining */
        for (var j = 0; j < shuffled.length && chosen.length < 8; j++) {
          if (chosen.indexOf(shuffled[j]) === -1) {
            chosen.push(shuffled[j]);
          }
        }

        if (chosen.length === 0) { return; }

        var cards = '';
        for (var k = 0; k < chosen.length; k++) {
          cards += buildMarqueeCard(chosen[k]);
        }

        /* Two identical sets = seamless infinite loop */
        track.innerHTML =
          '<div class="lp-mq-set">' + cards + '</div>'
          + '<div class="lp-mq-set" aria-hidden="true">' + cards + '</div>';

      } catch (e) { /* silent fail — track stays empty */ }
    };

    xhr.onerror = function () { /* silent fail */ };

    xhr.send(JSON.stringify({
      hitsPerPage: 100,
      attributesToRetrieve: ['title', 'url', 'thumbnail', 'educator_name']
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMarquee);
  } else {
    loadMarquee();
  }

})();
