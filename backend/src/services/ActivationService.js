const crypto = require('crypto');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Tenant = require('../models/Tenant');
const NotificationDispatch = require('../models/NotificationDispatch');
const EmailService = require('./EmailService');
const SmsService = require('./SmsService');
const WhatsAppService = require('./WhatsAppService');
const NotificationRoutingService = require('./NotificationRoutingService');
const AppError = require('../utils/AppError');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function maskDestination(channel, value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  if (channel === 'email') {
    const [localPart = '', domain = ''] = normalized.split('@');
    if (!domain) return normalized;
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`;
}

class ActivationService {
  buildActivationUrl(token, systemConfig) {
    const baseUrl = systemConfig?.notifications?.defaults?.activationLinkBaseUrl
      || process.env.CLIENT_URL
      || 'http://localhost:5173';

    return `${String(baseUrl).replace(/\/$/, '')}/activate-account/${token}`;
  }

  async logDispatch({
    tenantId,
    actorType,
    actorId,
    preferredChannel,
    channel,
    status,
    destination,
    provider,
    providerMessageId,
    errorMessage,
    isFallback = false,
  }) {
    try {
      await NotificationDispatch.create({
        tenant: tenantId,
        actorType,
        user: actorType === 'user' ? actorId : null,
        customer: actorType === 'customer' ? actorId : null,
        purpose: 'activation',
        preferredChannel: preferredChannel || 'auto',
        channel,
        isFallback,
        status,
        destinationMasked: maskDestination(channel, destination),
        provider: provider || '',
        providerMessageId: providerMessageId || '',
        errorMessage: errorMessage || '',
      });
    } catch (_) {
      // Dispatch logging should not block activation flow.
    }
  }

  async sendThroughChannel({ channel, actor, tenant, activationUrl }) {
    if (channel === 'email') {
      const result = await EmailService.sendActivationEmail({
        recipient: { name: actor.name, email: actor.email },
        activationUrl,
        tenant,
        actorType: actor.__activationActorType || 'customer',
      });
      return {
        success: !!result?.success,
        provider: result?.provider || 'email',
        messageId: result?.messageId || '',
        error: result?.error || '',
      };
    }

    if (channel === 'whatsapp') {
      const result = await WhatsAppService.sendActivationTemplate(actor.phone, actor.name, activationUrl, tenant?.whatsapp);
      return {
        success: !!result?.success,
        provider: 'whatsapp',
        messageId: result?.messageId || '',
        error: result?.error || result?.reason || '',
      };
    }

    const result = await SmsService.sendActivationLink({
      phone: actor.phone,
      url: activationUrl,
      tenant,
      context: { actorType: actor.__activationActorType || 'customer' },
    });

    return {
      success: !!result?.success,
      provider: result?.provider || 'sms',
      messageId: result?.messageId || '',
      error: result?.reason || '',
    };
  }

  async inviteUser(user, tenantInput, options = {}) {
    const tenant = tenantInput || await Tenant.findById(user.tenant).lean();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    user.invitation = {
      ...(user.invitation || {}),
      status: 'pending',
      channel: options.preferredChannel || 'auto',
      fallbackChannel: 'none',
      tokenHash,
      expiresAt,
      sentAt: null,
      activatedAt: user.invitation?.activatedAt || null,
      lastError: '',
    };
    await user.save({ validateBeforeSave: false });

    return this.dispatchActivation({
      actorType: 'user',
      actor: user,
      tenant,
      preferredChannel: options.preferredChannel || 'auto',
      fieldPath: 'invitation',
      activationUrlToken: token,
    });
  }

  async inviteCustomer(customer, tenantInput, options = {}) {
    const tenant = tenantInput || await Tenant.findById(customer.tenant).lean();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    customer.portalAccess = {
      ...(customer.portalAccess || {}),
      status: 'pending',
      channel: options.preferredChannel || 'auto',
      fallbackChannel: 'none',
      activationTokenHash: tokenHash,
      activationExpiresAt: expiresAt,
      activatedAt: customer.portalAccess?.activatedAt || null,
      lastInviteAt: null,
      lastDeliveryStatus: '',
      lastDeliveryError: '',
      otp: customer.portalAccess?.otp || {},
    };
    await customer.save({ validateBeforeSave: false });

    return this.dispatchActivation({
      actorType: 'customer',
      actor: customer,
      tenant,
      preferredChannel: options.preferredChannel || 'auto',
      fieldPath: 'portalAccess',
      activationUrlToken: token,
    });
  }

  async dispatchActivation({
    actorType,
    actor,
    tenant,
    preferredChannel,
    fieldPath,
    activationUrlToken,
  }) {
    actor.__activationActorType = actorType;
    const routing = await NotificationRoutingService.resolve({
      phone: actor.phone,
      email: actor.email,
      preferredChannel,
      tenant,
      purpose: fieldPath === 'invitation' ? 'invitation' : 'activation',
    });

    const activationUrl = this.buildActivationUrl(activationUrlToken, routing.systemConfig);

    if (routing.primaryChannel === 'none') {
      actor[fieldPath].status = 'failed';
      actor[fieldPath].lastError = 'no_notification_channel_available';
      if (fieldPath === 'portalAccess') {
        actor[fieldPath].lastDeliveryStatus = 'failed';
        actor[fieldPath].lastDeliveryError = 'no_notification_channel_available';
      }
      await actor.save({ validateBeforeSave: false });
      return { success: false, reason: 'no_notification_channel_available' };
    }

    const primaryResult = await this.sendThroughChannel({
      channel: routing.primaryChannel,
      actor,
      tenant,
      activationUrl,
    });

    await this.logDispatch({
      tenantId: tenant._id || tenant,
      actorType,
      actorId: actor._id,
      preferredChannel,
      channel: routing.primaryChannel,
      status: primaryResult.success ? 'sent' : 'failed',
      destination: routing.primaryChannel === 'email' ? actor.email : actor.phone,
      provider: primaryResult.provider,
      providerMessageId: primaryResult.messageId,
      errorMessage: primaryResult.error,
      isFallback: false,
    });

    if (primaryResult.success) {
      actor[fieldPath].status = 'sent';
      actor[fieldPath].channel = routing.primaryChannel;
      actor[fieldPath].fallbackChannel = routing.fallbackChannel || 'none';
      if (fieldPath === 'invitation') {
        actor[fieldPath].sentAt = new Date();
      } else {
        actor[fieldPath].lastInviteAt = new Date();
        actor[fieldPath].lastDeliveryStatus = 'sent';
        actor[fieldPath].lastDeliveryError = '';
      }
      await actor.save({ validateBeforeSave: false });

      return {
        success: true,
        channel: routing.primaryChannel,
        fallbackChannel: routing.fallbackChannel || 'none',
        activationUrl,
      };
    }

    if (routing.fallbackChannel && routing.fallbackChannel !== 'none') {
      const fallbackResult = await this.sendThroughChannel({
        channel: routing.fallbackChannel,
        actor,
        tenant,
        activationUrl,
      });

      await this.logDispatch({
        tenantId: tenant._id || tenant,
        actorType,
        actorId: actor._id,
        preferredChannel,
        channel: routing.fallbackChannel,
        status: fallbackResult.success ? 'sent' : 'failed',
        destination: routing.fallbackChannel === 'email' ? actor.email : actor.phone,
        provider: fallbackResult.provider,
        providerMessageId: fallbackResult.messageId,
        errorMessage: fallbackResult.error,
        isFallback: true,
      });

      if (fallbackResult.success) {
        actor[fieldPath].status = 'fallback_sent';
        actor[fieldPath].channel = routing.primaryChannel;
        actor[fieldPath].fallbackChannel = routing.fallbackChannel;
        actor[fieldPath].lastError = primaryResult.error || '';
        if (fieldPath === 'invitation') {
          actor[fieldPath].sentAt = new Date();
        } else {
          actor[fieldPath].lastInviteAt = new Date();
          actor[fieldPath].lastDeliveryStatus = 'fallback_sent';
          actor[fieldPath].lastDeliveryError = primaryResult.error || '';
        }
        await actor.save({ validateBeforeSave: false });

        return {
          success: true,
          channel: routing.fallbackChannel,
          fallbackUsed: true,
          activationUrl,
        };
      }
    }

    actor[fieldPath].status = 'failed';
    actor[fieldPath].lastError = primaryResult.error || 'notification_send_failed';
    if (fieldPath === 'portalAccess') {
      actor[fieldPath].lastInviteAt = new Date();
      actor[fieldPath].lastDeliveryStatus = 'failed';
      actor[fieldPath].lastDeliveryError = primaryResult.error || 'notification_send_failed';
    }
    await actor.save({ validateBeforeSave: false });

    return {
      success: false,
      reason: primaryResult.error || 'notification_send_failed',
    };
  }

  async findActivationTarget(token) {
    const tokenHash = hashToken(token);
    const now = new Date();

    const user = await User.findOne({
      'invitation.tokenHash': tokenHash,
      'invitation.expiresAt': { $gt: now },
    }).select('+password').populate('tenant', 'name branding notificationBranding');

    if (user) {
      return {
        actorType: 'user',
        actor: user,
        tenant: user.tenant,
        fieldPath: 'invitation',
      };
    }

    const customer = await Customer.findOne({
      'portalAccess.activationTokenHash': tokenHash,
      'portalAccess.activationExpiresAt': { $gt: now },
    }).select('+password').populate('tenant', 'name branding notificationBranding');

    if (customer) {
      return {
        actorType: 'customer',
        actor: customer,
        tenant: customer.tenant,
        fieldPath: 'portalAccess',
      };
    }

    return null;
  }

  async getActivationPreview(token) {
    const target = await this.findActivationTarget(token);
    if (!target) {
      throw AppError.notFound('رابط التفعيل غير صالح أو منتهي الصلاحية');
    }

    const { actorType, actor, tenant } = target;
    return {
      actorType,
      name: actor.name,
      email: actor.email || '',
      phone: actor.phone || '',
      tenant: {
        name: tenant?.name || 'PayQusta',
        branding: tenant?.branding || {},
        notificationBranding: tenant?.notificationBranding || {},
      },
    };
  }

  async activateByToken(token, password) {
    const target = await this.findActivationTarget(token);
    if (!target) {
      throw AppError.badRequest('رابط التفعيل غير صالح أو منتهي الصلاحية');
    }

    const { actorType, actor, fieldPath } = target;
    actor.password = password;

    if (fieldPath === 'invitation') {
      actor.invitation.status = 'activated';
      actor.invitation.activatedAt = new Date();
      actor.invitation.tokenHash = '';
      actor.invitation.expiresAt = null;
      actor.invitation.lastError = '';
      actor.isActive = true;
    } else {
      actor.portalAccess.status = 'activated';
      actor.portalAccess.activatedAt = new Date();
      actor.portalAccess.activationTokenHash = '';
      actor.portalAccess.activationExpiresAt = null;
      actor.portalAccess.lastDeliveryStatus = 'activated';
      actor.portalAccess.lastDeliveryError = '';
      actor.isActive = true;
    }

    await actor.save();

    return {
      actorType,
      actor,
    };
  }

  async resendUserInvitation(userId, tenantId, preferredChannel = 'auto') {
    const user = await User.findOne({ _id: userId, tenant: tenantId });
    if (!user) {
      throw AppError.notFound('المستخدم غير موجود');
    }
    return this.inviteUser(user, null, { preferredChannel });
  }

  async resendCustomerActivation(customerId, tenantId, preferredChannel = 'auto') {
    const customer = await Customer.findOne({ _id: customerId, tenant: tenantId });
    if (!customer) {
      throw AppError.notFound('العميل غير موجود');
    }
    return this.inviteCustomer(customer, null, { preferredChannel });
  }
}

module.exports = new ActivationService();
