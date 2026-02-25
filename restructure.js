const fs = require('fs');
const path = require('path');

const root = __dirname;
const frontendDir = path.join(root, 'frontend');
const backendDir = path.join(root, 'backend');
const otherDir = path.join(root, 'other');

// Helper to move file/folder
function move(srcName, destFolder) {
    const srcPath = path.join(root, srcName);
    const destPath = path.join(destFolder, srcName);
    if (fs.existsSync(srcPath)) {
        try {
            fs.renameSync(srcPath, destPath);
            console.log(`Moved ${srcName} to ${path.basename(destFolder)}/`);
        } catch (e) {
            console.error(`Failed to move ${srcName}: ${e.message}`);
        }
    } else {
        console.warn(`Warning: ${srcName} not found.`);
    }
}

// 1. Ensure directories exist
if (!fs.existsSync(backendDir)) fs.mkdirSync(backendDir);
if (!fs.existsSync(otherDir)) fs.mkdirSync(otherDir);

// 2. Rename 'client' to 'frontend'
if (fs.existsSync(path.join(root, 'client'))) {
    try {
        fs.renameSync(path.join(root, 'client'), frontendDir);
        console.log(`Renamed 'client' to 'frontend'`);
    } catch (e) {
        console.error(`Failed to rename 'client' folder: ${e.message}`);
    }
} else if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir);
}

// 3. Move backend files
const backendFiles = [
    'src', 'server.js', 'package.json', 'package-lock.json', 'node_modules',
    '.env', '.env.example', '.env.render.example', 'Dockerfile', 'docker-compose.yml',
    '.dockerignore', 'scripts', 'logs', 'uploads'
];

backendFiles.forEach(file => move(file, backendDir));

// 4. Move other files
const otherFiles = [
    '.claude', 'BUSINESS_REPORTS_COMPLETE.md', 'BUSINESS_REPORTS_FIX.md',
    'DEPLOY_RENDER.md', 'ECOMMERCE_OPTIONS.md', 'EVENNODE_DEPLOYMENT.md',
    'FULL_PROJECT_ANALYSIS.md', 'NOTIFICATION_USAGE.md', 'PROJECT_ANALYSIS.md',
    'SESSION_7_FINAL_UPDATE.md', 'SESSION_7_SUMMARY.md', 'TODO.md', 'USER_GUIDE_AR.md',
    'ara.traineddata', 'eng.traineddata', 'barcode.jpeg', 'check_msgs.js',
    'create-admin.js', 'init_structure.js', 'restructure_backend.js',
    'seedAddons.js', 'seedPlans.js', 'test_analytics.js', 'test_invoice_creation.js',
    '{src', 'error.log'
];

otherFiles.forEach(file => move(file, otherDir));

// 5. Update backend package.json scripts
const pkgPath = path.join(backendDir, 'package.json');
if (fs.existsSync(pkgPath)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts) {
            if (pkg.scripts['client:install']) pkg.scripts['client:install'] = 'cd ../frontend && npm install --include=dev';
            if (pkg.scripts['client:dev']) pkg.scripts['client:dev'] = 'cd ../frontend && npm run dev';
            if (pkg.scripts['client:build']) pkg.scripts['client:build'] = 'cd ../frontend && npm run build';
            if (pkg.scripts['postinstall']) pkg.scripts['postinstall'] = 'npm run client:install && npm run client:build';
        }
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(`Updated backend/package.json scripts to point to '../frontend'`);
    } catch (e) {
        console.error(`Failed to update backend/package.json: ${e.message}`);
    }
}

console.log('Restructuring completed successfully!');
