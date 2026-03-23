const SystemConfig = require('../models/SystemConfig');

const defaultSystemConfigPayload = {
  key: 'default',
  notifications: {
    platformEmail: {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: '',
      fromName: 'PayQusta',
    },
    platformSms: {
      enabled: false,
      provider: 'mock',
      baseUrl: '',
      apiKey: '',
      apiSecret: '',
      senderId: 'PayQusta',
      supportsCustomSenderId: true,
    },
    defaults: {
      routingMode: 'smart',
      fallbackEnabled: true,
      allowEmailFallbackToSms: true,
      allowSmsFallbackToEmail: true,
      activationLinkBaseUrl: '',
      shortLinkDomain: '',
      poweredByEnabled: true,
      poweredByUrl: 'https://payqusta.com',
    },
    tenantPolicy: {
      allowCustomSmtp: true,
      allowCustomSms: true,
      allowPlatformEmailFallback: true,
      allowPlatformSmsFallback: true,
    },
  },
};

async function ensureSystemConfig() {
  let config = await SystemConfig.findOne({ key: 'default' });
  if (!config) {
    config = await SystemConfig.create(defaultSystemConfigPayload);
  }
  return config;
}

function getPlatformNotificationSettings(config) {
  return config?.notifications || defaultSystemConfigPayload.notifications;
}

module.exports = {
  ensureSystemConfig,
  getPlatformNotificationSettings,
  defaultSystemConfigPayload,
};
