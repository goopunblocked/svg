(() => {
  'use strict';
  const halo = document.createElement('div');
  halo.className = 'goop-cursor-halo';
  halo.setAttribute('aria-hidden', 'true');
  document.body.append(halo);

  let frame = 0;
  let x = 0, y = 0;
  function hideHalo() {
    cancelAnimationFrame(frame);
    frame = 0;
    halo.removeAttribute('data-visible');
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.target instanceof HTMLIFrameElement) {
      hideHalo();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      halo.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      halo.setAttribute('data-visible', '');
      frame = 0;
    });
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', hideHalo);
  window.addEventListener('blur', hideHalo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideHalo(); });

  let audio;
  async function clickSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audio ||= new Context();
      if (audio.state !== 'running') await audio.resume();
      if (audio.state !== 'running' || document.hidden) return;
      const start = audio.currentTime;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(620, start);
      tone.frequency.exponentialRampToValueAtTime(415, start + 0.029);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.016, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.032);
      tone.connect(gain).connect(audio.destination);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      tone.start(start);
      tone.stop(start + 0.034);
    } catch {
      // The browser may suspend audio when a page or embedded game is closing.
    }
  }
  document.addEventListener('click', event => {
    const control = event.target.closest?.('button,a[href],input,textarea,select,summary,[role="button"],canvas');
    if (event.isTrusted && control && !control.matches(':disabled,[aria-disabled="true"]')) void clickSound();
  }, true);
})();
