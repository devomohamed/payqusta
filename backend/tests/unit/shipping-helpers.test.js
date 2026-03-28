const {
  DEFAULT_TENANT_SHIPPING_SETTINGS,
  applyTenantShippingSettings,
  getTenantShippingSettings,
} = require('../../src/utils/shippingHelpers');

describe('shippingHelpers', () => {
  it('provides default transfer reminder settings', () => {
    const settings = getTenantShippingSettings({ settings: {} });

    expect(settings.transferReminders).toEqual(
      DEFAULT_TENANT_SHIPPING_SETTINGS.transferReminders
    );
  });

  it('normalizes tenant transfer reminder settings with safe minimums', () => {
    const settings = getTenantShippingSettings({
      settings: {
        shipping: {
          transferReminders: {
            enabled: false,
            hoursToOverdue: 0,
            reminderIntervalHours: -5,
          },
        },
      },
    });

    expect(settings.transferReminders).toEqual({
      enabled: false,
      hoursToOverdue: 1,
      reminderIntervalHours: 4,
    });
  });

  it('applies transfer reminder updates on top of existing shipping settings', () => {
    const next = applyTenantShippingSettings({
      transferReminders: {
        enabled: true,
        hoursToOverdue: 12,
        reminderIntervalHours: 6,
      },
    }, {
      settings: {
        shipping: {
          enabled: true,
          pricingMode: 'fixed_zones',
        },
      },
    });

    expect(next.transferReminders).toEqual({
      enabled: true,
      hoursToOverdue: 12,
      reminderIntervalHours: 6,
    });
    expect(next.pricingMode).toBe('fixed_zones');
  });
});
