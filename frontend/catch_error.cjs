const { execSync } = require('child_process');
const fs = require('fs');
try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('Build Succeeded!');
} catch (err) {
    const errorLog = err.stdout ? err.stdout.toString() : err.message;
    fs.writeFileSync('build_exact_error.log', errorLog, 'utf8');
    console.log('Build Failed. Wrote log to build_exact_error.log');
}
