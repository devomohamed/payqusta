const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const modelsDir = path.join(srcDir, 'models');
const controllersDir = path.join(srcDir, 'controllers');
const routesDir = path.join(srcDir, 'routes');
const modulesDir = path.join(srcDir, 'modules');

if (!fs.existsSync(modulesDir)) fs.mkdirSync(modulesDir);

const fileMap = {};

function toCamelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

// Models
if (fs.existsSync(modelsDir)) {
    fs.readdirSync(modelsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const baseName = file.replace('.js', '');
            const entityName = toCamelCase(baseName);
            fileMap[path.join(modelsDir, file)] = {
                entity: entityName,
                type: 'model',
                oldPath: path.join(modelsDir, file),
                newPath: path.join(modulesDir, entityName, `${entityName}.model.js`)
            };
        }
    });
}

// Controllers
if (fs.existsSync(controllersDir)) {
    fs.readdirSync(controllersDir).forEach(file => {
        if (file.endsWith('.js')) {
            const baseName = file.replace('Controller.js', '');
            const entityName = baseName;
            fileMap[path.join(controllersDir, file)] = {
                entity: entityName,
                type: 'controller',
                oldPath: path.join(controllersDir, file),
                newPath: path.join(modulesDir, entityName, `${entityName}.controller.js`)
            };
        }
    });

    // also handle portal subfolder in controllers
    const portalDir = path.join(controllersDir, 'portal');
    if (fs.existsSync(portalDir)) {
        fs.readdirSync(portalDir).forEach(file => {
            if (file.endsWith('.js')) {
                const baseName = file.replace('Controller.js', '');
                const entityName = baseName;
                // Move portal controllers to their respective modules, or create a portal module?
                // Let's create a portal module
                fileMap[path.join(portalDir, file)] = {
                    entity: 'portal',
                    type: 'controller',
                    oldPath: path.join(portalDir, file),
                    newPath: path.join(modulesDir, 'portal', `${baseName}.controller.js`)
                }
            }
        });
    }
}

// Routes
if (fs.existsSync(routesDir)) {
    fs.readdirSync(routesDir).forEach(file => {
        if (file.endsWith('.js') && file !== 'index.js') {
            const baseName = file.replace('Routes.js', '');
            const entityName = baseName;
            fileMap[path.join(routesDir, file)] = {
                entity: entityName,
                type: 'routes',
                oldPath: path.join(routesDir, file),
                newPath: path.join(modulesDir, entityName, `${entityName}.routes.js`)
            };
        }
    });

    const portalRoutesDir = path.join(routesDir, 'portal');
    if (fs.existsSync(portalRoutesDir)) {
        fs.readdirSync(portalRoutesDir).forEach(file => {
            if (file.endsWith('.js')) {
                const baseName = file.replace('Routes.js', '');
                fileMap[path.join(portalRoutesDir, file)] = {
                    entity: 'portal',
                    type: 'routes',
                    oldPath: path.join(portalRoutesDir, file),
                    newPath: path.join(modulesDir, 'portal', `${baseName}.routes.js`)
                }
            }
        });
    }
}

// Create directories and move files
for (const key in fileMap) {
    const item = fileMap[key];
    const moduleDir = path.join(modulesDir, item.entity);
    if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });
    fs.renameSync(item.oldPath, item.newPath);
}

function getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        if (stat.isDirectory()) {
            getAllFiles(path.join(dir, file), fileList);
        } else if (file.endsWith('.js')) {
            fileList.push(path.join(dir, file));
        }
    }
    return fileList;
}

const allFiles = getAllFiles(srcDir);

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;

    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    content = content.replace(requireRegex, (match, reqPath) => {
        if (reqPath.startsWith('.')) {
            let requesterOldPath = file;
            for (const k in fileMap) {
                if (fileMap[k].newPath === file) {
                    requesterOldPath = fileMap[k].oldPath;
                    break;
                }
            }

            const targetOldPathDir = path.dirname(requesterOldPath);
            let targetOldPathAbsOrig = path.resolve(targetOldPathDir, reqPath);

            if (!targetOldPathAbsOrig.endsWith('.js')) {
                targetOldPathAbsOrig += '.js';
            }

            let targetInfo = fileMap[targetOldPathAbsOrig];

            // If we didn't find it, maybe the path required another file that wasn't moved, but we still need to update the relative path!
            if (!targetInfo) {
                // Did the requester move?
                const requesterMoved = Object.values(fileMap).find(f => f.newPath === file);
                if (requesterMoved) {
                    // Calculate new relative path to the unmodified target file
                    const unmodifiedTarget = targetOldPathAbsOrig;
                    if (fs.existsSync(unmodifiedTarget) || fs.existsSync(unmodifiedTarget.replace('.js', '') + '/index.js')) {
                        hasChanges = true;
                        let newRelPath = path.relative(path.dirname(file), unmodifiedTarget.replace('.js', '')).replace(/\\/g, '/');
                        if (!newRelPath.startsWith('.')) newRelPath = './' + newRelPath;
                        return `require('${newRelPath}')`;
                    }
                }
            } else {
                hasChanges = true;
                let newRelPath = path.relative(path.dirname(file), targetInfo.newPath).replace(/\\/g, '/');
                if (!newRelPath.startsWith('.')) newRelPath = './' + newRelPath;
                newRelPath = newRelPath.replace('.js', '');
                return `require('${newRelPath}')`;
            }
        }
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Restructuring Backend done.');
