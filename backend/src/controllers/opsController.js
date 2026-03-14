const {
  createLivenessPayload,
  createPublicHealthPayload,
  createReadinessPayload,
  createOpsStatusPayload,
  createOpsMetricsPayload,
} = require('../ops/healthService');

class OpsController {
  getLiveness(req, res) {
    return res.status(200).json(createLivenessPayload());
  }

  getPublicHealth(req, res) {
    return res.status(200).json(createPublicHealthPayload());
  }

  getReadiness(req, res) {
    const payload = createReadinessPayload();
    return res.status(payload.statusCode).json(payload.body);
  }

  getOpsStatus(req, res) {
    return res.status(200).json(createOpsStatusPayload({ req }));
  }

  getOpsMetrics(req, res) {
    return res
      .status(200)
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(createOpsMetricsPayload());
  }
}

module.exports = new OpsController();
