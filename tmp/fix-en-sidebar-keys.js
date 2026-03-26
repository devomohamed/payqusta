/**
 * Fix sidebar keys in the English locale that have Arabic values.
 * Replace with proper English translations.
 */
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../frontend/public/locales/en/admin.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const fixes = {
  ksgkw32: 'Sales',
  k1tt7ij: 'Installments Journal',
  k7967td: 'Shift Management',
  kq5gbc5: 'Add Product',
  kz8i2t1: 'Categories',
  k93n9tw: 'Search Product Availability',
  khipq72: 'Full Inventory',
  ktlj32y: 'Purchase Orders',
  k2kled2: 'Supplier Purchase Invoices',
  kj45kme: 'Purchase Returns',
  kzbcmsr: 'Portal',
  kjfhfle: 'Store Management',
  k31qkgx: 'Branch Shift Monitoring',
  khw4hav: 'Financials & Profit',
  koutx4x: 'Employee Performance',
  ky0zc2u: 'Supplier Debt Aging',
  kgsm1tc: 'Audit Logs',
  ksdk4f6: 'Initial Setup',
  k17zto7: 'Visit My Store',
};

let fixedCount = 0;

function fixSection(obj, sectionName) {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'form' || key === 'ui') {
      for (const [subKey, enTranslation] of Object.entries(fixes)) {
        if (obj[key][subKey] !== undefined) {
          const old = obj[key][subKey];
          obj[key][subKey] = enTranslation;
          if (old !== enTranslation) {
            console.log(`[${sectionName}.${key}.${subKey}] "${old}" -> "${enTranslation}"`);
            fixedCount++;
          }
        }
      }
    } else if (typeof value === 'object') {
      fixSection(value, sectionName ? `${sectionName}.${key}` : key);
    }
  }
}

// Fix sidebar section
if (en.sidebar) {
  if (en.sidebar.form) {
    for (const [key, enVal] of Object.entries(fixes)) {
      if (en.sidebar.form[key] !== undefined && en.sidebar.form[key] !== enVal) {
        console.log(`[sidebar.form.${key}] "${en.sidebar.form[key]}" -> "${enVal}"`);
        en.sidebar.form[key] = enVal;
        fixedCount++;
      }
    }
  }
  if (en.sidebar.ui) {
    for (const [key, enVal] of Object.entries(fixes)) {
      if (en.sidebar.ui[key] !== undefined && en.sidebar.ui[key] !== enVal) {
        console.log(`[sidebar.ui.${key}] "${en.sidebar.ui[key]}" -> "${enVal}"`);
        en.sidebar.ui[key] = enVal;
        fixedCount++;
      }
    }
  }
}

// Also scan for any other section that has these keys with Arabic values
function scanAll(obj, path) {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    if (fixes[key] !== undefined && typeof val === 'string') {
      // Check if the value looks Arabic (contains Arabic characters)
      if (/[\u0600-\u06FF]/.test(val)) {
        console.log(`[${path}.${key}] "${val}" -> "${fixes[key]}"`);
        obj[key] = fixes[key];
        fixedCount++;
      }
    } else if (typeof val === 'object') {
      scanAll(val, path ? `${path}.${key}` : key);
    }
  }
}

scanAll(en, '');

fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
console.log(`\nDone. Fixed ${fixedCount} values in en/admin.json`);
