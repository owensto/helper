/* Reveal a cited source before native fragment navigation. */
(() => {
  function reveal(hash, scroll) {
    if (!/^#source-\d+$/.test(hash)) return;
    const target = document.getElementById(hash.slice(1));
    const disclosure = target?.closest('.guide-sources details');
    if (!disclosure) return;
    disclosure.open = true;
    if (scroll) target.scrollIntoView({block: 'center'});
    target.focus({preventScroll: true});
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('.guide-citations a');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      reveal(link.hash, true);
    }
  });
  addEventListener('hashchange', () => reveal(location.hash, true));
  reveal(location.hash, true);
})();
