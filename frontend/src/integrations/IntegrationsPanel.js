// Aegis OS | Integrations Panel — Root Panel Stub
// STUB: mounts provider cards, reads status from local API.
// See docs/aegis-os-integrations-spec.md §1, §2

import { PROVIDERS } from './providers.js';
import { createProviderCard } from './ProviderCard.js';

/**
 * Mounts the Integrations Panel into the given container element.
 *
 * @param {HTMLElement} container - Target mount point (#integrations-panel)
 * @returns {void}
 */
export function mountIntegrationsPanel(container) {
  // TODO(impl-batch): fetch real connection states from /api/integrations/status
  // TODO(impl-batch): implement configure / disconnect event delegation
  // TODO(impl-batch): user-owned binding section (per-user channel model)

  container.innerHTML = `
    <div class="panel integrations-panel">
      <div class="panel__header">
        <span class="panel__title">Integrations</span>
      </div>
      <div class="panel__body" id="integrations-card-list">
        <!-- Provider cards injected below -->
      </div>
    </div>
  `;

  const list = container.querySelector('#integrations-card-list');

  for (const provider of PROVIDERS) {
    // Stub: all providers default to 'unbound' until impl-batch wires API
    const card = createProviderCard(provider, 'unbound');
    list.appendChild(card);
  }
}
