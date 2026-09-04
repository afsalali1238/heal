/**
 * Hold-timer island (progressive enhancement, hand-written JS).
 *
 * The server renders each prescribed hold as static text
 * (<p class="hold" data-hold="20">). This script appends working controls
 * (Start / Pause / Reset + countdown display) beside that text. Without JS
 * the static text simply stays — the dose is already printed in full.
 * No animation; time is announced as text (aria-live polite on finish).
 */
(() => {
  const fmt = (total) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return (m > 0 ? m + ':' + String(s).padStart(2, '0') : String(s));
  };

  for (const el of document.querySelectorAll('[data-hold]')) {
    const seconds = Number.parseInt(el.dataset.hold || '', 10);
    if (!Number.isFinite(seconds) || seconds <= 0) continue;

    const box = document.createElement('div');
    box.className = 'timer';
    const display = document.createElement('p');
    display.className = 'timer-display';
    display.textContent = fmt(seconds);
    const row = document.createElement('div');
    row.className = 'timer-row';
    const start = document.createElement('button');
    start.type = 'button';
    start.textContent = 'Start timer';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset';
    const live = document.createElement('p');
    live.className = 'vh';
    live.setAttribute('role', 'status');
    row.append(start, reset);
    box.append(display, row, live);
    el.after(box);

    let remaining = seconds;
    let ticking = null;
    const paint = () => {
      display.textContent = fmt(remaining);
    };
    const stop = () => {
      if (ticking !== null) {
        clearInterval(ticking);
        ticking = null;
      }
      start.textContent = 'Start timer';
    };
    start.addEventListener('click', () => {
      if (ticking !== null) {
        stop(); // pause
        start.textContent = 'Resume';
        return;
      }
      if (remaining <= 0) remaining = seconds;
      start.textContent = 'Pause';
      ticking = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          paint();
          stop();
          live.textContent = 'Time — release the position slowly.';
          return;
        }
        paint();
      }, 1000);
    });
    reset.addEventListener('click', () => {
      stop();
      remaining = seconds;
      live.textContent = '';
      paint();
    });
    paint();
  }
})();
