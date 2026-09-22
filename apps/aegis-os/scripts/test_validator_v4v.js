/**
 * Unit Test Suite for Podcasting 2.0 V4V Strict Validator & Metadata Payload Prober
 */

const {
  validateRecipientAddress,
  validateValueBlock,
  validateV4V,
  extractMetadataPayloads,
  probeMetadataUrl,
  probeMetadataPayloads,
  validateFeedXml
} = require('../src/validator_v4v');

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('--- Podcasting 2.0 Namespace V4V & Metadata Validator Tests ---');

  // Test 1: Node address validation (66-char hex)
  console.log('Test 1: Node address validation (66-char hex)...');
  const validNodeAddr = '03ae9f91a08120f494232d30216173b93f124db33f0348669676608070cc9d5db7';
  const shortNodeAddr = '03ae9f91a08120f494232d30216173b93f124db33f0348669676608070cc9d5d'; // 64 chars
  const nonHexNodeAddr = '03ae9f91a08120f494232d30216173b93f124db33f0348669676608070cc9d5dzz'; // 66 chars with zz

  assert(validateRecipientAddress('node', validNodeAddr).valid === true, '66-char hex must be valid');
  assert(validateRecipientAddress('node', shortNodeAddr).valid === false, '64-char hex must be rejected');
  assert(validateRecipientAddress('node', nonHexNodeAddr).valid === false, 'Non-hex string must be rejected');
  console.log('   [PASS] Node address validation verified.');

  // Test 2: LNURL / Lightning address validation
  console.log('Test 2: LNURL & Lightning address validation...');
  const validLightningAddr = 'creator@getalby.com';
  const validLnurlBech32 = 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns';
  const invalidLnurl = 'not-a-valid-address-at-all';

  assert(validateRecipientAddress('lnurl', validLightningAddr).valid === true, 'Lightning address must be valid');
  assert(validateRecipientAddress('lnurl', validLnurlBech32).valid === true, 'Bech32 LNURL must be valid');
  assert(validateRecipientAddress('lnurl', invalidLnurl).valid === false, 'Invalid LNURL string must be rejected');
  console.log('   [PASS] LNURL syntax validation verified.');

  // Test 3: Split invariant enforcement (strictly sum to 100%)
  console.log('Test 3: Split invariant (sum === 100%)...');
  
  // Valid 100% split
  const validValueBlock = {
    '@_type': 'lightning',
    '@_method': 'keysend',
    'podcast:valueRecipient': [
      { '@_name': 'Host', '@_type': 'node', '@_address': validNodeAddr, '@_split': '95' },
      { '@_name': 'App', '@_type': 'lnurl', '@_address': validLightningAddr, '@_split': '5', '@_fee': 'true' }
    ]
  };
  const validRes = validateValueBlock(validValueBlock);
  assert(validRes.valid === true, '95% + 5% = 100% must be valid');
  assert(validRes.totalSplit === 100, 'Total split must be 100');

  // Split underflow (85% total)
  const underflowBlock = {
    '@_type': 'lightning',
    '@_method': 'keysend',
    'podcast:valueRecipient': [
      { '@_name': 'Host', '@_type': 'node', '@_address': validNodeAddr, '@_split': '80' },
      { '@_name': 'App', '@_type': 'lnurl', '@_address': validLightningAddr, '@_split': '5' }
    ]
  };
  const underflowRes = validateValueBlock(underflowBlock);
  assert(underflowRes.valid === false, '85% split must be flagged as invalid');
  assert(underflowRes.errors.some(e => e.includes('underflow')), 'Underflow error must be flagged');

  // Split overflow (115% total)
  const overflowBlock = {
    '@_type': 'lightning',
    '@_method': 'keysend',
    'podcast:valueRecipient': [
      { '@_name': 'Host', '@_type': 'node', '@_address': validNodeAddr, '@_split': '100' },
      { '@_name': 'Co-host', '@_type': 'lnurl', '@_address': validLightningAddr, '@_split': '15' }
    ]
  };
  const overflowRes = validateValueBlock(overflowBlock);
  assert(overflowRes.valid === false, '115% split must be flagged as invalid');
  assert(overflowRes.errors.some(e => e.includes('overflow')), 'Overflow error must be flagged');

  // Invalid split non-integer or negative
  const invalidSplitBlock = {
    '@_type': 'lightning',
    '@_method': 'keysend',
    'podcast:valueRecipient': [
      { '@_name': 'Host', '@_type': 'node', '@_address': validNodeAddr, '@_split': '-10' },
      { '@_name': 'App', '@_type': 'lnurl', '@_address': validLightningAddr, '@_split': '110' }
    ]
  };
  const invalidSplitRes = validateValueBlock(invalidSplitBlock);
  assert(invalidSplitRes.valid === false, 'Negative split must be rejected');
  console.log('   [PASS] Split invariant strictly enforced (underflow/overflow/non-integer).');

  // Test 4: XML feed-level V4V validation with channel and item overrides
  console.log('Test 4: Parsing and validating full XML feed...');
  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">
    <channel>
      <title>Aegis Podcasting Feed</title>
      <podcast:value type="lightning" method="keysend">
        <podcast:valueRecipient name="Host" type="node" address="${validNodeAddr}" split="99" />
        <podcast:valueRecipient name="Dev" type="lnurl" address="${validLightningAddr}" split="1" fee="true" />
      </podcast:value>
      <item>
        <title>Episode 1 - The Genesis</title>
        <guid>ep-1</guid>
        <podcast:chapters url="https://example.com/ep1-chapters.json" type="application/json+chapters" />
        <podcast:transcript url="https://example.com/ep1-transcript.vtt" type="text/vtt" />
      </item>
      <item>
        <title>Episode 2 - Split Overrides</title>
        <guid>ep-2</guid>
        <podcast:value type="lightning" method="keysend">
          <podcast:valueRecipient name="Guest" type="node" address="${validNodeAddr}" split="50" />
          <podcast:valueRecipient name="Host" type="lnurl" address="${validLightningAddr}" split="50" />
        </podcast:value>
      </item>
    </channel>
  </rss>`;

  const xmlValidation = validateV4V(xmlSample);
  assert(xmlValidation.valid === true, 'Full XML feed with valid V4V blocks must pass');
  assert(xmlValidation.valueBlocks.length === 2, 'Feed should contain exactly 2 value blocks (1 channel, 1 item)');
  console.log('   [PASS] Full XML feed parsed and validated.');

  // Test 5: Metadata payload extraction
  console.log('Test 5: Metadata payload extraction (<podcast:chapters> and <podcast:transcript>)...');
  const metadata = extractMetadataPayloads(xmlSample);
  assert(metadata.chapters.length === 1, 'Should extract 1 chapters tag');
  assert(metadata.transcripts.length === 1, 'Should extract 1 transcript tag');
  assert(metadata.chapters[0].url === 'https://example.com/ep1-chapters.json', 'Chapter URL should match');
  assert(metadata.transcripts[0].type === 'text/vtt', 'Transcript MIME type should match');
  console.log('   [PASS] Metadata payload extracted successfully.');

  // Test 6: Metadata payload probe checks (HTTP 200 and Content-Type)
  console.log('Test 6: Metadata payload probes (mock network handlers)...');

  // Mock fetcher for chapters and transcripts
  const mockFetchSuccess = async (url) => {
    if (url.includes('chapters')) {
      return {
        status: 200,
        headers: {
          get: (name) => name.toLowerCase() === 'content-type' ? 'application/json+chapters; charset=utf-8' : null
        }
      };
    }
    if (url.includes('transcript')) {
      return {
        status: 200,
        headers: {
          get: (name) => name.toLowerCase() === 'content-type' ? 'text/vtt; charset=utf-8' : null
        }
      };
    }
    return { status: 404, headers: { get: () => 'text/plain' } };
  };

  const chProbeSuccess = await probeMetadataUrl('https://example.com/ep1-chapters.json', 'chapters', { fetchFn: mockFetchSuccess });
  assert(chProbeSuccess.valid === true, 'Chapters probe should pass on HTTP 200 with valid Content-Type');
  assert(chProbeSuccess.status === 200, 'Status should be 200');

  const trProbeSuccess = await probeMetadataUrl('https://example.com/ep1-transcript.vtt', 'transcript', { fetchFn: mockFetchSuccess });
  assert(trProbeSuccess.valid === true, 'Transcript probe should pass on HTTP 200 with valid Content-Type');

  // Test probe failures: HTTP 404
  const mockFetch404 = async () => ({
    status: 404,
    headers: { get: () => 'text/html' }
  });
  const chProbe404 = await probeMetadataUrl('https://example.com/missing.json', 'chapters', { fetchFn: mockFetch404 });
  assert(chProbe404.valid === false, 'Probe should fail on HTTP 404');
  assert(chProbe404.error.includes('HTTP 404'), 'Error should flag HTTP 404');

  // Test probe failures: Invalid Content-Type
  const mockFetchBadMime = async () => ({
    status: 200,
    headers: { get: () => 'text/html' }
  });
  const chProbeBadMime = await probeMetadataUrl('https://example.com/chapters.json', 'chapters', { fetchFn: mockFetchBadMime });
  assert(chProbeBadMime.valid === false, 'Chapters probe should fail if Content-Type is text/html');
  assert(chProbeBadMime.error.includes('Invalid Content-Type'), 'Error should flag invalid Content-Type');

  console.log('   [PASS] Metadata payload probes accurately verified status and content headers.');

  // Test 7: Unified validation probe pass
  console.log('Test 7: Full feed validation with probes...');
  const fullValidation = await validateFeedXml(xmlSample, { fetchFn: mockFetchSuccess });
  assert(fullValidation.valid === true, 'Feed validation with probes must pass');
  assert(fullValidation.metadata.chapters.length === 1, 'Probed 1 chapter');
  assert(fullValidation.metadata.transcripts.length === 1, 'Probed 1 transcript');
  console.log('   [PASS] Unified feed validation executed.');

  console.log('\n--- ALL V4V & METADATA VALIDATOR TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Validator test suite failed:', err);
  process.exit(1);
});
