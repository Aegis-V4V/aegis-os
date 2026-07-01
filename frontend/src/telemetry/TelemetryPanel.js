// Aegis OS | Telemetry Panel — Root Panel Stub
// STUB: structure only. Reads from telemetry-client read contract.
// See docs/aegis-os-integrations-spec.md §4

import { fetchTelemetryRollup } from './telemetry-client.js';

const PERIODS = ['24h', '7d', '30d'];

/**
 * Mounts the Telemetry Panel into the given container element.
 *
 * @param {HTMLElement} container - Target mount point (#telemetry-panel)
 * @returns {void}
 */
export function mountTelemetryPanel(container) {
  // TODO(impl-batch): activate real fetch in telemetry-client.js
  // TODO(impl-batch): add period selector tab event listeners
  // TODO(impl-batch): auto-refresh interval (optional)

  container.innerHTML = `
    <div class="panel telemetry-panel">
      <div class="panel__header">
        <span class="panel__title">Telemetry</span>
        <div class="period-selector" id="telemetry-period-selector">
          ${PERIODS.map((p, i) =>
            `<button class="btn btn--sm period-btn ${i === 0 ? 'period-btn--active' : ''}"
                     data-period="${p}" disabled>${p}</button>`
          ).join('')}
        </div>
      </div>
      <div class="panel__body" id="telemetry-body">
        <!-- Populated by renderTelemetry() -->
      </div>
    </div>
  `;

  renderTelemetry(container, null); // stub: null = unavailable
}

/**
 * Renders telemetry data or an unavailable/empty placeholder.
 *
 * @param {HTMLElement} container
 * @param {import('./telemetry-client.js').TelemetryRollup|null} data
 */
function renderTelemetry(container, data) {
  const body = container.querySelector('#telemetry-body');
  if (!body) return;

  if (!data) {
    body.innerHTML = '<div class="telemetry-placeholder">Telemetry service unavailable.</div>';
    return;
  }

  const costDisplay = data.estimated_cost_usd !== null
    ? `$${data.estimated_cost_usd.toFixed(4)}`
    : '—';

  const modelRows = (data.models || [])
    .map(m => `<div class="telemetry-model-row">
      <span class="telemetry-model-name">${m.name}</span>
      <span>${m.calls} calls</span>
      <span>${(m.tokens / 1000).toFixed(1)}k tokens</span>
    </div>`)
    .join('');

  body.innerHTML = `
    <div class="telemetry-summary">
      <div class="telemetry-stat">
        <span class="telemetry-stat__label">LLM Calls</span>
        <span class="telemetry-stat__value">${data.llm_calls.toLocaleString()}</span>
      </div>
      <div class="telemetry-stat">
        <span class="telemetry-stat__label">Total Tokens</span>
        <span class="telemetry-stat__value">${(data.total_tokens.input + data.total_tokens.output).toLocaleString()}</span>
        <span class="telemetry-stat__sub">in: ${(data.total_tokens.input/1000).toFixed(1)}k / out: ${(data.total_tokens.output/1000).toFixed(1)}k</span>
      </div>
      <div class="telemetry-stat">
        <span class="telemetry-stat__label">Est. Cost</span>
        <span class="telemetry-stat__value">${costDisplay}</span>
      </div>
    </div>
    <div class="telemetry-models">
      <div class="telemetry-section-label">By Model</div>
      ${modelRows || '<div class="telemetry-placeholder">No model data.</div>'}
    </div>
  `;
}

/**
 * Refreshes telemetry for the given period.
 * Called by period selector tab handler (impl-batch).
 *
 * @param {HTMLElement} container
 * @param {import('./telemetry-client.js').TelemetryPeriod} period
 * @returns {Promise<void>}
 */
export async function refreshTelemetry(container, period) {
  const data = await fetchTelemetryRollup(period);
  renderTelemetry(container, data);
}
