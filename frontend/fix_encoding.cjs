const fs = require('fs');

function fixEncoding(filePath) {
    try {
        const corruptedContent = fs.readFileSync(filePath, 'utf8');

        // Attempt 1: Read as binary/latin1, decode as utf8
        // This fixes cases where UTF-8 bytes were read as Latin-1 and saved as UTF-8.
        const restoredBuffer = Buffer.from(corruptedContent, 'latin1');
        const restoredContent = restoredBuffer.toString('utf8');

        // Check if it looks like correct Arabic by presence of Arabic characters
        // Arabic unicode range is 0600-06FF
        if (/[\u0600-\u06FF]/.test(restoredContent)) {
            console.log(`Successfully restored ${filePath}!`);
            fs.writeFileSync(filePath, restoredContent, 'utf8');
            return true;
        } else {
            console.log(`Failed to restore ${filePath} - no Arabic detected after conversion.`);
            return false;
        }
    } catch (err) {
        console.error(`Error fixing ${filePath}:`, err.message);
        return false;
    }
}

const filesToFix = [
    './src/components/CategorySelector.jsx',
    './src/pages/ProductsPage.jsx'
];

filesToFix.forEach(f => fixEncoding(f));
