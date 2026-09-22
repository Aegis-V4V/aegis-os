/**
 * Aegis OS - Podcasting 2.0 Namespace Strict V4V & Metadata Payload Validator
 * 
 * Strict, headless XML validation engine for Podcasting 2.0 namespace:
 * - Extracts and strictly validates <podcast:value> and <podcast:valueRecipient>
 * - Invariant: Split integers must strictly sum to 100% (underflows and overflows flagged)
 * - Address validation: 66-character hex for 'node', valid lightning/LNURL syntax for 'lnurl'
 * - Metadata payload probes: Verifies <podcast:chapters> and <podcast:transcript> URLs return HTTP 200 with valid content headers
 */

const { XMLParser } = require('fast-xml-parser');

const NODE_PUBKEY_REGEX = /^[0-9a-fA-F]{66}$/;
const LIGHTNING_ADDRESS_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const LNURL_BECH32_REGEX = /^lnurl1[02-9ac-hj-np-z]+$/i;
const HTTP_URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

const VALID_CHAPTER_MIME_TYPES = [
  'application/json+chapters',
  'application/json',
  'text/json'
];

const VALID_TRANSCRIPT_MIME_TYPES = [
  'text/vtt',
  'application/srt',
  'application/x-subrip',
  'text/html',
  'application/json',
  'text/plain',
  'application/xml',
  'text/xml'
];

/**
 * Creates and returns configured XMLParser instance.
 */
function createParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
  });
}

/**
 * Validates a single recipient address based on its type.
 * @param {string} type - 'node' or 'lnurl'
 * @param {string} address - The destination address
 * @returns {{ valid: boolean, error?: string }}
 */
function validateRecipientAddress(type, address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Recipient address is required and must be a string' };
  }

  const normalizedType = (type || '').toLowerCase().trim();

  if (normalizedType === 'node') {
    if (!NODE_PUBKEY_REGEX.test(address)) {
      return {
        valid: false,
        error: `Invalid node address "${address}": must be exactly 66-character hexadecimal string`
      };
    }
    return { valid: true };
  }

  if (normalizedType === 'lnurl') {
    const isLnAddress = LIGHTNING_ADDRESS_REGEX.test(address);
    const isLnurlBech32 = LNURL_BECH32_REGEX.test(address);
    const isHttpUrl = HTTP_URL_REGEX.test(address);

    if (!isLnAddress && !isLnurlBech32 && !isHttpUrl) {
      return {
        valid: false,
        error: `Invalid lnurl address "${address}": must be a valid Lightning Address (name@domain), bech32 LNURL (lnurl1...), or HTTPS endpoint`
      };
    }
    return { valid: true };
  }

  return {
    valid: false,
    error: `Unsupported recipient type "${type}": expected 'node' or 'lnurl'`
  };
}

/**
 * Validates a <podcast:value> block and its child <podcast:valueRecipient> entries.
 * Enforces the invariant that integer splits must strictly sum to 100%.
 * @param {object} valueBlock - Parsed <podcast:value> node
 * @param {string} context - 'channel' or item description
 * @returns {{ valid: boolean, totalSplit: number, recipients: Array, errors: Array<string> }}
 */
function validateValueBlock(valueBlock, context = 'feed') {
  const errors = [];
  const recipients = [];

  if (!valueBlock || typeof valueBlock !== 'object') {
    errors.push(`[${context}] Invalid or empty podcast:value block`);
    return { valid: false, totalSplit: 0, recipients, errors };
  }

  const rawRecipients = valueBlock['podcast:valueRecipient'];
  if (!rawRecipients) {
    errors.push(`[${context}] podcast:value has no podcast:valueRecipient entries`);
    return { valid: false, totalSplit: 0, recipients, errors };
  }

  const recipientList = Array.isArray(rawRecipients) ? rawRecipients : [rawRecipients];
  let totalSplit = 0;

  for (let i = 0; i < recipientList.length; i++) {
    const r = recipientList[i];
    const name = r['@_name'] || `recipient_${i + 1}`;
    const type = r['@_type'];
    const address = r['@_address'];
    const splitRaw = r['@_split'];

    // Split integer validation
    const splitNum = Number(splitRaw);
    if (splitRaw === undefined || splitRaw === null || splitRaw === '' || !Number.isInteger(splitNum) || splitNum <= 0) {
      errors.push(`[${context}] Recipient "${name}" has invalid split value "${splitRaw}": must be a positive integer`);
    } else {
      totalSplit += splitNum;
    }

    // Address format validation
    const addrValidation = validateRecipientAddress(type, address);
    if (!addrValidation.valid) {
      errors.push(`[${context}] Recipient "${name}": ${addrValidation.error}`);
    }

    recipients.push({
      name,
      type,
      address,
      split: splitNum,
      fee: r['@_fee'] === true || r['@_fee'] === 'true'
    });
  }

  // Strict Split Sum Invariant Check: Must sum strictly to 100%
  if (totalSplit < 100) {
    errors.push(`[${context}] Split underflow: total split is ${totalSplit}%, must strictly sum to 100%`);
  } else if (totalSplit > 100) {
    errors.push(`[${context}] Split overflow: total split is ${totalSplit}%, must strictly sum to 100%`);
  }

  return {
    valid: errors.length === 0,
    totalSplit,
    recipients,
    errors
  };
}

/**
 * Extracts and strictly validates all <podcast:value> elements in an RSS feed XML.
 * Checks channel level and item level value blocks.
 * @param {string|object} xmlOrJson - XML string or parsed RSS JSON object
 * @returns {{ valid: boolean, errors: Array<string>, valueBlocks: Array<object> }}
 */
function validateV4V(xmlOrJson) {
  let jsonObj = xmlOrJson;
  if (typeof xmlOrJson === 'string') {
    const parser = createParser();
    try {
      jsonObj = parser.parse(xmlOrJson);
    } catch (err) {
      return {
        valid: false,
        errors: [`XML Parse error: ${err.message}`],
        valueBlocks: []
      };
    }
  }

  if (!jsonObj || !jsonObj.rss || !jsonObj.rss.channel) {
    return {
      valid: false,
      errors: ['Invalid RSS structure: missing <rss><channel>'],
      valueBlocks: []
    };
  }

  const channel = jsonObj.rss.channel;
  const errors = [];
  const valueBlocks = [];

  // Channel-level value block
  if (channel['podcast:value']) {
    const channelValues = Array.isArray(channel['podcast:value'])
      ? channel['podcast:value']
      : [channel['podcast:value']];

    for (let idx = 0; idx < channelValues.length; idx++) {
      const vbResult = validateValueBlock(channelValues[idx], `channel[${idx}]`);
      valueBlocks.push({ scope: 'channel', index: idx, ...vbResult });
      if (!vbResult.valid) {
        errors.push(...vbResult.errors);
      }
    }
  }

  // Item-level value blocks
  const items = channel.item
    ? (Array.isArray(channel.item) ? channel.item : [channel.item])
    : [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const itemTitle = item.title || item.guid || `item_${i}`;

    if (item['podcast:value']) {
      const itemValues = Array.isArray(item['podcast:value'])
        ? item['podcast:value']
        : [item['podcast:value']];

      for (let idx = 0; idx < itemValues.length; idx++) {
        const vbResult = validateValueBlock(itemValues[idx], `item[${i}]: "${itemTitle}"`);
        valueBlocks.push({ scope: 'item', itemIndex: i, itemTitle, ...vbResult });
        if (!vbResult.valid) {
          errors.push(...vbResult.errors);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    valueBlocks
  };
}

/**
 * Extracts <podcast:chapters> and <podcast:transcript> entries from RSS XML or object.
 * @param {string|object} xmlOrJson 
 * @returns {{ chapters: Array<object>, transcripts: Array<object> }}
 */
function extractMetadataPayloads(xmlOrJson) {
  let jsonObj = xmlOrJson;
  if (typeof xmlOrJson === 'string') {
    const parser = createParser();
    jsonObj = parser.parse(xmlOrJson);
  }

  if (!jsonObj || !jsonObj.rss || !jsonObj.rss.channel) {
    return { chapters: [], transcripts: [] };
  }

  const channel = jsonObj.rss.channel;
  const chapters = [];
  const transcripts = [];

  function collectFrom(container, context) {
    if (!container) return;

    if (container['podcast:chapters']) {
      const chList = Array.isArray(container['podcast:chapters'])
        ? container['podcast:chapters']
        : [container['podcast:chapters']];
      for (const ch of chList) {
        if (ch && ch['@_url']) {
          chapters.push({
            url: ch['@_url'],
            type: ch['@_type'] || 'application/json+chapters',
            context
          });
        }
      }
    }

    if (container['podcast:transcript']) {
      const trList = Array.isArray(container['podcast:transcript'])
        ? container['podcast:transcript']
        : [container['podcast:transcript']];
      for (const tr of trList) {
        if (tr && tr['@_url']) {
          transcripts.push({
            url: tr['@_url'],
            type: tr['@_type'] || 'text/vtt',
            language: tr['@_language'],
            rel: tr['@_rel'],
            context
          });
        }
      }
    }
  }

  collectFrom(channel, 'channel');

  const items = channel.item
    ? (Array.isArray(channel.item) ? channel.item : [channel.item])
    : [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item) {
      collectFrom(item, `item[${i}]`);
    }
  }

  return { chapters, transcripts };
}

/**
 * Probes a metadata URL (chapters or transcript) to verify HTTP 200 and valid content header.
 * @param {string} url - Target URL
 * @param {'chapters'|'transcript'} kind - Metadata kind
 * @param {object} options - Options including timeout, custom fetcher
 * @returns {Promise<{ valid: boolean, url: string, status?: number, contentType?: string, error?: string }>}
 */
async function probeMetadataUrl(url, kind, options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 5000;

  if (!url || typeof url !== 'string') {
    return { valid: false, url, error: 'Missing or invalid URL' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchFn(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Aegis-OS-V4V-Validator/1.0',
          ...(options.headers || {})
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status !== 200) {
      return {
        valid: false,
        url,
        status: response.status,
        error: `Expected HTTP 200 but received HTTP ${response.status}`
      };
    }

    const contentTypeHeader = response.headers.get ? response.headers.get('content-type') : response.headers['content-type'];
    const contentType = (contentTypeHeader || '').toLowerCase();

    if (!contentType) {
      return {
        valid: false,
        url,
        status: response.status,
        error: 'Missing Content-Type response header'
      };
    }

    // Header validation based on kind
    if (kind === 'chapters') {
      const isExpectedMime = VALID_CHAPTER_MIME_TYPES.some(m => contentType.includes(m))
        || (options.expectedType && contentType.includes(options.expectedType.toLowerCase()));
      if (!isExpectedMime) {
        return {
          valid: false,
          url,
          status: response.status,
          contentType,
          error: `Invalid Content-Type "${contentType}" for podcast:chapters (expected application/json+chapters or application/json)`
        };
      }
    } else if (kind === 'transcript') {
      const isExpectedMime = VALID_TRANSCRIPT_MIME_TYPES.some(m => contentType.includes(m))
        || (options.expectedType && contentType.includes(options.expectedType.toLowerCase()));
      if (!isExpectedMime) {
        return {
          valid: false,
          url,
          status: response.status,
          contentType,
          error: `Invalid Content-Type "${contentType}" for podcast:transcript (expected text/vtt, application/srt, text/html, etc.)`
        };
      }
    }

    return {
      valid: true,
      url,
      status: response.status,
      contentType
    };
  } catch (err) {
    return {
      valid: false,
      url,
      error: `Network probe failed: ${err.message}`
    };
  }
}

/**
 * Probes all <podcast:chapters> and <podcast:transcript> entries in feed XML.
 * @param {string|object} xmlOrJson 
 * @param {object} options 
 * @returns {Promise<{ valid: boolean, chapters: Array<object>, transcripts: Array<object>, errors: Array<string> }>}
 */
async function probeMetadataPayloads(xmlOrJson, options = {}) {
  const { chapters, transcripts } = extractMetadataPayloads(xmlOrJson);
  const errors = [];
  const chapterResults = [];
  const transcriptResults = [];

  for (const ch of chapters) {
    const res = await probeMetadataUrl(ch.url, 'chapters', {
      expectedType: ch.type,
      ...options
    });
    chapterResults.push({ ...ch, ...res });
    if (!res.valid) {
      errors.push(`[${ch.context}] Chapters probe failed for ${ch.url}: ${res.error}`);
    }
  }

  for (const tr of transcripts) {
    const res = await probeMetadataUrl(tr.url, 'transcript', {
      expectedType: tr.type,
      ...options
    });
    transcriptResults.push({ ...tr, ...res });
    if (!res.valid) {
      errors.push(`[${tr.context}] Transcript probe failed for ${tr.url}: ${res.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    chapters: chapterResults,
    transcripts: transcriptResults,
    errors
  };
}

/**
 * Unified feed validation function checking both strict V4V rules and metadata probes.
 * @param {string} xmlString 
 * @param {object} options 
 * @returns {Promise<{ valid: boolean, v4v: object, metadata: object, errors: Array<string> }>}
 */
async function validateFeedXml(xmlString, options = {}) {
  const v4vResult = validateV4V(xmlString);
  let metadataResult = { valid: true, chapters: [], transcripts: [], errors: [] };

  if (options.probeMetadata !== false) {
    metadataResult = await probeMetadataPayloads(xmlString, options);
  }

  const allErrors = [...v4vResult.errors, ...metadataResult.errors];

  return {
    valid: allErrors.length === 0,
    v4v: v4vResult,
    metadata: metadataResult,
    errors: allErrors
  };
}

module.exports = {
  createParser,
  validateRecipientAddress,
  validateValueBlock,
  validateV4V,
  extractMetadataPayloads,
  probeMetadataUrl,
  probeMetadataPayloads,
  validateFeedXml,
  NODE_PUBKEY_REGEX,
  LIGHTNING_ADDRESS_REGEX,
  LNURL_BECH32_REGEX
};
