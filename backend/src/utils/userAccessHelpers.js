const mongoose = require('mongoose');

const AppError = require('./AppError');
const Branch = require('../models/Branch');
const Role = require('../models/Role');
const { ROLES } = require('../config/constants');
const { BRANCH_MANAGER_ROLE_NAME } = require('../services/systemRoleService');

const STANDARD_ROLES = new Set(Object.values(ROLES));
const BRANCH_ACCESS_MODES = ['all_branches', 'assigned_branches', 'single_branch'];

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const dedupeIds = (values = []) => {
  const seen = new Set();
  return values.filter((value) => {
    if (!value) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const resolveStoredRoleBaseRole = (roleDoc, fallbackRole) => {
  if (roleDoc?.name === BRANCH_MANAGER_ROLE_NAME) {
    return ROLES.COORDINATOR;
  }

  return fallbackRole;
};

const resolveUserRoleAssignment = async ({ tenantId, role, customRole, fallbackRole = ROLES.VENDOR }) => {
  let resolvedRole = role || fallbackRole;

  if (customRole !== undefined && customRole !== null && customRole !== '') {
    const roleDoc = await Role.findOne({ _id: customRole, tenant: tenantId }).select('_id name');
    if (!roleDoc) {
      throw AppError.badRequest('الدور المخصص غير موجود في هذا المتجر');
    }
    if (!STANDARD_ROLES.has(resolvedRole)) {
      resolvedRole = fallbackRole;
    }
    return {
      role: resolveStoredRoleBaseRole(roleDoc, resolvedRole),
      customRole: roleDoc._id,
    };
  }

  if (customRole === null || customRole === '') {
    if (!STANDARD_ROLES.has(resolvedRole)) {
      resolvedRole = fallbackRole;
    }
    return { role: resolvedRole, customRole: null };
  }

  if (!STANDARD_ROLES.has(resolvedRole)) {
    const roleDoc = await Role.findOne({ name: resolvedRole, tenant: tenantId }).select('_id name');
    if (!roleDoc) {
      throw AppError.badRequest('الدور غير معروف');
    }
    return {
      role: resolveStoredRoleBaseRole(roleDoc, fallbackRole),
      customRole: roleDoc._id,
    };
  }

  return { role: resolvedRole, customRole: null };
};

const resolveUserBranchAssignment = async ({
  tenantId,
  branch,
  primaryBranch,
  assignedBranches,
  branchAccessMode,
  existingUser = null,
}) => {
  const hasBranchFields =
    branch !== undefined
    || primaryBranch !== undefined
    || assignedBranches !== undefined
    || branchAccessMode !== undefined;

  if (!hasBranchFields && existingUser) {
    return null;
  }

  const initialPrimaryBranch = normalizeObjectId(
    primaryBranch !== undefined ? primaryBranch : branch !== undefined ? branch : existingUser?.primaryBranch || existingUser?.branch || null
  );
  const initialAssignedBranches = Array.isArray(assignedBranches)
    ? assignedBranches.map(normalizeObjectId)
    : (existingUser?.assignedBranches || []).map(normalizeObjectId);

  const branchIds = dedupeIds([
    ...initialAssignedBranches,
    initialPrimaryBranch,
  ].filter(Boolean));

  if (branchIds.length > 0) {
    const validIds = branchIds.filter((value) => mongoose.Types.ObjectId.isValid(value));
    if (validIds.length !== branchIds.length) {
      throw AppError.badRequest('أحد الفروع المحددة غير صالح');
    }

    const foundBranches = await Branch.find({
      _id: { $in: validIds },
      tenant: tenantId,
      isActive: true,
    }).select('_id');

    if (foundBranches.length !== validIds.length) {
      throw AppError.badRequest('أحد الفروع المحددة غير موجود في هذا المتجر');
    }
  }

  const nextBranchAccessMode = branchAccessMode
    || existingUser?.branchAccessMode
    || (initialPrimaryBranch ? 'single_branch' : 'all_branches');

  if (!BRANCH_ACCESS_MODES.includes(nextBranchAccessMode)) {
    throw AppError.badRequest('وضع الوصول إلى الفروع غير صالح');
  }

  if (nextBranchAccessMode === 'single_branch' && !initialPrimaryBranch) {
    throw AppError.badRequest('يجب تحديد فرع رئيسي عند اختيار فرع واحد فقط');
  }

  if (nextBranchAccessMode === 'assigned_branches' && branchIds.length === 0) {
    throw AppError.badRequest('يجب تحديد فرع واحد على الأقل للوصول المحدد');
  }

  return {
    branch: initialPrimaryBranch || null,
    primaryBranch: initialPrimaryBranch || null,
    assignedBranches: branchIds,
    branchAccessMode: nextBranchAccessMode,
  };
};

module.exports = {
  BRANCH_ACCESS_MODES,
  STANDARD_ROLES,
  resolveUserRoleAssignment,
  resolveUserBranchAssignment,
};
