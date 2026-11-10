(() => {
  const menu = document.querySelector('[data-action="menu"]');
  const nav = document.getElementById('site-nav');
  const closeMenu = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  const plannerLink = document.querySelector('.plan-cta a[href^="/plan/"], .two-col aside a[href^="/plan/"]');
  if (plannerLink) {
    const dock = document.createElement('div');
    dock.className = 'guide-dock';
    const wrap = document.createElement('div'); wrap.className = 'wrap';
    const label = document.createElement('span'); label.textContent = 'Your gear list';
    const link = document.createElement('a'); link.className = 'btn'; link.href = plannerLink.href; link.textContent = 'Prepare for this trip';
    wrap.append(label, link); dock.append(wrap); document.getElementById('main').prepend(dock);
  }
})();
(() => {
  const videos = [...document.querySelectorAll('.hero-reel video')];
  const button = document.querySelector('.hero-motion');
  if (!button) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduced.matches;
  let visible = new Set();
  const update = () => {
    button.textContent = enabled ? 'Pause films' : 'Play films';
    button.setAttribute('aria-pressed', String(enabled));
    videos.forEach(video => {
      if (enabled && visible.has(video) && !document.hidden) {
        const source = video.querySelector('source');
        if (!source.src) { source.src = source.dataset.src; video.load(); }
        video.muted = true; video.play().catch(() => {});
      } else video.pause();
    });
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)); update();
  }, {threshold: .25});
  videos.forEach(video => {
    observer.observe(video);
    video.addEventListener('pointerdown', () => {
      const source = video.querySelector('source');
      if (!source.src) { source.src = source.dataset.src; video.load(); }
    });
    video.addEventListener('keydown', () => {
      const source = video.querySelector('source');
      if (!source.src) { source.src = source.dataset.src; video.load(); }
    });
  });
  button.addEventListener('click', () => { enabled = !enabled; update(); });
  reduced.addEventListener('change', () => { enabled = !reduced.matches; update(); });
  document.addEventListener('visibilitychange', update);
  update();
})();
