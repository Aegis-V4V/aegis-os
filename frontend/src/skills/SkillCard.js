// Aegis OS | Skills Panel — Skill Card Stub
// STUB: structure only. No toggle/install implementation.
// See docs/aegis-os-integrations-spec.md §3.3

/**
 * Creates a skill row DOM element.
 *
 * @param {import('./skills-config.js').Skill} skill
 * @returns {HTMLElement}
 */
export function createSkillCard(skill) {
  // TODO(impl-batch): wire toggle to POST /api/skills/toggle
  // TODO(impl-batch): open markdown modal viewer for reference-only skills
  // TODO(impl-batch): unlock flow for proprietary skills requiring entitlement

  const card = document.createElement('div');
  card.className = 'skill-card';
  card.dataset.skillName = skill.name;
  card.dataset.license = skill.license;

  const isReferenceOnly = skill.license === 'unknown';
  const isLocked = skill.license === 'proprietary' && !skill.enabled;

  let controlHtml = '';
  if (isReferenceOnly) {
    controlHtml = '<button class="btn btn--sm" data-action="view-skill" disabled>View Only</button>';
  } else if (isLocked) {
    controlHtml = '<button class="btn btn--sm btn--locked" data-action="unlock-skill" disabled>🔒 Locked</button>';
  } else {
    controlHtml = `
      <button class="btn btn--sm btn--toggle" data-action="toggle-skill">
        ${skill.enabled ? 'Disable' : 'Enable'}
      </button>
    `;
  }

  card.innerHTML = `
    <div class="skill-card__indicator ${skill.enabled ? 'indicator--active' : 'indicator--inactive'}"></div>
    <div class="skill-card__info">
      <span class="skill-card__name">${skill.name}</span>
      <span class="skill-card__version">v${skill.version}</span>
      <span class="skill-card__license license--${skill.license}">${skill.license}</span>
      ${isReferenceOnly ? '<span class="skill-card__ref-badge">⚠️ Reference Only</span>' : ''}
    </div>
    <div class="skill-card__controls">${controlHtml}</div>
  `;

  return card;
}
