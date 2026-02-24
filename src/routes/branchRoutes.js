/**
 * Branch Routes
 */

const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const checkLimit = require('../middleware/checkLimit');
const { authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

// All routes require authentication (handled by parent router)

router.get('/', authorize('vendor', 'admin', 'coordinator'), checkPermission('branches', 'read'), branchController.getBranches);
router.post('/', authorize('vendor', 'admin'), checkPermission('branches', 'create'), checkLimit('store'), branchController.createBranch);
router.put('/:id', authorize('vendor', 'admin'), checkPermission('branches', 'update'), branchController.updateBranch);
router.delete('/:id', authorize('vendor', 'admin'), checkPermission('branches', 'delete'), branchController.deleteBranch);

// Branch Stats & Management
router.get('/:id/stats', authorize('vendor', 'admin', 'coordinator'), checkPermission('branches', 'read'), branchController.getBranchStats);

// Shift Management
router.post('/:id/shift/start', authorize('vendor', 'admin', 'coordinator'), checkPermission('branches', 'update'), branchController.startShift);
router.post('/:id/shift/end', authorize('vendor', 'admin', 'coordinator'), checkPermission('branches', 'update'), branchController.endShift);

// Settlement
router.post('/:id/settlement', authorize('vendor', 'admin', 'coordinator'), checkPermission('branches', 'update'), branchController.settleBranch);

module.exports = router;
