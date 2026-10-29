export function initScrollFeedback() {
  const control = document.querySelector('.feedback-control');
  const label = control.querySelector('b');
  const flash = document.querySelector('.feedback-flash');
  const canVibrate = typeof navigator.vibrate === 'function';
  let enabled = true;
  let unlocked = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  let vibrationBlocked = false;
  let lastPulse = -Infinity;
  let flashTimer;
  function update() {
    control.setAttribute('aria-pressed', String(enabled));
    control.setAttribute('aria-label', enabled ? 'Turn scroll feedback off' : 'Turn scroll feedback on');
    if (!enabled) label.textContent = 'SCROLL FEEDBACK OFF';
    else if (canVibrate && !unlocked) { label.textContent = 'TAP TO ENABLE HAPTICS'; control.setAttribute('aria-label', 'Enable haptics'); }
    else label.textContent = canVibrate && !vibrationBlocked ? 'HAPTICS ON' : 'VISUAL FEEDBACK ON';
  }
  function pulse() {
    if (!enabled || document.body.classList.contains('menu-open')) return;
    const now = performance.now();
    // Match the Red Bull experience without interrupting an active pulse.
    if (now - lastPulse < 280) return;
    lastPulse = now;
    if (navigator.userActivation?.hasBeenActive) unlocked = true;
    if (canVibrate && unlocked) {
      try { vibrationBlocked = navigator.vibrate([100, 25, 100]) === false; }
      catch { vibrationBlocked = true; }
    }
    flash.classList.remove('pulsing');
    void flash.offsetWidth;
    flash.classList.add('pulsing');
    control.classList.add('pulsing');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => control.classList.remove('pulsing'), 230);
    update();
  }
  control.addEventListener('click', () => {
    if (enabled && canVibrate && !unlocked) { unlocked = true; pulse(); }
    else { enabled = !enabled; if (!enabled && canVibrate) { try { navigator.vibrate(0); } catch { /* Browser may block vibration. */ } } }
    update();
  });
  window.addEventListener('wheel', pulse, { passive: true });
  window.addEventListener('touchmove', pulse, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target?.tagName)) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) pulse();
  });
  update();
}
