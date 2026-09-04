/**
 * Completion-marks island (progressive enhancement, hand-written JS).
 *
 * Device-local checklist: one toggle per exercise card plus a session
 * progress line. State lives in the patient's own browser localStorage
 * (key: physio-fable-done, a JSON id list) and is never transmitted.
 * The server renders empty hooks only (<div class="ihead">, [data-progress]);
 * every control is built here, so without JS there is nothing dead.
 */
(() => {
  const KEY = 'physio-fable-done';

  const read = () => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  const write = (ids) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* Private browsing: marks still work for this page load. */
    }
  };

  const cards = [...document.querySelectorAll('article.item[id]')];
  if (cards.length === 0) return;
  let done = new Set(read());

  const paintProgress = () => {
    const n = cards.filter((c) => done.has(c.id)).length;
    for (const p of document.querySelectorAll('[data-progress]')) {
      p.textContent = n === 0 ? '' : `${n} of ${cards.length} done`;
    }
  };

  for (const card of cards) {
    const head = card.querySelector('.ihead');
    if (!head) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'done-toggle';
    const paintBtn = () => {
      const isDone = done.has(card.id);
      btn.textContent = isDone ? 'Done ✓' : 'Mark done';
      btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      btn.setAttribute('aria-label', isDone ? `Mark ${card.id} not done` : `Mark ${card.id} done`);
      card.classList.toggle('is-done', isDone);
    };
    btn.addEventListener('click', () => {
      if (done.has(card.id)) done.delete(card.id);
      else done.add(card.id);
      write([...done]);
      paintBtn();
      paintProgress();
    });
    head.appendChild(btn);
    paintBtn();
  }
  paintProgress();
})();
