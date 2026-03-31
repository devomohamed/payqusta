/**
 * NotificationService — In-App Notification Engine
 * Creates notifications and broadcasts via Server-Sent Events (SSE)
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { userHasPermission } = require('../middleware/checkPermission');

class NotificationService {
  constructor() {
    // SSE clients map: { 'userId': [res1, res2, ...] }
    this.sseClients = new Map();
  }

  /**
   * Register an SSE client connection
   */
  addSSEClient(userId, res) {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, []);
    }
    this.sseClients.get(userId).push(res);

    // Remove on disconnect
    res.on('close', () => {
      const clients = this.sseClients.get(userId) || [];
      const idx = clients.indexOf(res);
      if (idx > -1) clients.splice(idx, 1);
      if (clients.length === 0) this.sseClients.delete(userId);
    });
  }

  /**
   * Send SSE event to a specific user
   */
  broadcastToUser(userId, notification) {
    const clients = this.sseClients.get(userId.toString()) || [];
    const data = JSON.stringify(notification);
    clients.forEach((res) => {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        // Client disconnected
      }
    });
  }

  /**
   * Create and broadcast a notification to a specific user
   */
  async send({ tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId }) {
    try {
      const notification = await Notification.create({
        tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId,
      });

      // Broadcast via SSE
      this.broadcastToUser(recipient, {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        color: notification.color,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });

      return notification;
    } catch (err) {
      logger.error(`Notification send error: ${err.message}`);
    }
  }

  async sendDeduped(payload, options = {}) {
    const {
      dedupeWindowMinutes = 180,
      extraMatch = {},
    } = options;

    const since = new Date(Date.now() - (dedupeWindowMinutes * 60 * 1000));
    const filter = {
      recipient: payload.recipient,
      type: payload.type,
      title: payload.title,
      createdAt: { $gte: since },
      ...extraMatch,
    };

    if (payload.tenant) filter.tenant = payload.tenant;
    if (payload.relatedId) filter.relatedId = payload.relatedId;
    if (payload.link) filter.link = payload.link;

    const existing = await Notification.findOne(filter).select('_id').lean();
    if (existing) return existing;

    return this.send(payload);
  }

  /**
   * Notify all admins and the vendor of a tenant
   * This ensures that store managers and owners both see important alerts
   */
  async notifyTenantAdmins(tenantId, payload, options = {}) {
    const {
      targetBranchId = null,
      roles = ['admin', 'vendor'],
      permission = null,
    } = options;
    try {
      // Find all users with requested roles in this tenant
      const recipients = await User.find({
        tenant: tenantId,
        role: { $in: roles },
        isActive: true
      }).select('_id role branch customRole tenant isSuperAdmin email');

      if (!recipients.length) return;

      const validRecipients = recipients.filter(user => {
        // Admin sees everything
        if (user.role === 'admin') return true;

        // For vendors, verify branch restriction if specified
        if (user.role === 'vendor' && targetBranchId) {
          return user.branch && user.branch.toString() === targetBranchId.toString();
        }

        return true;
      });

      const permissionEligibleRecipients = permission
        ? (await Promise.all(
            validRecipients.map(async (user) => (
              (await userHasPermission(user, permission.resource, permission.action)) ? user : null
            ))
          )).filter(Boolean)
        : validRecipients;

      const notifications = permissionEligibleRecipients.map(user =>
        this.send({
          tenant: tenantId,
          recipient: user._id,
          ...payload
        })
      );

      await Promise.all(notifications);
    } catch (err) {
      logger.error(`notifyTenantAdmins error: ${err.message}`);
    }
  }

  async notifyTenantAdminsDeduped(tenantId, payload, options = {}) {
    const {
      targetBranchId = null,
      roles = ['admin', 'vendor'],
      permission = null,
      dedupeWindowMinutes = 180,
      extraMatch = {},
    } = options;

    try {
      const recipients = await User.find({
        tenant: tenantId,
        role: { $in: roles },
        isActive: true
      }).select('_id role branch customRole tenant isSuperAdmin email');

      if (!recipients.length) return;

      const validRecipients = recipients.filter((user) => {
        if (user.role === 'admin') return true;
        if (user.role === 'vendor' && targetBranchId) {
          return user.branch && user.branch.toString() === targetBranchId.toString();
        }
        return true;
      });

      const permissionEligibleRecipients = permission
        ? (await Promise.all(
            validRecipients.map(async (user) => (
              (await userHasPermission(user, permission.resource, permission.action)) ? user : null
            ))
          )).filter(Boolean)
        : validRecipients;

      await Promise.all(
        permissionEligibleRecipients.map((user) =>
          this.sendDeduped({
            tenant: tenantId,
            recipient: user._id,
            ...payload,
          }, { dedupeWindowMinutes, extraMatch })
        )
      );
    } catch (err) {
      logger.error(`notifyTenantAdminsDeduped error: ${err.message}`);
    }
  }

  /**
   * Notify all super admin users (no tenant scope)
   */
  async notifySuperAdmins(payload) {
    try {
      const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'super@payqusta.com').toLowerCase();
      const superAdmins = await User.find({
        $or: [
          { isSuperAdmin: true },
          { email: superAdminEmail },
        ],
        isActive: true,
      }).select('_id');

      if (!superAdmins.length) return;

      await Promise.all(
        superAdmins.map((admin) =>
          this.send({
            tenant: null, // super admin notifications are tenant-free
            recipient: admin._id,
            ...payload,
          })
        )
      );
    } catch (err) {
      logger.error(`notifySuperAdmins error: ${err.message}`);
    }
  }

  /**
   * Legacy wrapper for backward compatibility
   */
  async notifyVendor(tenantId, payload, options = {}) {
    return this.notifyTenantAdmins(tenantId, payload, options);
  }

  // ============ SPECIFIC NOTIFICATION METHODS ============

  /**
   * Invoice created notification
   */
  async onInvoiceCreated(tenantId, invoice, customerName) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const isPortalOrder = invoice?.source === 'portal' || invoice?.source === 'online_store';
    const orderRecipientName = invoice?.shippingAddress?.fullName || customerName;

    if (isPortalOrder) {
      return this.notifyTenantAdmins(tenantId, {
        type: 'order',
        title: 'طلب جديد من البوابة',
        message: `تم استلام طلب جديد #${invoice.invoiceNumber} باسم ${orderRecipientName || 'عميل'} بقيمة ${fmt(invoice.totalAmount)} ج.م`,
        icon: 'shopping-bag',
        color: 'primary',
        link: `/portal-orders/${invoice._id}`,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
      }, { targetBranchId: invoice.branch });
    }

    return this.notifyTenantAdmins(tenantId, {
      type: 'invoice_created',
      title: 'فاتورة جديدة',
      message: `تم إنشاء فاتورة ${invoice.invoiceNumber} للعميل ${customerName} بمبلغ ${fmt(invoice.totalAmount)} ج.م`,
      icon: 'file-text',
      color: 'primary',
      link: '/invoices',
      relatedModel: 'Invoice',
      relatedId: invoice._id,
    }, { targetBranchId: invoice.branch });
  }

  /**
   * Payment received notification
   */
  async onPaymentReceived(tenantId, invoice, amount, customerName) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'payment_received',
      title: 'تم استلام دفعة 💰',
      message: `استلمت ${fmt(amount)} ج.م من ${customerName} — فاتورة ${invoice.invoiceNumber}. المتبقي: ${fmt(invoice.remainingAmount)} ج.م`,
      icon: 'credit-card',
      color: 'success',
      link: '/invoices',
      relatedModel: 'Invoice',
      relatedId: invoice._id,
    }, { targetBranchId: invoice.branch });
  }

  /**
   * Installment due tomorrow
   */
  async onInstallmentDue(tenantId, customerName, invoiceNumber, amount, dueDate, branchId = null) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const dateStr = new Date(dueDate).toLocaleDateString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'installment_due',
      title: 'قسط مستحق غداً ⏰',
      message: `العميل ${customerName} عليه قسط ${fmt(amount)} ج.م مستحق ${dateStr} — فاتورة ${invoiceNumber}`,
      icon: 'clock',
      color: 'warning',
      link: '/invoices',
    }, { roles: branchId ? ['admin', 'vendor'] : ['admin'], targetBranchId: branchId });
  }

  /**
   * Installment overdue
   */
  async onInstallmentOverdue(tenantId, customerName, invoiceNumber, amount, branchId = null) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'installment_overdue',
      title: 'قسط متأخر! ⚠️',
      message: `العميل ${customerName} متأخر عن قسط ${fmt(amount)} ج.م — فاتورة ${invoiceNumber}`,
      icon: 'alert-triangle',
      color: 'danger',
      link: '/invoices',
    }, { roles: branchId ? ['admin', 'vendor'] : ['admin'], targetBranchId: branchId });
  }

  /**
   * Low stock alert
   */
  async onLowStock(tenantId, product) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'low_stock',
      title: 'مخزون منخفض ⚠️',
      message: `المنتج "${product.name}" وصل ${product.stock.quantity} ${product.stock.unit} فقط (الحد الأدنى: ${product.stock.minQuantity})`,
      icon: 'package-x',
      color: 'warning',
      link: '/products',
      relatedModel: 'Product',
      relatedId: product._id,
    });
  }

  /**
   * Out of stock alert
   */
  async onOutOfStock(tenantId, product) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'out_of_stock',
      title: 'منتج نفذ من المخزون! 🚨',
      message: `المنتج "${product.name}" نفذ تماماً من المخزون`,
      icon: 'package-x',
      color: 'danger',
      link: '/products',
      relatedModel: 'Product',
      relatedId: product._id,
    });
  }

  /**
   * Supplier payment due
   * Supports legacy signature (supplierName, amount, dueDate) and payload object.
   */
  async onSupplierPaymentDue(tenantId, supplierNameOrPayload, amount, dueDate) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const payload = (typeof supplierNameOrPayload === 'object' && supplierNameOrPayload !== null)
      ? supplierNameOrPayload
      : {
        supplierName: supplierNameOrPayload,
        amount,
        dueDate,
      };

    const normalizedDueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    const dueDateText = normalizedDueDate && !Number.isNaN(normalizedDueDate.getTime())
      ? normalizedDueDate.toLocaleDateString('ar-EG')
      : 'اليوم';

    const contextParts = [];
    if (payload.branchName) contextParts.push(`الفرع: ${payload.branchName}`);
    if (payload.invoiceNumber) contextParts.push(`فاتورة: ${payload.invoiceNumber}`);
    if (payload.purchaseOrderNumber) contextParts.push(`أمر شراء: ${payload.purchaseOrderNumber}`);
    const context = contextParts.length > 0 ? ` (${contextParts.join(' • ')})` : '';

    const isOverdue = Boolean(payload.isOverdue);
    const dueLabel = payload.dueLabel || (isOverdue ? 'متأخر' : 'مستحق');
    const remainingLabel = payload.outstandingAmount !== undefined
      ? ` • المتبقي: ${fmt(payload.outstandingAmount)} ج.م`
      : '';

    return this.notifyTenantAdmins(tenantId, {
      type: isOverdue ? 'supplier_payment_overdue' : 'supplier_payment_due',
      title: isOverdue ? 'تنبيه تأخير مستحق مورد ⚠️' : 'تذكير مستحق مورد ⏰',
      message: `المورد ${payload.supplierName || '—'} عليه قسط ${fmt(payload.amount)} ج.م ${dueLabel} ${dueDateText}${remainingLabel}${context}`,
      icon: 'truck',
      color: isOverdue ? 'danger' : 'warning',
      link: '/supplier-purchase-invoices',
      relatedModel: payload.relatedModel || undefined,
      relatedId: payload.relatedId || undefined,
    }, {
      roles: payload.branchId ? ['admin', 'vendor'] : ['admin'],
      targetBranchId: payload.branchId || null,
    });
  }

  async onSupplierPaymentOverdue(tenantId, payload = {}) {
    return this.onSupplierPaymentDue(tenantId, {
      ...payload,
      isOverdue: true,
      dueLabel: payload.dueLabel || 'متأخر منذ',
    });
  }

  async onSupplierPaymentRecorded(tenantId, payload = {}) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const branchLabel = payload.branchName ? ` • الفرع: ${payload.branchName}` : '';
    const poLabel = payload.purchaseOrderNumber ? ` • أمر شراء: ${payload.purchaseOrderNumber}` : '';
    const invoiceLabel = payload.invoiceNumber ? ` • فاتورة: ${payload.invoiceNumber}` : '';

    return this.notifyTenantAdmins(tenantId, {
      type: 'supplier_payment_recorded',
      title: 'تم تسجيل دفعة للمورد ✅',
      message: `تم سداد ${fmt(payload.amount)} ج.م للمورد ${payload.supplierName || '—'}${invoiceLabel}${branchLabel}${poLabel} • المتبقي: ${fmt(payload.outstandingAmount)} ج.م`,
      icon: 'credit-card',
      color: 'success',
      link: '/supplier-purchase-invoices',
    }, {
      roles: payload.branchId ? ['admin', 'vendor'] : ['admin'],
      targetBranchId: payload.branchId || null,
    });
  }

  async onNewCustomer(tenantId, customerName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'new_customer',
      title: 'عميل جديد 🎉',
      message: `تم إضافة العميل "${customerName}" بنجاح`,
      icon: 'user-plus',
      color: 'success',
      link: '/customers',
    });
  }

  /**
   * Customer upgraded to VIP
   */
  async onCustomerVIP(tenantId, customerName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'customer_vip',
      title: 'ترقية عميل ⭐',
      message: `العميل "${customerName}" ترقى لعميل VIP! النقاط تخطت 2000`,
      icon: 'star',
      color: 'primary',
      link: '/customers',
    });
  }

  /**
   * Expense created
   */
  async onExpenseCreated(tenantId, { title, amount, category, createdByName, branchId }) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'expense_created',
      title: 'تم تسجيل مصروف 💸',
      message: `${createdByName} سجل مصروف "${title}" بقيمة ${fmt(amount)} ج.م`,
      icon: 'credit-card',
      color: 'gray',
      link: '/expenses',
    }, { roles: branchId ? ['admin', 'vendor'] : ['admin'], targetBranchId: branchId });
  }

  /**
   * Branch created
   */
  async onBranchCreated(tenantId, branchName, creatorName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'branch_created',
      title: 'تم افتتاح فرع جديد! 🏪',
      message: `تم إنشاء فرع "${branchName}" بنجاح بواسطة ${creatorName}`,
      icon: 'store', // Lucide icon name, might need mapping in frontend but 'store' is standard or mapped to something similar
      color: 'success',
      link: '/settings', // Or dashboard
    }, { roles: ['admin'] });
  }

  /**
   * Subscription request approved
   * Notifies the tenant admins AND the super admin
   */
  async onSubscriptionApproved(tenantId, planName, tenantName = '') {
    // Notify tenant owner
    await this.notifyTenantAdmins(tenantId, {
      type: 'subscription_approved',
      title: 'تم تفعيل اشتراكك بنجاح! 🎉',
      message: `تم الموافقة على إيصال الدفع وتفعيل باقة "الباقة". شكراً لثقتكم.`.replace('الباقة', planName),
      icon: 'check-circle',
      color: 'success',
      link: '/subscriptions',
    }, { roles: ['admin'] });

    // Notify super admin
    await this.notifySuperAdmins({
      type: 'subscription_approved',
      title: `تم تفعيل اشتراك ${tenantName || ''} ✅`,
      message: `تم قبول إيصال الدفع وتفعيل باقة "الباقة" للمتجر ${tenantName}`.replace('الباقة', planName).replace('${tenantName}', tenantName),
      icon: 'check-circle',
      color: 'success',
      link: '/super-admin/requests',
    });
  }

  /**
   * Subscription request rejected
   * Notifies the tenant admins AND the super admin
   */
  async onSubscriptionRejected(tenantId, reason, tenantName = '') {
    // Notify tenant owner
    await this.notifyTenantAdmins(tenantId, {
      type: 'subscription_rejected',
      title: 'تم رفض إيصال الدفع ❌',
      message: `عذراً، لم يتم قبول إيصال الدفع الأخير. السبب: ${reason || 'يرجى مراجعة الدعم الفني.'}`,
      icon: 'alert-circle',
      color: 'danger',
      link: '/subscriptions',
    }, { roles: ['admin'] });

    // Notify super admin
    await this.notifySuperAdmins({
      type: 'subscription_rejected',
      title: `تم رفض اشتراك ${tenantName}`,
      message: `تم رفض إيصال الدفع للمتجر ${tenantName}. السبب: ${reason || 'غير محدد'}`,
      icon: 'alert-circle',
      color: 'danger',
      link: '/super-admin/requests',
    });
  }

  /**
   * New subscription receipt submitted (super admin needs to review)
   */
  async onNewSubscriptionRequest(tenantId, tenantName, planName, amount) {
    await this.notifySuperAdmins({
      type: 'system',
      title: `طلب اشتراك جديد تحتاج مراجعة 💳`,
      message: `المتجر "${tenantName}" قدم إيصال دفع لباقة "${planName}" بمبلغ ${amount}. يرجى المراجعة والتأكيد.`,
      icon: 'credit-card',
      color: 'warning',
      link: '/super-admin/requests',
    });
  }

  async onSupplierReplenishmentRequested(tenantId, request) {
    if (!tenantId || !request?._id) return null;

    const branchName = request.branch?.name || 'الفرع';
    const productName = request.product?.name || 'الصنف';
    const supplierName = request.supplier?.name || 'المورد';
    const qty = Number(request.requestedQty || 0).toLocaleString('ar-EG');

    return this.notifyTenantAdminsDeduped(tenantId, {
      type: 'system',
      title: 'طلب مورد جديد من الفرع',
      message: `تم إنشاء طلب مورد جديد من ${branchName} للصنف ${productName} بكمية ${qty} من ${supplierName}.`,
      icon: 'package-plus',
      color: 'warning',
      link: '/supplier-replenishment-requests',
      relatedModel: null,
      relatedId: request._id,
    }, {
      roles: ['admin', 'vendor', 'coordinator'],
      permission: { resource: 'supplier_replenishment_requests', action: 'update' },
      dedupeWindowMinutes: 120,
    });
  }

  async onSupplierReplenishmentReviewed(tenantId, request, status) {
    if (!tenantId || !request?._id || !request?.createdBy?._id) return null;

    const isApproved = status === 'approved';
    const title = isApproved ? 'تم اعتماد طلب المورد' : 'تم رفض طلب المورد';
    const branchName = request.branch?.name || 'الفرع';
    const productName = request.product?.name || 'الصنف';
    const reviewerName = request.reviewedBy?.name || request.reviewedBy?.email || 'المراجعة';
    const message = isApproved
      ? `تم اعتماد طلب المورد الخاص بالفرع ${branchName} للصنف ${productName} بواسطة ${reviewerName}.`
      : `تم رفض طلب المورد الخاص بالفرع ${branchName} للصنف ${productName} بواسطة ${reviewerName}.`;

    return this.sendDeduped({
      tenant: tenantId,
      recipient: request.createdBy._id,
      type: 'system',
      title,
      message,
      icon: isApproved ? 'check-circle' : 'alert-circle',
      color: isApproved ? 'success' : 'danger',
      link: '/supplier-replenishment-requests',
      relatedModel: null,
      relatedId: request._id,
    }, {
      dedupeWindowMinutes: 120,
    });
  }

  async onSupplierReplenishmentConverted(tenantId, request, purchaseOrder) {
    if (!tenantId || !request?._id || !purchaseOrder?._id) return null;

    const recipients = [
      request.createdBy?._id,
      request.reviewedBy?._id,
    ].filter(Boolean);

    const uniqueRecipients = [...new Set(recipients.map((id) => String(id)))];
    if (!uniqueRecipients.length) return null;

    const branchName = request.branch?.name || 'الفرع';
    const productName = request.product?.name || 'الصنف';
    const orderNumber = purchaseOrder.orderNumber || purchaseOrder._id;

    return Promise.all(
      uniqueRecipients.map((recipient) => this.sendDeduped({
        tenant: tenantId,
        recipient,
        type: 'system',
        title: 'تم تحويل طلب المورد إلى أمر شراء',
        message: `تم تحويل طلب المورد الخاص بالفرع ${branchName} للصنف ${productName} إلى أمر الشراء ${orderNumber}.`,
        icon: 'file-text',
        color: 'primary',
        link: `/purchase-orders?highlight=${purchaseOrder._id}`,
        relatedModel: 'PurchaseOrder',
        relatedId: purchaseOrder._id,
      }, {
        dedupeWindowMinutes: 120,
      }))
    );
  }

  async onAutoBackupFailure(tenantId, details = {}) {
    const when = details.failedAt ? new Date(details.failedAt).toLocaleString('ar-EG') : 'الآن';
    const errorMessage = String(details.error || 'فشل حفظ النسخة الاحتياطية التلقائية').slice(0, 300);

    return this.notifyTenantAdmins(tenantId, {
      type: 'system',
      title: 'فشل النسخ الاحتياطي التلقائي',
      message: `تعذر إنشاء أو حفظ النسخة الاحتياطية التلقائية في ${when}. السبب: ${errorMessage}`,
      icon: 'database',
      color: 'danger',
      link: '/backup',
    }, { roles: ['admin', 'vendor'] });
  }
}

// Singleton
module.exports = new NotificationService();
