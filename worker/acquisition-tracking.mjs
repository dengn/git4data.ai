/**
 * Privacy-preserving acquisition tracking for git4data.ai.
 * 
 * Normalizes UTM parameters and referrers to allowlisted categories.
 * Never stores raw query strings, full URLs, IPs, or user identifiers.
 */

// Allowlisted UTM sources
const ALLOWED_SOURCES = new Set([
  'x', 'twitter', 'linkedin', 'reddit', 'substack', 'hackernoon', 'v2ex',
  'hn', 'slack', 'discord', 'newsletter', 'github', 'email',
  // Community-specific Slack channels
  'slack-postgres', 'slack-datatalks', 'slack-mlops',
  // Community-specific Discord servers
  'discord-latentspace', 'discord-llamaindex', 'discord-duckdb', 'discord-langchain',
  // Additional platforms
  'mo-blog', 'linux-do', 'juejin', 'modb'
]);

// Allowlisted UTM mediums
const ALLOWED_MEDIUMS = new Set([
  'social', 'community', 'article', 'comment', 'newsletter', 'referral', 'email', 'profile'
]);

// Campaign slug pattern: lowercase alphanumeric + hyphens, max 50 chars
const CAMPAIGN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
const MAX_CAMPAIGN_LENGTH = 50;

// Referrer hostname to category mapping
const REFERRER_MAP = {
  'x.com': 'x',
  'twitter.com': 'x',
  'linkedin.com': 'linkedin',
  'reddit.com': 'reddit',
  'substack.com': 'substack',
  'hackernoon.com': 'hackernoon',
  'v2ex.com': 'v2ex',
  'news.ycombinator.com': 'hn',
  'github.com': 'github',
  'google.com': 'search',
  'google.co.uk': 'search',
  'google.co.jp': 'search',
  'google.de': 'search',
  'google.fr': 'search',
  'bing.com': 'search',
  'duckduckgo.com': 'search',
  'baidu.com': 'search',
};

/**
 * Normalizes a UTM source value to an allowlisted category.
 * @param {string} value - Raw UTM source value
 * @returns {string} Normalized source ('other' if not allowlisted)
 */
export function normalizeSource(value) {
  if (!value || typeof value !== 'string') return 'other';
  const normalized = value.toLowerCase().trim();
  return ALLOWED_SOURCES.has(normalized) ? normalized : 'other';
}

/**
 * Normalizes a UTM medium value to an allowlisted category.
 * @param {string} value - Raw UTM medium value
 * @returns {string} Normalized medium ('other' if not allowlisted)
 */
export function normalizeMedium(value) {
  if (!value || typeof value !== 'string') return 'other';
  const normalized = value.toLowerCase().trim();
  return ALLOWED_MEDIUMS.has(normalized) ? normalized : 'other';
}

/**
 * Normalizes a UTM campaign value to a safe slug pattern.
 * @param {string} value - Raw UTM campaign value
 * @returns {string} Normalized campaign ('other' if invalid)
 */
export function normalizeCampaign(value) {
  if (!value || typeof value !== 'string') return 'other';
  const trimmed = value.trim();
  if (trimmed.length > MAX_CAMPAIGN_LENGTH) return 'other';
  // Only accept values that are already lowercase alphanumeric with hyphens
  if (!CAMPAIGN_PATTERN.test(trimmed)) return 'other';
  return trimmed;
}

/**
 * Categorizes a referrer hostname to a coarse category.
 * @param {string} referrer - Full referrer URL
 * @returns {string} Referrer category ('direct', 'other', or specific platform)
 */
export function categorizeReferrer(referrer) {
  if (!referrer || typeof referrer !== 'string' || !referrer.trim()) {
    return 'direct';
  }

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    // Check for exact match first
    if (REFERRER_MAP[hostname]) {
      return REFERRER_MAP[hostname];
    }
    
    // Check for subdomain matches (e.g., www.linkedin.com)
    for (const [domain, category] of Object.entries(REFERRER_MAP)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return category;
      }
    }
    
    return 'other';
  } catch (e) {
    // Invalid URL
    return 'other';
  }
}

/**
 * Extracts and normalizes acquisition parameters from a landing URL.
 * Only utm_source, utm_medium, and utm_campaign are extracted.
 * utm_content and all other parameters are never stored.
 * @param {string} urlString - Landing page URL with possible UTM parameters
 * @param {string} referrer - Document referrer
 * @returns {Object} Normalized acquisition data
 */
export function extractAcquisitionData(urlString, referrer = '') {
  const data = {
    source: 'other',
    medium: 'other',
    campaign: 'other',
    referrer: categorizeReferrer(referrer),
  };

  try {
    const url = new URL(urlString);
    const params = url.searchParams;

    if (params.has('utm_source')) {
      data.source = normalizeSource(params.get('utm_source'));
    }
    if (params.has('utm_medium')) {
      data.medium = normalizeMedium(params.get('utm_medium'));
    }
    if (params.has('utm_campaign')) {
      data.campaign = normalizeCampaign(params.get('utm_campaign'));
    }
    // utm_content and all other parameters are intentionally ignored
  } catch (e) {
    // Invalid URL, use defaults
  }

  return data;
}
