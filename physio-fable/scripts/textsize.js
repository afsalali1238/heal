/**
 * Text-size island (progressive enhancement, hand-written JS).
 *
 * Cycles Normal → Larger → Largest, scaling type via --scale (see the
 * pre-paint inline script in <head>, which applies the saved value before
 * first paint). Preference lives in localStorage (key: physio-fable-scale)
 * and is never transmitted. The button is built here into [data-top-actions];
 * without JS there is no button at all.
 */
(() => {
  const KEY = 'physio-fable-scale';
  const STEPS = [
    { scale: '1', short: 'Text size', name: 'normal' },
    { scale: '1.15', short: 'Larger', name: 'larger' },
    { scale: '1.3', short: 'Largest', name: 'largest' },
  ];
  const slot = document.querySelector('[data-top-actions]');
  if (!slot) return;

  const read = () => {
    try {
      const i = STEPS.findIndex((s) => s.scale === localStorage.getItem(KEY));
      return i === -1 ? 0 : i;
    } catch {
      return 0;
    }
  };
  let index = read();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tbtn';
  const status = document.createElement('span');
  status.className = 'vh';
  status.setAttribute('role', 'status');

  const paint = (announce) => {
    const step = STEPS[index];
    const next = STEPS[(index + 1) % STEPS.length];
    document.documentElement.style.setProperty('--scale', step.scale);
    btn.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = 'T+ ' + step.short;
    btn.appendChild(label);
    btn.setAttribute('aria-label', `Text size, ${step.name}. Activate to set ${next.name}.`);
    if (announce) status.textContent = `Text size ${step.name}.`;
  };
  btn.addEventListener('click', () => {
    index = (index + 1) % STEPS.length;
    try {
      localStorage.setItem(KEY, STEPS[index].scale);
    } catch {
      /* Private browsing: applies for this page load. */
    }
    paint(true);
  });
  slot.appendChild(btn);
  slot.appendChild(status);
  paint(false);
})();
