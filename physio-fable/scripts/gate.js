/**
 * Safety-gate island (progressive enhancement, hand-written JS).
 *
 * The server renders every trigger as a plain <li> carrying its own
 * data-id / data-title / data-message — all clinical strings are authored
 * in F# (Safety.fs) and never duplicated here. This script only upgrades:
 * list items become buttons, and answering drives a stop card.
 *
 * No-JS behaviour: a clean static list plus the explanatory note. There
 * are no dead controls in either mode. No animation, so there is nothing
 * for prefers-reduced-motion to disable.
 */
(() => {
  for (const gate of document.querySelectorAll('[data-gate]')) {
    const list = gate.querySelector('[data-triggers]');
    const stop = gate.querySelector('[data-stop]');
    const stopTitle = gate.querySelector('[data-stop-title]');
    const stopMessage = gate.querySelector('[data-stop-message]');
    const cleared = gate.querySelector('[data-cleared]');
    if (!list || !stop || !stopTitle || !stopMessage || !cleared) continue;

    // Blocking mode (locator route): the chooser below stays hidden until
    // the gate clears. Without JS nothing hides — the static list shows.
    const gated = [...document.querySelectorAll('[data-gated]')];
    const blocking = gate.hasAttribute('data-blocking') && gated.length > 0;
    if (blocking) gated.forEach((el) => {
      el.hidden = true;
    });
    const showStop = (title, message) => {
      stopTitle.textContent = title;
      stopMessage.textContent = message;
      stop.hidden = false;
      cleared.hidden = true;
      stopTitle.focus({ preventScroll: true });
    };
    const showCleared = () => {
      stop.hidden = true;
      cleared.hidden = false;
      if (blocking) gated.forEach((el) => {
        el.hidden = false;
      });
    };

    // Upgrade each static list item into a real button, keeping its data.
    for (const li of list.querySelectorAll('li[data-id]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'trigger';
      button.textContent = li.textContent;
      button.dataset.id = li.dataset.id || '';
      button.dataset.title = li.dataset.title || '';
      button.dataset.message = li.dataset.message || '';
      button.addEventListener('click', () => {
        showStop(button.dataset.title, button.dataset.message);
      });
      li.textContent = '';
      li.appendChild(button);
    }

    // The continue control exists only when it can work (with JS).
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'gate-clear';
    clear.textContent = 'None of these apply — continue';
    clear.addEventListener('click', showCleared);
    list.after(clear);
  }
})();
