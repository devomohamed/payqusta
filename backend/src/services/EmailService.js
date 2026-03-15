/**
 * Email Service — Send Emails using Nodemailer
 * Supports: Welcome emails, Password reset, Invoices, Notifications
 */

const nodemailer = require('nodemailer');
const path = require('path');
const logger = require('../utils/logger');

const normalizeEmailHost = (value = '') => String(value || '').trim().toLowerCase();

const normalizeEmailPassword = (host, password) => {
  const normalizedPassword = String(password || '').trim();
  if (normalizeEmailHost(host) === 'smtp.gmail.com') {
    return normalizedPassword.replace(/\s+/g, '');
  }
  return normalizedPassword;
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.lastInitError = null;
  }

  getFromHeader() {
    const configuredFrom = (process.env.EMAIL_FROM || '').trim();

    if (configuredFrom) {
      if (configuredFrom.includes('<') && configuredFrom.includes('>')) {
        return configuredFrom;
      }

      if (configuredFrom.includes('@')) {
        return `"PayQusta" <${configuredFrom}>`;
      }
    }

    const fallbackAddress = (process.env.EMAIL_USER || 'noreply@payqusta.com').trim();
    return `"PayQusta" <${fallbackAddress}>`;
  }

  buildPasswordResetEmailHtml(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #eef2f7; margin: 0; padding: 24px 0; color: #122033; }
          .shell { width: 100%; table-layout: fixed; background-color: #eef2f7; }
          .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #dbe3ee; box-shadow: 0 18px 46px rgba(15, 23, 42, 0.10); }
          .hero { background: linear-gradient(135deg, #102542 0%, #1a4f8b 52%, #3aa5ff 100%); color: #ffffff; padding: 34px 38px 30px; text-align: right; }
          .brand { display: inline-block; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.16); font-size: 12px; font-weight: 700; letter-spacing: 0.4px; margin-bottom: 18px; }
          .hero h1 { margin: 0 0 10px; font-size: 30px; line-height: 1.35; }
          .hero p { margin: 0; font-size: 15px; line-height: 1.8; color: rgba(255,255,255,0.88); }
          .content { padding: 34px 38px 22px; text-align: right; }
          .content h2 { margin: 0 0 12px; font-size: 26px; color: #122033; }
          .content p { margin: 0 0 16px; color: #4d5f76; line-height: 1.9; font-size: 15px; }
          .summary { background: #f7fafe; border: 1px solid #d9e8fb; border-radius: 18px; padding: 18px 20px; margin: 24px 0; }
          .summary strong { display: block; color: #102542; margin-bottom: 6px; font-size: 14px; }
          .summary span { color: #4d5f76; font-size: 14px; }
          .cta-wrap { text-align: center; padding: 8px 0 4px; }
          .button { display: inline-block; background: linear-gradient(135deg, #1463ff 0%, #0f4ec6 100%); color: #ffffff !important; padding: 15px 28px; text-decoration: none; border-radius: 14px; font-size: 15px; font-weight: 700; box-shadow: 0 10px 24px rgba(20, 99, 255, 0.24); }
          .link-card { margin-top: 24px; background: #fbfcfe; border: 1px dashed #c8d7ea; border-radius: 16px; padding: 16px 18px; }
          .link-card strong { display: block; color: #102542; margin-bottom: 10px; font-size: 14px; }
          .link-card a { color: #1463ff; word-break: break-all; text-decoration: none; font-size: 14px; line-height: 1.8; }
          .warning { margin-top: 24px; background: #fff8e8; border: 1px solid #f5d98c; border-radius: 16px; padding: 18px 20px; color: #7a5600; }
          .warning strong { display: block; margin-bottom: 10px; color: #5f4300; }
          .warning ul { margin: 0; padding: 0 18px 0 0; }
          .warning li { margin: 0 0 8px; line-height: 1.8; }
          .support { margin-top: 22px; font-size: 14px; color: #66778f; }
          .footer { padding: 24px 38px 34px; text-align: center; color: #8091a7; font-size: 12px; border-top: 1px solid #edf2f7; background: #fbfcfe; }
          .footer p { margin: 0 0 8px; }
          @media only screen and (max-width: 640px) {
            body { padding: 0; }
            .card { border-radius: 0; border-left: 0; border-right: 0; }
            .hero, .content, .footer { padding-left: 22px; padding-right: 22px; }
            .hero h1 { font-size: 26px; }
            .content h2 { font-size: 23px; }
          }
        </style>
      </head>
      <body>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="shell">
          <tr>
            <td align="center">
              <div class="card">
                <div class="hero">
                  <div class="brand">PayQusta Security</div>
                  <h1>إعادة تعيين كلمة المرور</h1>
                  <p>استلمنا طلبًا جديدًا لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الزر التالي لإكمال العملية بشكل آمن.</p>
                </div>
                <div class="content">
                  <h2>مرحبًا ${user.name}</h2>
                  <p>تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك على PayQusta. إذا كنت أنت صاحب الطلب، يمكنك المتابعة من خلال الزر التالي.</p>
                  <div class="summary">
                    <strong>ملخص الطلب</strong>
                    <span>الحساب: ${user.email}</span><br>
                    <span>صلاحية الرابط: ساعة واحدة من وقت الإرسال</span>
                  </div>
                  <div class="cta-wrap">
                    <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
                  </div>
                  <div class="link-card">
                    <strong>لو لم يعمل الزر، افتح الرابط التالي مباشرة:</strong>
                    <a href="${resetUrl}">${resetUrl}</a>
                  </div>
                  <div class="warning">
                    <strong>ملاحظات مهمة</strong>
                    <ul>
                      <li>هذا الرابط صالح لمدة ساعة واحدة فقط.</li>
                      <li>إذا لم تقم بهذا الطلب، تجاهل هذه الرسالة واحرص على مراجعة أمان حسابك.</li>
                      <li>لا تقم بمشاركة الرابط مع أي شخص آخر.</li>
                    </ul>
                  </div>
                  <p class="support">إذا واجهت أي مشكلة في فتح الرابط أو تأكدت أن الطلب لم يكن منك، تواصل معنا فورًا عبر support@payqusta.store.</p>
                </div>
                <div class="footer">
                  <p>© 2026 PayQusta. جميع الحقوق محفوظة.</p>
                  <p>هذه الرسالة تم إرسالها إلى ${user.email}</p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendPasswordResetEmailModern(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const subject = 'إعادة تعيين كلمة المرور - PayQusta';
    const plainText = `مرحبًا ${user.name}\n\nتلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك.\n\nاستخدم الرابط التالي لإكمال العملية:\n${resetUrl}\n\nملاحظة: الرابط صالح لمدة ساعة واحدة فقط.`;

    return this.sendEmail({
      to: user.email,
      subject,
      text: plainText,
      html: this.buildPasswordResetEmailHtml(user, resetUrl),
    });
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const emailHost = String(process.env.EMAIL_HOST || '').trim();
      const emailUser = String(process.env.EMAIL_USER || '').trim();
      const emailPass = normalizeEmailPassword(emailHost, process.env.EMAIL_PASS);

      // Check if email is configured
      if (!emailHost || !emailUser || !emailPass) {
        this.lastInitError = new Error('Email service not configured');
        logger.warn('Email service not configured. Emails will not be sent.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      this.lastInitError = null;
      logger.info('✅ Email service initialized successfully');
    } catch (error) {
      logger.error('❌ Email service initialization failed:', error);
      this.initialized = false;
      this.transporter = null;
      this.lastInitError = error;
    }
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      const error = this.lastInitError || new Error('Email service not configured');
      logger.warn(`Email not sent to ${to}: ${error.message}`);
      throw error;
    }

    try {
      const mailOptions = {
        from: this.getFromHeader(),
        to,
        subject,
        text,
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✉️ Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user, tenant) {
    const subject = 'مرحباً بك في PayQusta! 🎉';
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #666; line-height: 1.6; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          .info-box { background: #f0f7ff; border-right: 4px solid #667eea; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 مرحباً بك في PayQusta</h1>
            <p>نظام إدارة المبيعات الاحترافي</p>
          </div>
          <div class="content">
            <h2>مرحباً ${user.name}! 👋</h2>
            <p>نحن سعداء بانضمامك إلى PayQusta. حسابك جاهز الآن للاستخدام!</p>

            <div class="info-box">
              <strong>📊 معلومات حسابك:</strong><br>
              <strong>المتجر:</strong> ${tenant.name}<br>
              <strong>البريد الإلكتروني:</strong> ${user.email}<br>
              <strong>الباقة:</strong> ${tenant.subscription?.plan || 'trial'}<br>
              ${tenant.subscription?.trialEndsAt ? `<strong>تنتهي الفترة التجريبية في:</strong> ${new Date(tenant.subscription.trialEndsAt).toLocaleDateString('ar-EG')}<br>` : ''}
            </div>

            <p><strong>ماذا يمكنك أن تفعل الآن؟</strong></p>
            <ul>
              <li>✅ إضافة منتجاتك</li>
              <li>✅ إدارة عملائك</li>
              <li>✅ إنشاء الفواتير</li>
              <li>✅ متابعة المخزون</li>
              <li>✅ إرسال الفواتير عبر WhatsApp</li>
            </ul>

            <center>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="button">
                ابدأ الاستخدام الآن
              </a>
            </center>

            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 PayQusta. جميع الحقوق محفوظة.</p>
            <p>هذا البريد الإلكتروني تم إرساله إلى ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text: `مرحباً ${user.name}! مرحباً بك في PayQusta. حسابك جاهز للاستخدام.`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const subject = 'إعادة تعيين كلمة المرور - PayQusta';

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #666; line-height: 1.6; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 إعادة تعيين كلمة المرور</h1>
          </div>
          <div class="content">
            <h2>مرحباً ${user.name}</h2>
            <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>

            <p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p>

            <center>
              <a href="${resetUrl}" class="button">
                إعادة تعيين كلمة المرور
              </a>
            </center>

            <p style="color: #999; font-size: 14px;">
              أو انسخ هذا الرابط في المتصفح:<br>
              <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
            </p>

            <div class="warning">
              <strong>⚠️ ملاحظة هامة:</strong><br>
              • هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط<br>
              • إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد<br>
              • لا تشارك هذا الرابط مع أي شخص
            </div>

            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              إذا واجهت أي مشكلة، تواصل معنا.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 PayQusta. جميع الحقوق محفوظة.</p>
            <p>هذا البريد الإلكتروني تم إرساله إلى ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text: `مرحباً ${user.name}, لإعادة تعيين كلمة المرور، اضغط على الرابط: ${resetUrl}`,
      html,
    });
  }

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(customer, invoice, pdfPath) {
    const subject = `فاتورة رقم ${invoice.invoiceNumber} - ${invoice.tenant?.name || 'متجرك'}`;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .invoice-details { background: #f0f7ff; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .total { font-size: 24px; color: #11998e; font-weight: bold; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 فاتورة جديدة</h1>
          </div>
          <div class="content">
            <h2>عزيزي ${customer.name}</h2>
            <p>تم إنشاء فاتورة جديدة لك من ${invoice.tenant?.name || 'المتجر'}.</p>

            <div class="invoice-details">
              <strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}<br>
              <strong>التاريخ:</strong> ${new Date(invoice.createdAt).toLocaleDateString('ar-EG')}<br>
              <strong>إجمالي المبلغ:</strong> <span class="total">${invoice.totalAmount.toLocaleString('ar-EG')} ج.م</span><br>
              <strong>المدفوع:</strong> ${invoice.totalPaid.toLocaleString('ar-EG')} ج.م<br>
              <strong>المتبقي:</strong> ${invoice.remainingAmount.toLocaleString('ar-EG')} ج.م
            </div>

            <p>تجد الفاتورة كاملة مرفقة بهذا البريد بصيغة PDF.</p>

            <p style="margin-top: 30px; color: #666;">
              شكراً لتعاملك معنا! 🙏
            </p>
          </div>
          <div class="footer">
            <p>© 2026 PayQusta. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = pdfPath ? [{
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      path: pdfPath,
    }] : [];

    return this.sendEmail({
      to: customer.email,
      subject,
      text: `فاتورة رقم ${invoice.invoiceNumber}. الإجمالي: ${invoice.totalAmount} ج.م`,
      html,
      attachments,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(customer, invoice) {
    const subject = `تذكير بالدفع - فاتورة رقم ${invoice.invoiceNumber}`;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .amount-due { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 تذكير بالدفع</h1>
          </div>
          <div class="content">
            <h2>عزيزي ${customer.name}</h2>
            <p>هذا تذكير ودي بشأن المبلغ المستحق للفاتورة رقم <strong>${invoice.invoiceNumber}</strong>.</p>

            <div class="amount-due">
              <strong>المبلغ المستحق:</strong> <span style="font-size: 20px; color: #856404;">${invoice.remainingAmount.toLocaleString('ar-EG')} ج.م</span><br>
              <strong>تاريخ الفاتورة:</strong> ${new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
            </div>

            <p>نقدر تعاملك معنا ونأمل تسوية المبلغ في أقرب وقت ممكن.</p>

            <p style="margin-top: 30px; color: #666;">
              للاستفسار، لا تتردد في التواصل معنا.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 PayQusta. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: customer.email,
      subject,
      text: `تذكير: لديك مبلغ مستحق ${invoice.remainingAmount} ج.م للفاتورة رقم ${invoice.invoiceNumber}`,
      html,
    });
  }
}

// Singleton instance
const emailService = new EmailService();
module.exports = emailService;

