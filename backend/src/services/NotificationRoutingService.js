const { ensureSystemConfig, getPlatformNotificationSettings } = require('./notificationConfigService');

function hasPlatformEmail(platformEmail = {}) {
  // If explicitly disabled by super admin, respect the kill switch.
  if (platformEmail?.enabled === false) return false;

  const hasEnvConfig = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

  return Boolean(
    (platformEmail?.enabled || hasEnvConfig || platformEmail.enabled === undefined)
    && (
      (platformEmail.host && platformEmail.user && platformEmail.pass)
      || hasEnvConfig
      || process.env.NODE_ENV !== 'production'
    )
  );
}

function hasPlatformSms(platformSms = {}) {
  return Boolean(platformSms?.enabled && (platformSms.provider === 'mock' || platformSms.baseUrl));
}

class NotificationRoutingService {
  async resolve({
    phone,
    email,
    preferredChannel = 'auto',
    tenant = null,
    purpose = 'notification',
  }) {
    const systemConfig = await ensureSystemConfig();
    const notifications = getPlatformNotificationSettings(systemConfig);
    const tenantEmail = tenant?.notificationChannels?.email || {};
    const tenantSms = tenant?.notificationChannels?.sms || {};
    const tenantWhatsapp = tenant?.whatsapp || {};
    const tenantRouting = tenant?.notificationChannels?.routing || {};
    const defaults = notifications?.defaults || {};
    const tenantPolicy = notifications?.tenantPolicy || {};

    const emailAvailable = Boolean(
      email
      && (
        (tenantPolicy.allowCustomSmtp !== false
          && tenantEmail.enabled
          && tenantEmail.mode === 'custom_smtp'
          && tenantEmail.host
          && tenantEmail.user
          && tenantEmail.pass)
        || (tenantEmail.mode !== 'disabled' && hasPlatformEmail(notifications?.platformEmail))
      )
    );

    const smsAvailable = Boolean(
      phone
      && (
        (tenantPolicy.allowCustomSms !== false
          && tenantSms.enabled
          && tenantSms.mode === 'custom_provider'
          && (tenantSms.provider === 'mock' || tenantSms.baseUrl))
        || (tenantSms.mode !== 'disabled' && hasPlatformSms(notifications?.platformSms))
      )
    );

    const whatsappAvailable = Boolean(
      phone
      && tenantWhatsapp.enabled
      && tenantWhatsapp.accessToken
      && tenantWhatsapp.phoneNumberId
    );

    const availableChannels = [];
    if (whatsappAvailable) availableChannels.push('whatsapp');
    if (smsAvailable) availableChannels.push('sms');
    if (emailAvailable) availableChannels.push('email');

    const routingMode = tenantRouting.mode || defaults.routingMode || 'smart';
    let primaryChannel = preferredChannel;

    if (!['sms', 'email', 'whatsapp'].includes(primaryChannel)) {
      if (routingMode === 'whatsapp_only' && whatsappAvailable) primaryChannel = 'whatsapp';
      else if (routingMode === 'sms_only' && smsAvailable) primaryChannel = 'sms';
      else if (routingMode === 'email_only' && emailAvailable) primaryChannel = 'email';
      else if (routingMode === 'whatsapp_preferred' && whatsappAvailable) primaryChannel = 'whatsapp';
      else if (['activation', 'invitation'].includes(purpose) && emailAvailable) primaryChannel = 'email';
      else if (tenantRouting.preferEmailWhenEmailExists && emailAvailable) primaryChannel = 'email';
      else if (tenantRouting.preferSmsWhenPhoneExists !== false && smsAvailable) primaryChannel = 'sms';
      else if (whatsappAvailable) primaryChannel = 'whatsapp';
      else if (smsAvailable) primaryChannel = 'sms';
      else if (emailAvailable) primaryChannel = 'email';
      else primaryChannel = 'none';
    }

    if (primaryChannel === 'whatsapp' && !whatsappAvailable) {
      primaryChannel = smsAvailable ? 'sms' : (emailAvailable ? 'email' : 'none');
    }

    if (primaryChannel === 'sms' && !smsAvailable) {
      primaryChannel = whatsappAvailable ? 'whatsapp' : (emailAvailable ? 'email' : 'none');
    } else if (primaryChannel === 'email' && !emailAvailable) {
      primaryChannel = whatsappAvailable ? 'whatsapp' : (smsAvailable ? 'sms' : 'none');
    }

    const fallbackEnabled = tenantRouting.fallbackEnabled ?? defaults.fallbackEnabled ?? true;
    let fallbackChannel = 'none';

    if (fallbackEnabled && primaryChannel === 'whatsapp') {
      fallbackChannel = smsAvailable ? 'sms' : (emailAvailable ? 'email' : 'none');
    } else if (fallbackEnabled && primaryChannel === 'sms') {
      fallbackChannel = whatsappAvailable ? 'whatsapp' : (emailAvailable ? 'email' : 'none');
    } else if (fallbackEnabled && primaryChannel === 'email') {
      fallbackChannel = whatsappAvailable ? 'whatsapp' : (smsAvailable ? 'sms' : 'none');
    }

    return {
      primaryChannel,
      fallbackChannel,
      availableChannels,
      emailAvailable,
      smsAvailable,
      routingMode,
      systemConfig,
    };
  }
}

module.exports = new NotificationRoutingService();
