/**
 * Email Service — Send Emails using Nodemailer
 * Supports: Welcome emails, Password reset, Invoices, Notifications
 */

const nodemailer = require('nodemailer');
const path = require('path');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
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

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Check if email is configured
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn('Email service not configured. Emails will not be sent.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      logger.info('✅ Email service initialized successfully');
    } catch (error) {
      logger.error('❌ Email service initialization failed:', error);
      this.initialized = false;
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
      logger.warn(`Email not sent to ${to}: Service not initialized`);
      return { success: false, message: 'Email service not configured' };
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
      return { success: false, error: error.message };
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
