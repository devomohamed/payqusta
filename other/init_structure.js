const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const frontEndDir = path.join(rootDir, 'FrontEnd');
const backEndDir = path.join(rootDir, 'BackEnd');

if (!fs.existsSync(frontEndDir)) fs.mkdirSync(frontEndDir);
if (!fs.existsSync(backEndDir)) fs.mkdirSync(backEndDir);

try {
    // 1. Move client content to FrontEnd
    const clientDir = path.join(rootDir, 'client');
    if (fs.existsSync(clientDir)) {
        const clientFiles = fs.readdirSync(clientDir);
        for (const file of clientFiles) {
            fs.renameSync(path.join(clientDir, file), path.join(frontEndDir, file));
        }
        try { fs.rmdirSync(clientDir); } catch (e) { console.log('Wait: could not rmdir client, might be locked.'); }
    }

    // 2. Move backend content to BackEnd
    const backendExclusions = [
        'FrontEnd', 'BackEnd', '.git', '.vscode', '.gemini',
        'client', 'init_structure.js', 'restructure_backend.js'
    ];

    const rootFiles = fs.readdirSync(rootDir);
    for (const file of rootFiles) {
        if (!backendExclusions.includes(file)) {
            try {
                fs.renameSync(path.join(rootDir, file), path.join(backEndDir, file));
            } catch (err) {
                console.log(`Could not move ${file}: ${err.message}`);
            }
        }
    }

    console.log("✅ بنجاح! تم فصل المشروع إلى FrontEnd و BackEnd");
} catch (error) {
    console.error("حدث خطأ أثناء النقل:", error);
}
