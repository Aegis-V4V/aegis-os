// Aegis OS | Integrations Panel — Provider Registry
// STUB: static list only. No live auth, no tokens.
// See docs/aegis-os-integrations-spec.md §1.1

/**
 * @typedef {Object} Provider
 * @property {string} id          - Unique provider slug
 * @property {string} name        - Display name
 * @property {string} logoUrl     - Path to provider logo asset
 * @property {'active'|'placeholder'} availability
 * @property {string[]} scopes    - Minimum required bot scopes (reference only)
 */

/** @type {Provider[]} */
export const PROVIDERS = [
  {
    id: 'discord',
    name: 'Discord',
    logoUrl: '/assets/icons/discord.svg',
    availability: 'active',
    scopes: ['read_messages', 'send_messages', 'view_channels'],
  },
  {
    id: 'slack',
    name: 'Slack',
    logoUrl: '/assets/icons/slack.svg',
    availability: 'placeholder',
    scopes: [],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    logoUrl: '/assets/icons/telegram.svg',
    availability: 'placeholder',
    scopes: [],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    logoUrl: '/assets/icons/matrix.svg',
    availability: 'placeholder',
    scopes: [],
  },
  {
    id: 'stoat',
    name: 'Stoat',
    logoUrl: '/assets/icons/stoat.svg',
    availability: 'placeholder',
    scopes: [],
  },
];
