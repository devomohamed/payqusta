/**
 * Role Model — Custom Roles with Granular Permissions
 */

const mongoose = require('mongoose');
const { RESOURCE_VALUES, ACTION_VALUES } = require('../config/permissions');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الدور مطلوب'],
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    isSystem: {
      type: Boolean,
      default: false, // System roles cannot be edited/deleted
    },
    permissions: [
      {
        resource: {
          type: String,
          required: true,
          enum: RESOURCE_VALUES,
        },
        actions: {
          type: [String],
          enum: ACTION_VALUES,
          default: [],
        },
      },
    ],
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index
roleSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
