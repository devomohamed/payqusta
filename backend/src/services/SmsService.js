const axios = require('axios');
const logger = require('../utils/logger');
const { ensureSystemConfig, getPlatformNotificationSettings } = require('./notificationConfigService');

function normalizeString(value = '') {
  return String(value || '').trim();
}

function normalizePhoneNumber(phone = '') {
  let cleaned = String(phone || '').replace(/\D/g, '');
  
  // Egypt (+20) normalization
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+20${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    return `+20${cleaned}`;
  }
  if (cleaned.startsWith('20') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If already has a leading +, and looks like a number, just return it
  if (String(phone).startsWith('+')) return phone;
  
  // Fallback: if it's just numbers, prepend +
  if (cleaned.length > 5) return `+${cleaned}`;
  
  return phone;
}

class SmsService {
  async resolveConfig(tenant) {
    const systemConfig = await ensureSystemConfig();
    const notifications = getPlatformNotificationSettings(systemConfig);
    const tenantSms = tenant?.notificationChannels?.sms || {};
    const tenantPolicy = notifications?.tenantPolicy || {};
    const platformSms = notifications?.platformSms || {};

    const tenantWantsCustom = tenantSms.enabled && tenantSms.mode === 'custom_provider';
    const customAllowed = tenantPolicy.allowCustomSms !== false;
    const hasTenantCustom = tenantWantsCustom && customAllowed;

    if (hasTenantCustom) {
      return {
        enabled: tenantSms.enabled !== false,
        provider: tenantSms.provider || 'mock',
        baseUrl: normalizeString(tenantSms.baseUrl),
        apiKey: normalizeString(tenantSms.apiKey),
        apiSecret: normalizeString(tenantSms.apiSecret),
        senderId: normalizeString(tenantSms.senderId || tenant?.notificationBranding?.senderName || tenant?.name),
        source: 'tenant_custom',
      };
    }

    return {
      enabled: !!platformSms.enabled,
      provider: platformSms.provider || 'mock',
      baseUrl: normalizeString(platformSms.baseUrl),
      apiKey: normalizeString(platformSms.apiKey),
      apiSecret: normalizeString(platformSms.apiSecret),
      senderId: normalizeString(tenant?.notificationBranding?.senderName || tenant?.name || platformSms.senderId || 'PayQusta'),
      source: 'platform_default',
    };
  }

  isConfigured(config = {}) {
    if (!config?.enabled) return false;
    if (config.provider === 'mock') return true;
    if (config.provider === 'generic_http') {
      return Boolean(config.baseUrl);
    }
    if (config.provider === 'twilio' || config.provider === 'twilio_verify') {
      return Boolean(config.apiKey && config.apiSecret && config.senderId);
    }
    return false;
  }

  buildActivationMessage({ storeName, url }) {
    return `مرحباً بك في ${storeName}. لتفعيل حسابك افتح: ${url}`;
  }

  async sendMessage({ phone, message, tenant, context = {} }) {
    const config = await this.resolveConfig(tenant);
    const targetPhone = normalizePhoneNumber(phone);
    
    // Only normalize as phone if it's not a Twilio SID (Starts with VA, AC, MG)
    const isSid = /^(VA|AC|MG)/.test(config.senderId);
    const fromIdentifier = isSid ? config.senderId : normalizePhoneNumber(config.senderId);

    logger.info(`[SMS] Attempting to send via ${config.provider}. From/SID: ${fromIdentifier}, To: ${targetPhone}`);

    if (!this.isConfigured(config)) {
      return {
        success: false,
        provider: config.provider || 'disabled',
        reason: 'sms_not_configured',
      };
    }

    if (config.provider === 'mock') {
      const mockId = `sms_mock_${Date.now()}`;
      logger.info(`[SMS:MOCK] ${phone} | ${message}`);
      return {
        success: true,
        provider: 'mock',
        messageId: mockId,
        context,
      };
    }

    try {
      if (config.provider === 'twilio') {
        const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', targetPhone);
        params.append('From', fromPhone);
        params.append('Body', message);

        const response = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
          params.toString(),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        );

        return {
          success: true,
          provider: 'twilio',
          messageId: response?.data?.sid || '',
          response: response?.data || null,
        };
      }

      if (config.provider === 'twilio_verify') {
        const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', targetPhone);
        params.append('Channel', 'sms');
        // Note: Twilio Verify normally sends its own codes. 
        // We use it here to trigger a 'verification' which sends a code.
        
        const response = await axios.post(
          `https://verify.twilio.com/v2/Services/${config.senderId}/Verifications`,
          params.toString(),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        );

        return {
          success: true,
          provider: 'twilio_verify',
          messageId: response?.data?.sid || '',
          response: response?.data || null,
        };
      }

      // Generic HTTP Provider
      const response = await axios.post(config.baseUrl, {
        to: targetPhone,
        message,
        senderId: config.senderId,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        context,
      }, { timeout: 10000 });

      const result = {
        success: true,
        provider: config.provider,
        messageId: response?.data?.messageId || response?.data?.id || response?.data?.sid || '',
        response: response?.data || null,
      };
      logger.info(`[SMS] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const errorData = error.response?.data || null;
      logger.error(`[SMS] Send failed (${config.provider}): ${error.message}. Response: ${JSON.stringify(errorData)}`);
      return {
        success: false,
        provider: config.provider,
        reason: errorData?.message || errorData?.code || error.message || 'sms_send_failed',
        response: errorData,
      };
    }
  }

  async sendActivationLink({ phone, url, tenant, context = {} }) {
    return this.sendMessage({
      phone,
      message: this.buildActivationMessage({
        storeName: tenant?.name || 'PayQusta',
        url,
      }),
      tenant,
      context: { ...context, type: 'activation' },
    });
  }

  async sendTestMessage({ phone, tenant }) {
    return this.sendMessage({
      phone,
      tenant,
      message: `رسالة اختبار من ${tenant?.name || 'PayQusta'} - ${new Date().toLocaleString('ar-EG')}`,
      context: { type: 'test' },
    });
  }
}

module.exports = new SmsService();
