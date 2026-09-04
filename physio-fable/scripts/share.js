/**
 * Share island (progressive enhancement, hand-written JS).
 *
 * Copies the current page (or item-deep-link) URL to the clipboard, with a
 * prompt() fallback where the clipboard API is unavailable. Every control
 * is built here — [data-share-area] slots and per-card buttons — so without
 * JS there is nothing dead. QR codes are deliberately out of scope until
 * the site has a canonical public domain (a QR of a relative URL is
 * useless); see README.
 */
(() => {
  const copy = async (text, done) => {
    try {
      await navigator.clipboard.writeText(text);
      done('Link copied');
    } catch {
      const ok = window.prompt('Copy this link:', text);
      done(ok === null ? 'Share cancelled' : 'Link ready to copy');
    }
  };

  const makeButton = (label, getUrl) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-btn';
    btn.textContent = label;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await copy(getUrl(), (msg) => {
        btn.textContent = msg;
        setTimeout(() => {
          btn.textContent = label;
          btn.disabled = false;
        }, 1600);
      });
    });
    return btn;
  };

  for (const slot of document.querySelectorAll('[data-share-area]')) {
    slot.appendChild(makeButton('Share area', () => window.location.href.split('#')[0]));
  }
  for (const card of document.querySelectorAll('article.item[id]')) {
    const head = card.querySelector('.ihead');
    if (!head) continue;
    const name = card.querySelector('h3')?.textContent?.trim() || card.id;
    head.appendChild(
      makeButton('Share', () => `${window.location.href.split('#')[0]}#${card.id}`),
    );
    head.lastChild.setAttribute('aria-label', `Copy link to ${name}`);
  }
})();
