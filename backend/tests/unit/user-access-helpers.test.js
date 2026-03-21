jest.mock('../../src/models/Branch', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Role', () => ({
  findOne: jest.fn(),
}));

const Branch = require('../../src/models/Branch');
const Role = require('../../src/models/Role');
const AppError = require('../../src/utils/AppError');
const {
  resolveUserRoleAssignment,
  resolveUserBranchAssignment,
} = require('../../src/utils/userAccessHelpers');

describe('userAccessHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveUserRoleAssignment', () => {
    it('resolves custom role ids inside the current tenant', async () => {
      Role.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'role-1' }),
      });

      const result = await resolveUserRoleAssignment({
        tenantId: 'tenant-1',
        role: 'vendor',
        customRole: 'role-1',
      });

      expect(Role.findOne).toHaveBeenCalledWith({ _id: 'role-1', tenant: 'tenant-1' });
      expect(result).toEqual({ role: 'vendor', customRole: 'role-1' });
    });

    it('maps unknown dynamic role names to stored tenant roles', async () => {
      Role.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'role-auditor' }),
      });

      const result = await resolveUserRoleAssignment({
        tenantId: 'tenant-1',
        role: 'auditor',
        customRole: undefined,
      });

      expect(Role.findOne).toHaveBeenCalledWith({ name: 'auditor', tenant: 'tenant-1' });
      expect(result).toEqual({ role: 'vendor', customRole: 'role-auditor' });
    });

    it('rejects missing custom roles', async () => {
      Role.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        resolveUserRoleAssignment({
          tenantId: 'tenant-1',
          role: 'vendor',
          customRole: 'missing-role',
        })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('resolveUserBranchAssignment', () => {
    it('requires a primary branch in single_branch mode', async () => {
      await expect(
        resolveUserBranchAssignment({
          tenantId: '507f1f77bcf86cd799439011',
          branchAccessMode: 'single_branch',
        })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('deduplicates assigned branches and keeps the primary branch included', async () => {
      const branchA = '507f1f77bcf86cd799439011';
      const branchB = '507f1f77bcf86cd799439012';

      Branch.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: branchA }, { _id: branchB }]),
      });

      const result = await resolveUserBranchAssignment({
        tenantId: 'tenant-1',
        primaryBranch: branchA,
        assignedBranches: [branchA, branchB, branchA],
        branchAccessMode: 'assigned_branches',
      });

      expect(Branch.find).toHaveBeenCalledWith({
        _id: { $in: [branchA, branchB] },
        tenant: 'tenant-1',
        isActive: true,
      });
      expect(result).toEqual({
        branch: branchA,
        primaryBranch: branchA,
        assignedBranches: [branchA, branchB],
        branchAccessMode: 'assigned_branches',
      });
    });

    it('rejects invalid branch ids before hitting the database', async () => {
      await expect(
        resolveUserBranchAssignment({
          tenantId: 'tenant-1',
          primaryBranch: 'not-an-object-id',
          branchAccessMode: 'single_branch',
        })
      ).rejects.toBeInstanceOf(AppError);

      expect(Branch.find).not.toHaveBeenCalled();
    });
  });
});
