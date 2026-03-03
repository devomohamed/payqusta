const fs = require('fs');

try {
    const logPath = 'C:/Users/Ahmed Elshikh/.gemini/antigravity/brain/18228f1f-1064-4d09-9b8f-d75a7a6888af/.system_generated/logs/overview.txt';
    const log = fs.readFileSync(logPath, 'utf8');

    // Find the exact marker for the file view we want
    const marker = "The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n1: import React, { useState, useEffect } from 'react';\n2: import { Link } from 'react-router-dom';";

    const startIndex = log.indexOf(marker);
    if (startIndex === -1) {
        console.error("Marker not found!");
        process.exit(1);
    }

    const endMarker = "692: \nThe above content shows the entire, complete file contents of the requested file.";
    let rawContent = '';

    const subContent = log.substring(startIndex + marker.indexOf('1: import React'));
    const endIndex = subContent.indexOf(endMarker);

    if (endIndex === -1) {
        console.error("End marker not found!");
        process.exit(1);
    }

    rawContent = subContent.substring(0, endIndex + "692: \n".length);

    // Strip line numbers
    const restored = rawContent.split('\n').map(line => {
        return line.replace(/^\d+:\s?/, '');
    }).join('\n');

    // Fix the pickProductImage issue implicitly!
    let patched = restored.replace(/product\.image/g, 'pickProductImage(product)');
    patched = patched.replace("import { usePortalStore } from '../store/portalStore';", "import { usePortalStore } from '../store/portalStore';\nimport { pickProductImage } from '../utils/media';");

    fs.writeFileSync('d:/New folder (3)/payqusta/frontend/src/storefront/StorefrontHome.jsx', patched);
    console.log("RESTORED SUCCESSFULLY!");
} catch (err) {
    console.error(err);
}
