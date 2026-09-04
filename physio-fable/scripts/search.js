/**
 * Search island (progressive enhancement, hand-written JS).
 *
 * The server embeds a JSON index (<script type="application/json"
 * data-index>) authored in F# — areas, items, and their plain-language
 * text. This script builds the Search button, the overlay dialog, and the
 * client-side filter. Without JS there is no button and the index sits
 * inert. Links resolve against a per-page data-depth attribute so they
 * work from home (depth 0) and area pages (depth 1).
 */
(() => {
  const slot = document.querySelector('[data-top-actions]');
  const indexEl = document.querySelector('[data-index]');
  if (!slot || !indexEl) return;
  let index = [];
  try {
    index = JSON.parse(indexEl.textContent || '[]');
  } catch {
    return;
  }
  if (!Array.isArray(index) || index.length === 0) return;
  const depth = Number.parseInt(document.documentElement.dataset.depth || '0', 10) || 0;
  const prefix = depth > 0 ? '../' : '';

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="search-box" role="dialog" aria-modal="true" aria-label="Search dialog">' +
    '<input type="search" placeholder="Search areas and exercises" aria-label="Search areas and exercises">' +
    '<ul></ul>' +
    '<button type="button">Close</button>' +
    '</div>';
  document.body.appendChild(overlay);
  const input = overlay.querySelector('input');
  const results = overlay.querySelector('ul');
  const closeBtn = overlay.querySelector('button');

  const paint = (query) => {
    const q = query.trim().toLowerCase();
    results.innerHTML = '';
    if (q.length < 2) return;
    const hits = index
      .filter((e) => `${e.name} ${e.area} ${e.text}`.toLowerCase().includes(q))
      .slice(0, 12);
    if (hits.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No matches — try “neck”, “knee”, or “stretch”.';
      results.appendChild(li);
      return;
    }
    for (const hit of hits) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = prefix + hit.url;
      a.textContent = hit.kind === 'area' ? hit.name : `${hit.name} (${hit.area})`;
      li.appendChild(a);
      results.appendChild(li);
    }
  };

  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    input.value = '';
    paint('');
    input.focus();
  };
  const close = () => {
    overlay.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };
  input.addEventListener('input', () => paint(input.value));
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tbtn';
  btn.setAttribute('aria-label', 'Search the library');
  const label = document.createElement('span');
  label.textContent = '⌕ Search';
  btn.appendChild(label);
  btn.addEventListener('click', open);
  slot.prepend(btn);
})();
