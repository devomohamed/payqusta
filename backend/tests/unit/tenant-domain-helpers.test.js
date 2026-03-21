const AppError = require('../../src/utils/AppError');
const {
  buildStoreUrl,
  getPlatformSubdomain,
  getRequestHost,
  isLocalOrRunHost,
  isPlatformHost,
  normalizeCustomDomain,
  normalizeSubdomain,
} = require('../../src/utils/tenantDomainHelpers');

describe('tenant domain helpers', () => {
  beforeEach(() => {
    process.env.PLATFORM_ROOT_DOMAIN = 'payqusta.store';
    process.env.RESERVED_PLATFORM_SUBDOMAINS = 'www,api,admin,app,portal,mail';
  });

  it('extracts the forwarded request host safely', () => {
    expect(getRequestHost({
      headers: {
        'x-forwarded-host': 'demo.payqusta.store:443, proxy.local',
      },
    })).toBe('demo.payqusta.store');
  });

  it('resolves valid platform subdomains and ignores reserved ones', () => {
    expect(getPlatformSubdomain('demo.payqusta.store')).toBe('demo');
    expect(getPlatformSubdomain('portal.payqusta.store')).toBeNull();
  });

  it('normalizes valid custom domains and rejects invalid ones', () => {
    expect(normalizeCustomDomain('https://Shop.Example.com/path')).toBe('shop.example.com');
    expect(() => normalizeCustomDomain('invalid-domain')).toThrow(AppError);
  });

  it('normalizes subdomains and rejects reserved aliases', () => {
    expect(normalizeSubdomain(' Demo Store ')).toBe('demo-store');
    expect(() => normalizeSubdomain('portal')).toThrow(AppError);
  });

  it('builds store URLs and distinguishes platform hosts correctly', () => {
    expect(buildStoreUrl('demo')).toBe('https://demo.payqusta.store');
    expect(isLocalOrRunHost('localhost')).toBe(true);
    expect(isPlatformHost('demo.payqusta.store')).toBe(true);
    expect(isPlatformHost('shop.example.com')).toBe(false);
  });
});
