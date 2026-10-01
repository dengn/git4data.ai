# Acquisition Tracking Test Plan

## Manual Testing Checklist

### 1. UTM Parameter Collection
- [ ] Visit `https://git4data.ai/?utm_source=x&utm_medium=social&utm_campaign=failure-thread`
- [ ] Verify source='x', medium='social', campaign='failure-thread' in dashboard
- [ ] Visit with invalid source: `?utm_source=facebook` → should show source='other'
- [ ] Visit with invalid campaign: `?utm_campaign=UPPERCASE` → should show campaign='other'

### 2. Referrer Categorization
- [ ] Navigate from x.com → should show referrer='x'
- [ ] Navigate from linkedin.com → should show referrer='linkedin'
- [ ] Navigate from google.com → should show referrer='search'
- [ ] Direct navigation (no referrer) → should show referrer='direct'
- [ ] Navigate from example.com → should show referrer='other'

### 3. Session-Scoped Attribution
- [ ] Land on homepage with `?utm_source=linkedin&utm_medium=social`
- [ ] sessionStorage should contain acquisition data
- [ ] Click a CTA button (e.g., "Try the demo")
- [ ] Click should be attributed to source='linkedin' in dashboard
- [ ] Close tab and reopen → sessionStorage should be cleared

### 4. Privacy Controls
- [ ] Enable DNT in browser → events should not be sent
- [ ] Enable GPC → events should not be sent
- [ ] Visit `/privacy` and click opt-out → events should not be sent
- [ ] Add `?analytics=off` → events should not be sent

### 5. Dashboard Verification
- [ ] Login to `/analytics` with read token
- [ ] Verify "访问来源" panel shows source/medium/referrer breakdowns
- [ ] Verify "来源的点击归因" panel shows CTA clicks by source
- [ ] Verify acquisition tracking start date is displayed
- [ ] Export CSV includes source/medium/campaign/referrer columns

### 6. Privacy Page
- [ ] Visit `/privacy`
- [ ] Verify new sections describe acquisition tracking
- [ ] Verify allowlists are documented
- [ ] Verify session-scoped attribution is explained
- [ ] Verify "never store raw URLs" language is present

### 7. Security Verification
- [ ] CSP headers unchanged
- [ ] Rate limiting still active on `/api/analytics/events`
- [ ] Auth required for `/api/analytics/report`
- [ ] No new cookies created
- [ ] No localStorage used for tracking
- [ ] sessionStorage cleared on tab close

## Automated Tests

Run all tests:
```bash
npm run test:all
```

Expected: **22/22 tests pass**

### Test Coverage
- ✅ Source/medium/campaign allowlist validation
- ✅ Referrer categorization (platforms, search, direct, other)
- ✅ Campaign slug pattern validation (lowercase, hyphens, max 50 chars)
- ✅ Full UTM parameter extraction
- ✅ Privacy guarantees (no raw URLs stored)
- ✅ Example tracked URLs from all channels
- ✅ Existing playground SQL tests

## Example Tracked URLs for Testing

### Social Media
```bash
# X/Twitter
https://git4data.ai/?utm_source=x&utm_medium=social&utm_campaign=failure-thread

# LinkedIn
https://git4data.ai/?utm_source=linkedin&utm_medium=article&utm_campaign=launch-2026

# Reddit
https://git4data.ai/?utm_source=reddit&utm_medium=comment&utm_campaign=r-programming
```

### Content Platforms
```bash
# HackerNoon
https://git4data.ai/?utm_source=hackernoon&utm_medium=article

# Substack
https://git4data.ai/?utm_source=substack&utm_medium=newsletter&utm_campaign=db-workflows

# V2EX
https://git4data.ai/?utm_source=v2ex&utm_medium=community&utm_campaign=launch
```

### Communities
```bash
# Slack
https://git4data.ai/?utm_source=slack&utm_medium=community&utm_campaign=data-eng

# Discord
https://git4data.ai/?utm_source=discord&utm_medium=community&utm_campaign=ai-agents
```

### Email & Newsletters
```bash
# Newsletter
https://git4data.ai/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-1

# Direct email
https://git4data.ai/?utm_source=email&utm_medium=email&utm_campaign=outreach
```

### GitHub
```bash
https://git4data.ai/?utm_source=github&utm_medium=referral&utm_campaign=readme
```

## Privacy Validation

### What Should NEVER Be Stored
- ❌ Raw query strings (e.g., `?email=user@example.com&token=secret`)
- ❌ Full referrer URLs (e.g., `https://reddit.com/r/programming/comments/abc123/sensitive-title`)
- ❌ IP addresses
- ❌ User identifiers
- ❌ Cookie values
- ❌ Browser fingerprints
- ❌ Cross-session tracking IDs
- ❌ Arbitrary UTM parameters outside allowlist

### What IS Stored
- ✅ Normalized source (from allowlist or 'other')
- ✅ Normalized medium (from allowlist or 'other')
- ✅ Validated campaign slug (or 'other')
- ✅ Coarse referrer category (platform name or 'direct'/'other')
- ✅ Event counts aggregated by day/page/event/target
- ✅ Within-session attribution (sessionStorage only, cleared on tab close)

## Performance & Load Testing

### Expected Behavior
- [ ] Analytics script loads asynchronously (doesn't block page load)
- [ ] sessionStorage operations don't cause UI lag
- [ ] Failed analytics requests don't break playground or page functionality
- [ ] Rate limiting prevents abuse without blocking legitimate traffic

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

Verify:
- [ ] sessionStorage works consistently
- [ ] URL parameter parsing works
- [ ] Referrer categorization works
- [ ] DNT/GPC respected

## Deployment Checklist

Before deploying to production:
- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Privacy page reviewed and approved
- [ ] Dashboard UI/UX verified
- [ ] Security policies unchanged
- [ ] No PII or sensitive data in logs
- [ ] Staging/preview deployment tested
- [ ] Rollback plan in place
