(function (root) {
  'use strict';
  function decide({age, outing, covered, period}) {
    if (age === 'child') return 'Children under 16 are exempt from Florida’s basic recreational fishing license. Species, size, season, and gear rules still apply. Check the separate outing for any adult who helps take fish.';
    if (outing === 'fresh') return 'Check personal freshwater license coverage. A freshwater guide does not provide the saltwater charter exemption. Use the Florida license reference below for freshwater options and exemptions.';
    if (['pier', 'charter'].includes(outing) && covered === 'yes') return 'Confirmed licensed saltwater ' + (outing === 'pier' ? 'pier' : 'charter') + ' coverage can replace your personal basic saltwater license for this outing. Confirm the scope with the operator. Check separate shore or private-boat outings again.';
    const prices = {'3': '$17 for 3 days', '7': '$30 for 7 days', annual: '$47 for 1 year'};
    if (!prices[period]) return 'Choose a valid license period.';
    const check = ['pier', 'charter'].includes(outing) ? 'Coverage is not confirmed. Ask the operator before you rely on a pier or charter exemption. ' : '';
    return check + 'Unless another exemption applies, plan for a personal nonresident saltwater license: ' + prices[period] + ' in listed base fees. Handling fees and extra permits can apply. The free resident shoreline license does not cover visitors.';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {decide};
  if (typeof document === 'undefined') return;
  const form = document.getElementById('fl-license-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = document.getElementById('fl-license-result');
    result.textContent = decide(Object.fromEntries(new FormData(form)));
  });
})(typeof window !== 'undefined' ? window : globalThis);
