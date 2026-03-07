const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const { migrateLocalUploadsToDatabase } = require('../src/services/uploadMigrationService');

const args = process.argv.slice(2).reduce((accumulator, entry) => {
  const normalizedEntry = String(entry || '').trim();
  if (!normalizedEntry.startsWith('--')) return accumulator;

  const [rawKey, ...rawValueParts] = normalizedEntry.slice(2).split('=');
  accumulator[rawKey] = rawValueParts.length > 0 ? rawValueParts.join('=') : true;
  return accumulator;
}, {});

const resolveFilePath = (candidatePath, fallbackPath) => {
  const chosenPath = candidatePath ? path.resolve(process.cwd(), candidatePath) : fallbackPath;
  return path.normalize(chosenPath);
};

const envFilePath = resolveFilePath(
  args['env-file'],
  path.resolve(__dirname, '../../cloudrun.env')
);

dotenv.config({ path: envFilePath });

const uploadsRoot = resolveFilePath(
  args.root,
  path.resolve(__dirname, '../uploads')
);

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(`Missing MONGODB_URI. Checked env file: ${envFilePath}`);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  });

  try {
    await migrateLocalUploadsToDatabase({
      uploadsRoot,
      folders: args.folders,
      logger: console,
    });
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`Uploads migration failed: ${error.message}`);
  process.exit(1);
});
