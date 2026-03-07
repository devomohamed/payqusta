/**
 * Notification Controller
 * Handles fetching, marking as read, deleting, and SSE streaming for backoffice users.
 */

const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');

const isSuperAdminUser = (user = {}) =>
  Boolean(
    user.isSuperAdmin ||
    user.email?.toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || 'super@payqusta.com').toLowerCase()
  );

// Keep owner/admin notifications isolated from customer notifications.
const buildOwnerNotificationFilter = (req, extra = {}) => {
  const filter = {
    recipient: req.user._id,
    $or: [
      { customerRecipient: { $exists: false } },
      { customerRecipient: null },
    ],
    ...extra,
  };

  if (!isSuperAdminUser(req.user) && req.tenantId) {
    filter.tenant = req.tenantId;
  }

  return filter;
};

class NotificationController {
  /**
   * GET /api/v1/notifications
   * Get paginated notifications for current backoffice user.
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = buildOwnerNotificationFilter(req);

      if (req.query.unread === 'true') filter.isRead = false;
      if (req.query.type) filter.type = req.query.type;

      const [notifications, total] = await Promise.all([
        Notification.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, notifications, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const filter = buildOwnerNotificationFilter(req, { isRead: false });
      const count = await Notification.countDocuments(filter);
      ApiResponse.success(res, { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const filter = buildOwnerNotificationFilter(req, { _id: req.params.id });
      await Notification.findOneAndUpdate(filter, { isRead: true, readAt: new Date() });
      ApiResponse.success(res, null, 'تم التعليم كمقروء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const filter = buildOwnerNotificationFilter(req, { isRead: false });
      await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
      ApiResponse.success(res, null, 'تم تعليم الكل كمقروء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   */
  async deleteOne(req, res, next) {
    try {
      const filter = buildOwnerNotificationFilter(req, { _id: req.params.id });
      await Notification.findOneAndDelete(filter);
      ApiResponse.success(res, null, 'تم حذف الإشعار');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/stream
   * Server-Sent Events (SSE) endpoint for real-time notifications.
   */
  async stream(req, res, next) {
    try {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'متصل بنظام الإشعارات' })}\n\n`);

      if (res.flush) {
        res.flush();
      }

      NotificationService.addSSEClient(req.user._id.toString(), res);

      const keepAlive = setInterval(() => {
        try {
          if (!res.writableEnded) {
            res.write(':\n\n');
            if (res.flush) res.flush();
          } else {
            clearInterval(keepAlive);
          }
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(keepAlive);
      };

      req.on('close', cleanup);
      req.on('error', cleanup);
      res.on('finish', cleanup);
      res.on('error', cleanup);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
