const StoredUpload = require('../models/StoredUpload');

const BACKUP_FOLDER_ROOT = 'tenant-backups';

function pad(value) {
  return String(value).padStart(2, '0');
}

function normalizeTenantId(tenantId) {
  return String(tenantId || '').trim();
}

function buildBackupFolder(tenantId, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  return `${BACKUP_FOLDER_ROOT}/${normalizeTenantId(tenantId)}/${year}/${month}`;
}

function buildBackupKey(tenantId, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const filename = `backup-${year}-${month}-${day}.json`;
  return {
    key: `${buildBackupFolder(tenantId, date)}/${filename}`,
    filename,
    folder: buildBackupFolder(tenantId, date),
  };
}

function buildTenantBackupPrefix(tenantId) {
  return `${BACKUP_FOLDER_ROOT}/${normalizeTenantId(tenantId)}/`;
}

async function saveAutoBackup({ tenantId, payload, date = new Date() }) {
  const { key, folder, filename } = buildBackupKey(tenantId, date);
  const data = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');

  const storedUpload = await StoredUpload.findOneAndUpdate(
    { key },
    {
      key,
      folder,
      filename,
      contentType: 'application/json',
      size: data.length,
      data,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    key,
    folder,
    filename,
    size: storedUpload.size,
    createdAt: storedUpload.createdAt,
    updatedAt: storedUpload.updatedAt,
  };
}

async function listTenantBackups(tenantId, { limit = 5 } = {}) {
  const prefix = buildTenantBackupPrefix(tenantId);
  const uploads = await StoredUpload.find({
    folder: { $regex: `^${prefix}` },
  })
    .select('key folder filename size createdAt updatedAt')
    .sort({ createdAt: -1 })
    .limit(limit);

  return uploads.map((upload) => ({
    key: upload.key,
    folder: upload.folder,
    filename: upload.filename,
    size: upload.size,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  }));
}

async function countTenantBackups(tenantId) {
  const prefix = buildTenantBackupPrefix(tenantId);
  return StoredUpload.countDocuments({
    folder: { $regex: `^${prefix}` },
  });
}

async function enforceRetention(tenantId, keepLast = 14, keepKeys = []) {
  const prefix = buildTenantBackupPrefix(tenantId);
  const uploads = await StoredUpload.find({
    folder: { $regex: `^${prefix}` },
  })
    .select('_id key')
    .sort({ createdAt: -1 });

  const keepSet = new Set(keepKeys.filter(Boolean));
  let kept = 0;
  const deletions = [];

  for (const upload of uploads) {
    if (keepSet.has(upload.key)) {
      kept += 1;
      continue;
    }

    if (kept < keepLast) {
      kept += 1;
      continue;
    }

    deletions.push(upload._id);
  }

  if (deletions.length > 0) {
    await StoredUpload.deleteMany({ _id: { $in: deletions } });
  }

  return deletions.length;
}

module.exports = {
  BACKUP_FOLDER_ROOT,
  buildBackupKey,
  buildTenantBackupPrefix,
  saveAutoBackup,
  listTenantBackups,
  countTenantBackups,
  enforceRetention,
};
