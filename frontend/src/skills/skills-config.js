// Aegis OS | Skills Panel — Local Skill List Loader Stub
// STUB: reads from a local JSON manifest. No network fetch.
// See docs/aegis-os-integrations-spec.md §3

/**
 * @typedef {Object} Skill
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {'MIT'|'proprietary'|'unknown'} license
 * @property {boolean} enabled
 * @property {string[]} tags
 */

/**
 * Returns the local skill list.
 * TODO(impl-batch): read from /api/skills endpoint.
 *
 * @returns {Skill[]}
 */
export function getLocalSkills() {
  // Stub data — replace with API call in implementation batch
  return [
    {
      name: 'web-search',
      version: '1.2.0',
      description: 'Search the web and return summarized results.',
      license: 'MIT',
      enabled: true,
      tags: ['search', 'web'],
    },
    {
      name: 'pubmed-fetch',
      version: '1.0.0',
      description: 'Fetch and parse PubMed abstracts by PMID or query.',
      license: 'MIT',
      enabled: true,
      tags: ['science', 'literature'],
    },
    {
      name: 'keygen-lookup',
      version: '0.9.0',
      description: 'Keygen license validation skill.',
      license: 'proprietary',
      enabled: false,
      tags: ['licensing'],
    },
    {
      name: 'legacy-parser',
      version: '0.1.0',
      description: 'Legacy document parser — reference only.',
      license: 'unknown',
      enabled: false,
      tags: ['legacy'],
    },
  ];
}
