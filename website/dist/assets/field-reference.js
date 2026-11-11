/* Shared, accessible filters for the species catalog and fishing glossary. */
(() => {
  'use strict';
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]+/g, ' ').trim();
  const params = new URLSearchParams(location.search);
  const input = document.getElementById('glossary-search');
  if (input) {
    const region = document.getElementById('glossary-region');
    const items = [...document.querySelectorAll('[data-glossary-term]')].map(el => ({el, text: normalize(el.dataset.search), regions: JSON.parse(el.dataset.regions)}));
    const apply = () => {
      const q = normalize(input.value);
      let count = 0;
      items.forEach(item => {
        const match = (!q || item.text.includes(q)) && (!region.value || item.regions.includes(region.value) || item.regions.includes('Global'));
        item.el.hidden = !match;
        if (match) count++;
      });
      document.querySelectorAll('[data-glossary-letter]').forEach(el => { el.hidden = !el.querySelector('[data-glossary-term]:not([hidden])'); });
      document.getElementById('glossary-count').textContent = count + ' of ' + items.length + ' terms';
      document.getElementById('glossary-empty').hidden = count !== 0;
    };
    input.value = params.get('q') || '';
    if ([...region.options].some(o => o.value === params.get('region'))) region.value = params.get('region');
    input.addEventListener('input', apply);
    region.addEventListener('change', apply);
    apply();
  }
  const search = document.getElementById('species-search');
  if (search) {
    const cards = [...document.querySelectorAll('[data-species-card]')].map(el => ({el, text: normalize(el.dataset.search)}));
    const more = document.getElementById('species-more');
    let limit = 60;
    const apply = () => {
      const q = normalize(search.value);
      let count = 0;
      cards.forEach(item => {
        const match = !q || item.text.includes(q);
        item.el.hidden = !match || count >= limit;
        if (match) count++;
      });
      more.hidden = count <= limit;
      document.getElementById('species-count').textContent = count + ' matching fish references';
      document.getElementById('species-empty').hidden = count !== 0;
    };
    search.value = params.get('q') || '';
    search.addEventListener('input', () => { limit = 60; apply(); });
    more.addEventListener('click', () => { limit += 60; apply(); });
    apply();
  }
})();
