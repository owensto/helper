/* Static images remain visible before JavaScript and when motion is disabled. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const entered = new WeakSet();
  const reveals = new Set();
  let frame = 0;
  const stopped = () => reduce.matches || document.hidden || document.documentElement.classList.contains('motion-paused');
  function update() {
    frame = 0;
    if (stopped()) return;
    const height = innerHeight;
    const positions = [...visible].map(media => [media, media.getBoundingClientRect()]);
    for (const [media, box] of positions) {
      const offset = Math.max(-4, Math.min(4, ((height / 2 - box.top - box.height / 2) / height) * 8));
      media.style.setProperty('--preview-y', `${offset.toFixed(2)}px`);
    }
  }
  function schedule() {
    if (!frame && visible.size && !stopped()) frame = requestAnimationFrame(update);
  }
  function state() {
    const pause = stopped();
    document.documentElement.classList.toggle('preview-motion-paused', pause);
    if (pause) {
      cancelAnimationFrame(frame); frame = 0;
      reveals.forEach(animation => animation.cancel()); reveals.clear();
      visible.forEach(media => media.style.removeProperty('--preview-y'));
    } else schedule();
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const media = entry.target;
      media.classList.toggle('preview-in-view', entry.isIntersecting);
      if (entry.isIntersecting) {
        visible.add(media);
        if (!entered.has(media) && !stopped()) {
          entered.add(media);
          const animation = media.animate([
            {clipPath: 'inset(2% 2% 3% 2%)', filter: 'brightness(.94)'},
            {clipPath: 'inset(0)', filter: 'brightness(1)'}
          ], {duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)'});
          reveals.add(animation);
          animation.onfinish = () => reveals.delete(animation);
        }
      } else {
        visible.delete(media);
        media.style.removeProperty('--preview-y');
      }
    }
    schedule();
  }, {threshold: .01});
  document.querySelectorAll('[data-preview-media]').forEach(media => observer.observe(media));
  const dynamicRoots = new WeakMap();
  document.addEventListener('castward:preview-add', event => {
    const root = event.detail;
    (dynamicRoots.get(root) || []).forEach(media => { observer.unobserve(media); visible.delete(media); });
    const media = [...root.querySelectorAll('[data-preview-media]')];
    dynamicRoots.set(root, media);
    media.forEach(item => observer.observe(item));
    schedule();
  });
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  reduce.addEventListener('change', state);
  document.addEventListener('visibilitychange', state);
  new MutationObserver(() => { if (document.documentElement.classList.contains('preview-motion-paused') !== stopped()) state(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  state();
})();
