const opsController = require('../controllers/opsController');

function registerOperationalRoutes(app) {
  app.get('/api/health', (req, res) => opsController.getPublicHealth(req, res));
  app.get('/api/health/live', (req, res) => opsController.getLiveness(req, res));
  app.get('/api/health/ready', (req, res) => opsController.getReadiness(req, res));
}

module.exports = { registerOperationalRoutes };
