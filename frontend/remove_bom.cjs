const fs = require('fs');
const path = require('path');

const files = [
    path.resolve(__dirname, 'src/pages/ProductsPage.jsx'),
    path.resolve(__dirname, 'src/components/CategorySelector.jsx')
];

for (const f of files) {
    let text = fs.readFileSync(f, 'utf8');
    // Remove any character before the first "import" keyword
    const importIndex = text.indexOf('import');
    if (importIndex > 0) {
        text = text.slice(importIndex);
        fs.writeFileSync(f, text, 'utf8');
        console.log(`Cleaned starting bytes for ${path.basename(f)}!`);
    }
}
