// Aegis OS | Skills Panel — Root Panel Stub
// STUB: mounts skill cards, exposes install slot.
// See docs/aegis-os-integrations-spec.md §3

import { getLocalSkills } from './skills-config.js';
import { createSkillCard } from './SkillCard.js';

/**
 * Mounts the Skills Panel into the given container element.
 *
 * @param {HTMLElement} container - Target mount point (#skills-panel)
 * @returns {void}
 */
export function mountSkillsPanel(container) {
  // TODO(impl-batch): replace getLocalSkills() with fetch('/api/skills')
  // TODO(impl-batch): implement install file picker handler
  // TODO(impl-batch): implement toggle event delegation

  container.innerHTML = `
    <div class="panel skills-panel">
      <div class="panel__header">
        <span class="panel__title">Skills</span>
        <button class="btn btn--sm btn--primary" id="skills-install-btn" disabled>
          + Install
        </button>
      </div>
      <div class="panel__body" id="skills-active-list">
        <!-- Active/locked skills injected below -->
      </div>
      <div class="panel__section-header">Reference Only</div>
      <div class="panel__body" id="skills-reference-list">
        <!-- Reference-only skills injected below -->
      </div>
    </div>
  `;

  const skills = getLocalSkills();
  const activeList = container.querySelector('#skills-active-list');
  const referenceList = container.querySelector('#skills-reference-list');

  for (const skill of skills) {
    const card = createSkillCard(skill);
    if (skill.license === 'unknown') {
      referenceList.appendChild(card);
    } else {
      activeList.appendChild(card);
    }
  }
}
