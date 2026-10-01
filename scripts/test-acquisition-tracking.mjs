/**
 * Tests for privacy-preserving acquisition tracking.
 * 
 * Run with: node --test scripts/test-acquisition-tracking.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeSource,
  normalizeMedium,
  normalizeCampaign,
  categorizeReferrer,
  extractAcquisitionData,
} from '../worker/acquisition-tracking.mjs';

test('normalizeSource - allowlisted values', () => {
  assert.strictEqual(normalizeSource('x'), 'x');
  assert.strictEqual(normalizeSource('X'), 'x');
  assert.strictEqual(normalizeSource('twitter'), 'twitter');
  assert.strictEqual(normalizeSource('LinkedIn'), 'linkedin');
  assert.strictEqual(normalizeSource('reddit'), 'reddit');
  assert.strictEqual(normalizeSource('substack'), 'substack');
  assert.strictEqual(normalizeSource('hackernoon'), 'hackernoon');
  assert.strictEqual(normalizeSource('v2ex'), 'v2ex');
  assert.strictEqual(normalizeSource('hn'), 'hn');
  assert.strictEqual(normalizeSource('slack'), 'slack');
  assert.strictEqual(normalizeSource('discord'), 'discord');
  assert.strictEqual(normalizeSource('newsletter'), 'newsletter');
  assert.strictEqual(normalizeSource('github'), 'github');
  assert.strictEqual(normalizeSource('email'), 'email');
  // Community-specific Slack channels
  assert.strictEqual(normalizeSource('slack-postgres'), 'slack-postgres');
  assert.strictEqual(normalizeSource('slack-datatalks'), 'slack-datatalks');
  assert.strictEqual(normalizeSource('slack-mlops'), 'slack-mlops');
  // Community-specific Discord servers
  assert.strictEqual(normalizeSource('discord-latentspace'), 'discord-latentspace');
  assert.strictEqual(normalizeSource('discord-llamaindex'), 'discord-llamaindex');
  assert.strictEqual(normalizeSource('discord-duckdb'), 'discord-duckdb');
  assert.strictEqual(normalizeSource('discord-langchain'), 'discord-langchain');
  // Additional platforms
  assert.strictEqual(normalizeSource('mo-blog'), 'mo-blog');
  assert.strictEqual(normalizeSource('linux-do'), 'linux-do');
  assert.strictEqual(normalizeSource('juejin'), 'juejin');
  assert.strictEqual(normalizeSource('modb'), 'modb');
});

test('normalizeSource - non-allowlisted values collapse to other', () => {
  assert.strictEqual(normalizeSource('facebook'), 'other');
  assert.strictEqual(normalizeSource('tiktok'), 'other');
  assert.strictEqual(normalizeSource('instagram'), 'other');
  assert.strictEqual(normalizeSource('spam'), 'other');
  assert.strictEqual(normalizeSource(''), 'other');
  assert.strictEqual(normalizeSource(null), 'other');
  assert.strictEqual(normalizeSource(undefined), 'other');
  assert.strictEqual(normalizeSource(123), 'other');
});

test('normalizeMedium - allowlisted values', () => {
  assert.strictEqual(normalizeMedium('social'), 'social');
  assert.strictEqual(normalizeMedium('SOCIAL'), 'social');
  assert.strictEqual(normalizeMedium('community'), 'community');
  assert.strictEqual(normalizeMedium('article'), 'article');
  assert.strictEqual(normalizeMedium('comment'), 'comment');
  assert.strictEqual(normalizeMedium('newsletter'), 'newsletter');
  assert.strictEqual(normalizeMedium('referral'), 'referral');
  assert.strictEqual(normalizeMedium('email'), 'email');
  assert.strictEqual(normalizeMedium('profile'), 'profile');
});

test('normalizeMedium - non-allowlisted values collapse to other', () => {
  assert.strictEqual(normalizeMedium('cpc'), 'other');
  assert.strictEqual(normalizeMedium('display'), 'other');
  assert.strictEqual(normalizeMedium(''), 'other');
  assert.strictEqual(normalizeMedium(null), 'other');
});

test('normalizeCampaign - valid slugs', () => {
  assert.strictEqual(normalizeCampaign('failure-thread'), 'failure-thread');
  assert.strictEqual(normalizeCampaign('launch-2026'), 'launch-2026');
  assert.strictEqual(normalizeCampaign('q4-promo'), 'q4-promo');
  assert.strictEqual(normalizeCampaign('test'), 'test');
  assert.strictEqual(normalizeCampaign('a'), 'a');
  assert.strictEqual(normalizeCampaign('abc123'), 'abc123');
});

test('normalizeCampaign - invalid slugs collapse to other', () => {
  // Too long
  assert.strictEqual(normalizeCampaign('a'.repeat(51)), 'other');
  
  // Invalid characters
  assert.strictEqual(normalizeCampaign('Hello World'), 'other');
  assert.strictEqual(normalizeCampaign('test_campaign'), 'other');
  assert.strictEqual(normalizeCampaign('test.campaign'), 'other');
  assert.strictEqual(normalizeCampaign('test/campaign'), 'other');
  assert.strictEqual(normalizeCampaign('UPPERCASE'), 'other');
  
  // Starts or ends with hyphen
  assert.strictEqual(normalizeCampaign('-test'), 'other');
  assert.strictEqual(normalizeCampaign('test-'), 'other');
  
  // Empty or invalid
  assert.strictEqual(normalizeCampaign(''), 'other');
  assert.strictEqual(normalizeCampaign(null), 'other');
  assert.strictEqual(normalizeCampaign(undefined), 'other');
});

test('categorizeReferrer - exact platform matches', () => {
  assert.strictEqual(categorizeReferrer('https://x.com/post/123'), 'x');
  assert.strictEqual(categorizeReferrer('https://twitter.com/user/status/456'), 'x');
  assert.strictEqual(categorizeReferrer('https://www.linkedin.com/feed/'), 'linkedin');
  assert.strictEqual(categorizeReferrer('https://reddit.com/r/programming'), 'reddit');
  assert.strictEqual(categorizeReferrer('https://substack.com/article'), 'substack');
  assert.strictEqual(categorizeReferrer('https://hackernoon.com/article'), 'hackernoon');
  assert.strictEqual(categorizeReferrer('https://v2ex.com/t/12345'), 'v2ex');
  assert.strictEqual(categorizeReferrer('https://news.ycombinator.com/item?id=123'), 'hn');
  assert.strictEqual(categorizeReferrer('https://github.com/user/repo'), 'github');
});

test('categorizeReferrer - search engines', () => {
  assert.strictEqual(categorizeReferrer('https://google.com/search?q=test'), 'search');
  assert.strictEqual(categorizeReferrer('https://www.google.com/search'), 'search');
  assert.strictEqual(categorizeReferrer('https://google.co.uk/search'), 'search');
  assert.strictEqual(categorizeReferrer('https://google.co.jp/search'), 'search');
  assert.strictEqual(categorizeReferrer('https://bing.com/search'), 'search');
  assert.strictEqual(categorizeReferrer('https://duckduckgo.com/'), 'search');
  assert.strictEqual(categorizeReferrer('https://baidu.com/s'), 'search');
});

test('categorizeReferrer - subdomain handling', () => {
  assert.strictEqual(categorizeReferrer('https://www.twitter.com/'), 'x');
  assert.strictEqual(categorizeReferrer('https://mobile.twitter.com/'), 'x');
  assert.strictEqual(categorizeReferrer('https://www.reddit.com/'), 'reddit');
  assert.strictEqual(categorizeReferrer('https://old.reddit.com/'), 'reddit');
});

test('categorizeReferrer - direct and other', () => {
  assert.strictEqual(categorizeReferrer(''), 'direct');
  assert.strictEqual(categorizeReferrer(null), 'direct');
  assert.strictEqual(categorizeReferrer(undefined), 'direct');
  assert.strictEqual(categorizeReferrer('   '), 'direct');
  
  assert.strictEqual(categorizeReferrer('https://example.com/'), 'other');
  assert.strictEqual(categorizeReferrer('https://facebook.com/'), 'other');
  assert.strictEqual(categorizeReferrer('invalid-url'), 'other');
});

test('extractAcquisitionData - full UTM parameters', () => {
  const url = 'https://git4data.ai/?utm_source=x&utm_medium=social&utm_campaign=failure-thread';
  const data = extractAcquisitionData(url, 'https://x.com/user/post');
  
  assert.strictEqual(data.source, 'x');
  assert.strictEqual(data.medium, 'social');
  assert.strictEqual(data.campaign, 'failure-thread');
  assert.strictEqual(data.referrer, 'x');
});

test('extractAcquisitionData - partial UTM parameters', () => {
  const url = 'https://git4data.ai/?utm_source=linkedin&utm_medium=social';
  const data = extractAcquisitionData(url, '');
  
  assert.strictEqual(data.source, 'linkedin');
  assert.strictEqual(data.medium, 'social');
  assert.strictEqual(data.campaign, 'other');
  assert.strictEqual(data.referrer, 'direct');
});

test('extractAcquisitionData - no UTM parameters', () => {
  const url = 'https://git4data.ai/playground';
  const data = extractAcquisitionData(url, 'https://reddit.com/r/programming');
  
  assert.strictEqual(data.source, 'other');
  assert.strictEqual(data.medium, 'other');
  assert.strictEqual(data.campaign, 'other');
  assert.strictEqual(data.referrer, 'reddit');
});

test('extractAcquisitionData - invalid UTM values are normalized', () => {
  const url = 'https://git4data.ai/?utm_source=facebook&utm_medium=cpc&utm_campaign=TEST-CAMPAIGN';
  const data = extractAcquisitionData(url, 'https://facebook.com/');
  
  assert.strictEqual(data.source, 'other');
  assert.strictEqual(data.medium, 'other');
  assert.strictEqual(data.campaign, 'other'); // uppercase not allowed
  assert.strictEqual(data.referrer, 'other');
});

test('extractAcquisitionData - example tracked URLs', () => {
  // X/Twitter post
  const xUrl = 'https://git4data.ai/?utm_source=x&utm_medium=social&utm_campaign=failure-thread';
  const xData = extractAcquisitionData(xUrl, 'https://x.com/user/post/123');
  assert.strictEqual(xData.source, 'x');
  assert.strictEqual(xData.medium, 'social');
  assert.strictEqual(xData.campaign, 'failure-thread');
  assert.strictEqual(xData.referrer, 'x');
  
  // LinkedIn article
  const liUrl = 'https://git4data.ai/?utm_source=linkedin&utm_medium=article&utm_campaign=launch-2026';
  const liData = extractAcquisitionData(liUrl, 'https://www.linkedin.com/pulse/article');
  assert.strictEqual(liData.source, 'linkedin');
  assert.strictEqual(liData.medium, 'article');
  assert.strictEqual(liData.campaign, 'launch-2026');
  assert.strictEqual(liData.referrer, 'linkedin');
  
  // Reddit comment
  const redditUrl = 'https://git4data.ai/?utm_source=reddit&utm_medium=comment&utm_campaign=r-programming';
  const redditData = extractAcquisitionData(redditUrl, 'https://old.reddit.com/r/programming/comments/abc/');
  assert.strictEqual(redditData.source, 'reddit');
  assert.strictEqual(redditData.medium, 'comment');
  assert.strictEqual(redditData.campaign, 'r-programming');
  assert.strictEqual(redditData.referrer, 'reddit');
  
  // HackerNoon article
  const hnUrl = 'https://git4data.ai/?utm_source=hackernoon&utm_medium=article';
  const hnData = extractAcquisitionData(hnUrl, 'https://hackernoon.com/article-slug');
  assert.strictEqual(hnData.source, 'hackernoon');
  assert.strictEqual(hnData.medium, 'article');
  assert.strictEqual(hnData.campaign, 'other');
  assert.strictEqual(hnData.referrer, 'hackernoon');
  
  // Newsletter
  const newsletterUrl = 'https://git4data.ai/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-1';
  const newsletterData = extractAcquisitionData(newsletterUrl, '');
  assert.strictEqual(newsletterData.source, 'newsletter');
  assert.strictEqual(newsletterData.medium, 'email');
  assert.strictEqual(newsletterData.campaign, 'weekly-1');
  assert.strictEqual(newsletterData.referrer, 'direct');
});

test('privacy - never stores raw query strings', () => {
  const url = 'https://git4data.ai/?utm_source=x&private=secret&email=user@example.com';
  const data = extractAcquisitionData(url, '');
  
  // Only normalized UTM values are returned
  assert.strictEqual(Object.keys(data).length, 4);
  assert.ok('source' in data);
  assert.ok('medium' in data);
  assert.ok('campaign' in data);
  assert.ok('referrer' in data);
  
  // No raw query string data
  assert.ok(!('private' in data));
  assert.ok(!('email' in data));
});

test('privacy - never stores full referrer URLs', () => {
  const sensitiveReferrer = 'https://reddit.com/r/programming/comments/abc123/sensitive-title-here/?utm_source=test';
  const data = extractAcquisitionData('https://git4data.ai/', sensitiveReferrer);
  
  // Only coarse category is returned
  assert.strictEqual(data.referrer, 'reddit');
  
  // No URL components are preserved
  assert.ok(!data.referrer.includes('comments'));
  assert.ok(!data.referrer.includes('abc123'));
  assert.ok(!data.referrer.includes('sensitive'));
});

test('privacy - utm_content is never stored', () => {
  const url = 'https://git4data.ai/?utm_source=linkedin&utm_medium=profile&utm_campaign=test&utm_content=featured-post&utm_term=keywords';
  const data = extractAcquisitionData(url, '');
  
  // Only source, medium, campaign, and referrer are returned
  assert.strictEqual(Object.keys(data).length, 4);
  assert.strictEqual(data.source, 'linkedin');
  assert.strictEqual(data.medium, 'profile');
  assert.strictEqual(data.campaign, 'test');
  assert.strictEqual(data.referrer, 'direct');
  
  // utm_content and utm_term are never stored
  assert.ok(!('content' in data));
  assert.ok(!('term' in data));
  assert.ok(!('utm_content' in data));
  assert.ok(!('utm_term' in data));
});

test('extended allowlist - community-specific sources', () => {
  // Slack communities
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=slack-postgres', '').source, 'slack-postgres');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=slack-datatalks', '').source, 'slack-datatalks');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=slack-mlops', '').source, 'slack-mlops');
  
  // Discord communities
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=discord-latentspace', '').source, 'discord-latentspace');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=discord-llamaindex', '').source, 'discord-llamaindex');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=discord-duckdb', '').source, 'discord-duckdb');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=discord-langchain', '').source, 'discord-langchain');
  
  // Additional platforms
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=mo-blog', '').source, 'mo-blog');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=linux-do', '').source, 'linux-do');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=juejin', '').source, 'juejin');
  assert.strictEqual(extractAcquisitionData('https://git4data.ai/?utm_source=modb', '').source, 'modb');
});

test('extended allowlist - profile medium', () => {
  const url = 'https://git4data.ai/?utm_source=linkedin&utm_medium=profile&utm_campaign=personal';
  const data = extractAcquisitionData(url, '');
  
  assert.strictEqual(data.source, 'linkedin');
  assert.strictEqual(data.medium, 'profile');
  assert.strictEqual(data.campaign, 'personal');
});
