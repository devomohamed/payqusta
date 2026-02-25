const router = require('express').Router();
const planController = require('../controllers/planController');

// Public or User-facing route to fetch available plans
router.get('/', planController.getAllPlans);

module.exports = router;
