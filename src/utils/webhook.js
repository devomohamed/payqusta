/**
 * Webhook Notification Utility
 * Sends alerts to Slack/Discord for critical events.
 * 
 * Set WEBHOOK_URL in .env (Slack Incoming Webhook or Discord Webhook URL).
 */
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL;

const sendWebhook = async (title, message, type = 'info') => {
    if (!WEBHOOK_URL) return;

    const colors = { info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
    const emojis = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🚨' };

    const payload = WEBHOOK_URL.includes('discord')
        ? {
            embeds: [{
                title: `${emojis[type]} ${title}`,
                description: message,
                color: parseInt(colors[type].replace('#', ''), 16),
                timestamp: new Date().toISOString(),
                footer: { text: 'PayQusta System' },
            }],
        }
        : {
            attachments: [{
                color: colors[type],
                title: `${emojis[type]} ${title}`,
                text: message,
                ts: Math.floor(Date.now() / 1000),
                footer: 'PayQusta System',
            }],
        };

    try {
        await axios.post(WEBHOOK_URL, payload, { timeout: 5000 });
    } catch (err) {
        console.error('[Webhook] Failed to send notification:', err.message);
    }
};

// Pre-built notification helpers
const webhookNotify = {
    newTenant: (tenantName) => sendWebhook('متجر جديد!', `تم تسجيل متجر جديد: **${tenantName}**`, 'success'),
    newSubscription: (tenantName, plan) => sendWebhook('اشتراك جديد!', `${tenantName} اشترك في باقة **${plan}**`, 'success'),
    paymentFailed: (tenantName, amount) => sendWebhook('فشل دفع', `فشل دفع **${amount} جنيه** من ${tenantName}`, 'error'),
    serverError: (path, error) => sendWebhook('خطأ في السيرفر', `**${path}**\n\`\`\`${error}\`\`\``, 'error'),
    quotaAlert: (tenantName, remaining) => sendWebhook('تنبيه رصيد', `رصيد واتساب ${tenantName} وصل لـ **${remaining}** رسالة`, 'warning'),
};

module.exports = { sendWebhook, webhookNotify };
