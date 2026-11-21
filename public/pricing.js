/* Monthly vs annual comparison without inventing unapproved annual rates. */
(() => {
  'use strict';
  const tabs = [...document.querySelectorAll('[data-pricing-period]')];
  if (!tabs.length) return;
  const description = document.getElementById('billing-description');
  const amounts = [...document.querySelectorAll('.pricing-amount[data-monthly-price]')];

  function setPeriod(period) {
    const annual = period === 'annual';
    tabs.forEach(tab => {
      const active = tab.dataset.pricingPeriod === period;
      tab.classList.toggle('selected', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    amounts.forEach(block => {
      const strong = block.querySelector('strong');
      const suffix = block.querySelector('span');
      const billing = block.nextElementSibling;
      if (!strong || !suffix) return;
      block.classList.toggle('annual', annual);
      strong.textContent = annual ? 'Request annual quote' : block.dataset.monthlyPrice;
      suffix.textContent = annual ? '' : '/mo';
      if (billing?.classList.contains('pricing-billing')) {
        billing.textContent = annual ? 'Annual rate to be confirmed by Admin Control' : 'Base subscription · Monthly';
      }
    });
    if (description) {
      description.textContent = annual
        ? 'Annual rates have not been finalized. Contact us for a quotation; monthly pricing remains available.'
        : 'Monthly base rates shown below. Additional branches are billed separately.';
    }
  }
  tabs.forEach(tab => tab.addEventListener('click', () => setPeriod(tab.dataset.pricingPeriod)));
  setPeriod('monthly');
})();
