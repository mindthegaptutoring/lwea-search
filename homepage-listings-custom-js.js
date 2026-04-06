// ─────────────────────────────────────────────
//  LWEA · Homepage Listings
//  Pulls from Algolia, deduplicates by educator,
//  shows 3 newest listings in #lp-live-grid.
// ─────────────────────────────────────────────

const ALGOLIA_APP_ID    = 'V4Z6530MZ3';
const ALGOLIA_SEARCH_KEY = '764e5cea43bb0f0373d65fd3a9edcfa1';
const ALGOLIA_INDEX     = 'BD_class_posts';

const GRID_ID      = 'lp-live-grid';
const CARDS_TO_SHOW = 3;
const FETCH_SIZE   = 100; // pull enough to survive dedup

// ─── Fetch ───────────────────────────────────

async function fetchListings() {
  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: '',
      hitsPerPage: FETCH_SIZE,
      attributesToRetrieve: [
        'title', 'category', 'tags', 'description',
        'url', 'date_posted', 'educator_name', 'thumbnail'
      ],
    }),
  });

  if (!res.ok) throw new Error(`Algolia responded ${res.status}`);
  const data = await res.json();
  return data.hits || [];
}

// ─── Process ─────────────────────────────────

function processHits(hits) {
  // Sort newest first — date_posted may be a Unix timestamp (number)
  // or an ISO string; Date.parse handles both.
  hits.sort((a, b) => {
    const da = a.date_posted ? Date.parse(a.date_posted) : 0;
    const db = b.date_posted ? Date.parse(b.date_posted) : 0;
    return db - da;
  });

  // One listing per educator — keep the newest one for each name
  const seen = new Set();
  const deduped = [];
  for (const hit of hits) {
    const name = (hit.educator_name || '').trim().toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    deduped.push(hit);
    if (deduped.length === CARDS_TO_SHOW) break;
  }

  return deduped;
}

// ─── Render ──────────────────────────────────

function categoryLabel(hit) {
  const cat = hit.category;
  if (!cat) return '';
  // category may be a string or single-element array from the scraper
  return Array.isArray(cat) ? cat[0] : cat;
}

function tagChips(hit) {
  const tags = hit.tags;
  if (!tags || !tags.length) return '';
  const list = Array.isArray(tags) ? tags : [tags];
  // Show up to 3 tags so the card doesn't overflow
  return list.slice(0, 3)
    .map(t => `<span class="lp-live-tag">${escHtml(t)}</span>`)
    .join('');
}

function coverHtml(hit) {
  if (hit.thumbnail) {
    return `<img src="${escHtml(hit.thumbnail)}"
                 alt="${escHtml(hit.title || '')}"
                 loading="lazy"
                 onerror="this.style.display='none'">`;
  }
  // Fallback — plain teal block keeps the card shape intact
  return `<div class="lp-live-cover-fallback">📚</div>`;
}

function descSnippet(hit) {
  const raw = hit.description || '';
  // Strip any leftover HTML tags the scraper may have kept
  const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 160 ? plain.slice(0, 157) + '…' : plain;
}

function listingUrl(hit) {
  // url field should be the full path or absolute URL from the scraper
  const u = hit.url || '#';
  return u.startsWith('http') ? u : `https://learn.everyavenue.com${u}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCard(hit) {
  return `
<a class="lp-live-card"
   href="${listingUrl(hit)}"
   target="_blank"
   rel="noopener">
  <div class="lp-live-cover">${coverHtml(hit)}</div>
  <div class="lp-live-body">
    <div class="lp-live-cat">${escHtml(categoryLabel(hit))}</div>
    <div class="lp-live-title">${escHtml(hit.title || 'Untitled Listing')}</div>
    <p class="lp-live-desc">${escHtml(descSnippet(hit))}</p>
    <div class="lp-live-tags">${tagChips(hit)}</div>
    <div class="lp-live-footer">
      <span class="lp-live-price"></span>
      <span class="lp-live-btn">View Listing</span>
    </div>
  </div>
</a>`.trim();
}

// ─── Inject ──────────────────────────────────

function renderCards(listings) {
  const grid = document.getElementById(GRID_ID);
  if (!grid) return;
  grid.innerHTML = listings.map(buildCard).join('\n');
}

function renderError() {
  // On failure, silently clear the shimmer — don't break the page layout
  const grid = document.getElementById(GRID_ID);
  if (grid) grid.innerHTML = '';
}

// ─── Boot ────────────────────────────────────

(async () => {
  try {
    const hits     = await fetchListings();
    const listings = processHits(hits);
    renderCards(listings);
  } catch (err) {
    console.warn('[LWEA listings]', err);
    renderError();
  }
})();
