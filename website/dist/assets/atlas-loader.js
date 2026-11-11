/* The map and its data stay off the home page's initial request path. */
(() => {
  document.querySelectorAll('[data-atlas]').forEach(root => {
    let pending;
    const load = () => {
      if (pending) return pending;
      pending = import(root.dataset.module).then(module => module.mount(root)).catch(() => {
        pending = null;
        root.querySelector('.atlas-loading').textContent = 'The map could not load. Use the destination list, or select Retry map.';
        if (!root.querySelector('[data-retry]')) {
          const retry = document.createElement('button'); retry.dataset.retry = ''; retry.textContent = 'Retry map';
          retry.onclick = () => { retry.remove(); load(); };
          root.querySelector('.atlas-loading').append(' ',retry);
        }
      });
      return pending;
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin:'300px'});
    observer.observe(root);
    root.addEventListener('focusin', load, {once:true});
  });
})();
