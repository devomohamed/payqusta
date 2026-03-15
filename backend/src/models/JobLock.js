const mongoose = require('mongoose');

const jobLockSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  jobName: {
    type: String,
    required: true,
    index: true,
  },
  contextKey: {
    type: String,
    default: 'global',
  },
  ownerId: {
    type: String,
    required: true,
  },
  acquiredAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

jobLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.JobLock || mongoose.model('JobLock', jobLockSchema);
