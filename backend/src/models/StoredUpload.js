const mongoose = require('mongoose');

const StoredUploadSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  folder: {
    type: String,
    default: '',
    trim: true,
  },
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  contentType: {
    type: String,
    required: true,
    default: 'application/octet-stream',
    trim: true,
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  data: {
    type: Buffer,
    required: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.models.StoredUpload || mongoose.model('StoredUpload', StoredUploadSchema);
