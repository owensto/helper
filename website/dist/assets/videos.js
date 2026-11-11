(() => {
  const players = document.querySelectorAll('.reel-card video');
  const load = video => {
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.dataset.src;
    delete source.dataset.src;
    video.load();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { load(entry.target); observer.unobserve(entry.target); }
      });
    }, {rootMargin: '200px'});
    players.forEach(video => observer.observe(video));
  } else players.forEach(load);
  players.forEach(video => video.addEventListener('play', () => {
    players.forEach(other => { if (other !== video) other.pause(); });
  }));
})();
