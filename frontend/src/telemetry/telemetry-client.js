// Aegis OS | Telemetry Panel — Read Contract Client Stub
// STUB: defines the read contract only. Does NOT emit telemetry.
// Emitter lives in existing backend telemetry source — do NOT duplicate.
// See docs/aegis-os-integrations-spec.md §4

/**
 * @typedef {'24h'|'7d'|'30d'} TelemetryPeriod
 *
 * @typedef {Object} ModelUsage
 * @property {string} name
 * @property {number} calls
 * @property {number} tokens
 *
 * @typedef {Object} TelemetryRollup
 * @property {TelemetryPeriod} period
 * @property {number} llm_calls
 * @property {{ input: number, output: number }} total_tokens
 * @property {ModelUsage[]} models
 * @property {number|null} estimated_cost_usd
 */

const TELEMETRY_ENDPOINT = '/api/telemetry/rollup';

/**
 * Fetches the LLM usage rollup from the T1 telemetry emitter.
 * Returns null if the emitter is unavailable.
 *
 * @param {TelemetryPeriod} period
 * @returns {Promise<TelemetryRollup|null>}
 */
export async function fetchTelemetryRollup(period = '24h') {
  // TODO(impl-batch): remove stub return and activate real fetch
  // Stub: return null so panel renders "unavailable" placeholder
  void period;
  return null;

  /* Real implementation (activate in impl-batch):
  try {
    const res = await fetch(`${TELEMETRY_ENDPOINT}?period=${period}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
  */
}
