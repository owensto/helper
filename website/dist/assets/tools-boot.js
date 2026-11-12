(function () {
  'use strict';
  const scripts = new Map(), boot = document.currentScript;
  function load(name) {
    if (!scripts.has(name)) scripts.set(name, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = boot.dataset[name+'Src']; script.onload = resolve;
      script.onerror = () => { scripts.delete(name); script.remove(); reject(Error('Load failed')); };
      document.head.append(script);
    }));
    return scripts.get(name);
  }
  const cards = document.querySelectorAll('[data-conditions-card]');
  async function activate(card) {
    try { if (!window.CastwardConditions) await load('conditions'); await window.CastwardConditions.loadCard(card); }
    catch (_) { card.querySelector('[data-card-weather]').textContent = 'The forecast could not load. Use the full tool links below.'; }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { observer.unobserve(entry.target); activate(entry.target); }
    }));
    cards.forEach(card => observer.observe(card));
  } else cards.forEach(card => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Load conditions';
    button.onclick = () => { button.remove(); activate(card); }; card.querySelector('[data-card-weather]').append(button);
  });
  const launch = document.querySelector('[data-chat-launch]'), banner = document.getElementById('cookie-banner');
  if (!launch) return;
  function avoidBanner() {
    const height = banner && !banner.hidden ? Math.max(0, innerHeight - banner.getBoundingClientRect().top + 12) : 16;
    launch.style.setProperty('--chat-bottom', height+'px');
  }
  if (banner) {
    new MutationObserver(avoidBanner).observe(banner, {attributes:true, attributeFilter:['hidden','class','style']});
    if ('ResizeObserver' in window) new ResizeObserver(avoidBanner).observe(banner);
  }
  window.addEventListener('resize', avoidBanner); avoidBanner();
  launch.addEventListener('click', async () => {
    const status = document.querySelector('.chat-load-status');
    launch.disabled = true;
    try {
      status.textContent = 'Open trip planner…';
      if (!window.CastwardChat) await load('chat');
      window.CastwardChat.open(); status.textContent = '';
    } catch (_) { status.textContent = 'The planner could not load. Select the button to try again.'; }
    finally { launch.disabled = false; }
  });
})();
