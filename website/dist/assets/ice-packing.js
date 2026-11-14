(() => {
  const root = document.querySelector('.ice-packing');
  if (!root) return;
  const format = root.querySelector('#packing-format');
  const overnight = root.querySelector('[data-overnight]');
  function update() {
    overnight.hidden = format.value === 'day';
    const choices = [...root.querySelectorAll('fieldset:not([hidden]) select')];
    const count = value => choices.filter(x => x.value === value).length;
    root.querySelector('#packing-progress').textContent = `${count('pack')} to pack · ${count('supplied')} confirmed by operator · ${count('skip')} not needed · ${count('ask')} still to decide. This is a packing plan, not a safety or access check.`;
  }
  root.addEventListener('change', update);
  root.querySelector('#packing-print').addEventListener('click', () => window.print());
  root.querySelector('#packing-reset').addEventListener('click', () => {
    root.querySelectorAll('fieldset select').forEach(x => { x.value = 'ask'; });
    update();
  });
  update();
})();
