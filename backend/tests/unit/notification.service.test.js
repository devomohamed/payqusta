jest.mock('../../src/models/Notification', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const Notification = require('../../src/models/Notification');
const User = require('../../src/models/User');
const NotificationService = require('../../src/services/NotificationService');

describe('NotificationService dedupe helpers', () => {
  const mockFindOneResult = (value) => {
    const query = {
      select: jest.fn(() => query),
      lean: jest.fn().mockResolvedValue(value),
    };
    return query;
  };

  const mockUserFindResult = (value) => {
    const query = {
      select: jest.fn().mockResolvedValue(value),
    };
    return query;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendDeduped returns the existing notification without creating a duplicate', async () => {
    const existingNotification = { _id: 'existing-notification' };
    Notification.findOne.mockReturnValue(mockFindOneResult(existingNotification));

    const result = await NotificationService.sendDeduped({
      tenant: 'tenant-1',
      recipient: 'user-1',
      type: 'order_status',
      title: 'تحويل يحتاج متابعة',
      message: 'التحويل ما زال متأخراً',
      link: '/stock-transfers/1',
      relatedId: 'invoice-1',
    });

    expect(result).toBe(existingNotification);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('sendDeduped creates a notification when no recent duplicate exists', async () => {
    Notification.findOne.mockReturnValue(mockFindOneResult(null));
    Notification.create.mockResolvedValue({
      _id: 'new-notification',
      type: 'order_status',
      title: 'تحويل يحتاج متابعة',
      message: 'التحويل ما زال متأخراً',
      createdAt: new Date(),
    });

    const result = await NotificationService.sendDeduped({
      tenant: 'tenant-1',
      recipient: 'user-1',
      type: 'order_status',
      title: 'تحويل يحتاج متابعة',
      message: 'التحويل ما زال متأخراً',
      link: '/stock-transfers/1',
      relatedId: 'invoice-1',
    });

    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(result._id).toBe('new-notification');
  });

  it('notifyTenantAdminsDeduped fans out only to allowed recipients', async () => {
    User.find.mockReturnValue(mockUserFindResult([
      { _id: 'admin-1', role: 'admin', branch: null },
      { _id: 'vendor-1', role: 'vendor', branch: 'branch-1' },
      { _id: 'vendor-2', role: 'vendor', branch: 'branch-2' },
    ]));
    Notification.findOne.mockImplementation(() => mockFindOneResult(null));
    Notification.create.mockResolvedValue({
      _id: 'created',
      type: 'order_status',
      title: 'تحويل يحتاج متابعة',
      message: 'التحويل ما زال متأخراً',
      createdAt: new Date(),
    });

    await NotificationService.notifyTenantAdminsDeduped('tenant-1', {
      type: 'order_status',
      title: 'تحويل يحتاج متابعة',
      message: 'التحويل ما زال متأخراً',
      link: '/stock-transfers/1',
      relatedId: 'invoice-1',
    }, {
      roles: ['admin', 'vendor'],
      targetBranchId: 'branch-1',
    });

    expect(Notification.create).toHaveBeenCalledTimes(2);
    expect(Notification.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tenant: 'tenant-1',
      recipient: 'admin-1',
    }));
    expect(Notification.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tenant: 'tenant-1',
      recipient: 'vendor-1',
    }));
  });
});
