// Aegis OS | Integrations Panel — Provider Card Stub
// STUB: structure only. No implementation.
// See docs/aegis-os-integrations-spec.md §1.2–1.3

/**
 * Creates a provider card DOM element.
 *
 * @param {import('./providers.js').Provider} provider
 * @param {'unbound'|'bound'|'error'} connectionState
 * @returns {HTMLElement}
 */
export function createProviderCard(provider, connectionState = 'unbound') {
  // TODO(impl-batch): wire up configure / disconnect handlers
  // TODO(impl-batch): read connectionState from /api/integrations/status
  const card = document.createElement('div');
  card.className = `provider-card state-${connectionState}`;
  card.dataset.providerId = provider.id;

  const isPlaceholder = provider.availability === 'placeholder';

  card.innerHTML = `
    <div class="provider-card__header">
      <img src="${provider.logoUrl}" alt="${provider.name}" class="provider-card__logo" />
      <span class="provider-card__name">${provider.name}</span>
      <span class="provider-card__state-badge state-badge--${connectionState}">
        ${connectionState.toUpperCase()}
      </span>
    </div>
    ${isPlaceholder
      ? '<div class="provider-card__placeholder-notice">Coming Soon</div>'
      : `<div class="provider-card__actions">
           <button class="btn btn--sm" data-action="configure" disabled>Configure</button>
           <button class="btn btn--sm btn--danger" data-action="disconnect" disabled>Disconnect</button>
         </div>`
    }
  `;

  return card;
}
