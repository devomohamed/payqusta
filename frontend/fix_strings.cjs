const fs = require('fs');
const path = require('path');

function replaceStrings(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const { from, to } of replacements) {
        // using split join to replace all instances
        content = content.split(from).join(to);
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
}

const catFile = path.resolve(__dirname, 'src/components/CategorySelector.jsx');
let catText = fs.readFileSync(catFile, 'utf8');
// regex match the broken placeholder string
catText = catText.replace(/placeholder\s*=\s*"[^"]+"/, 'placeholder = "اختر تصنيف..."');
fs.writeFileSync(catFile, catText, 'utf8');

const prodFile = path.resolve(__dirname, 'src/pages/ProductsPage.jsx');
let prodText = fs.readFileSync(prodFile, 'utf8');
// Fix the strings that match the corrupted phrases
prodText = prodText.replace(/<h5 className="font-bold text-gray-800 dark:text-white">[^<]+<\/h5>/, '<h5 className="font-bold text-gray-800 dark:text-white">قائمة الموديلات الإضافية</h5>');
prodText = prodText.replace(/<p className="text-xs text-gray-500">[^<]تي[^<]*<\/p>/, ''); // Actually let's just use exact regexes for the tags
prodText = prodText.replace(/<p className="text-xs text-gray-500">أضف[^<]+<\/p>/, '<p className="text-xs text-gray-500">أضف مقاسات أو ألوان لتتبع كمياتها المستقلة</p>');
prodText = prodText.replace(/attributes:\s*\{\s*'[^']+':\s*'',\s*'[^']+':\s*''\s*\}/, "attributes: { 'الحجم': '', 'اللون': '' }");
prodText = prodText.replace(/إضافة[^<]+<\/Button>/, 'إضافة موديل\n                    </Button>');

fs.writeFileSync(prodFile, prodText, 'utf8');
console.log('Fixed product and category files!');
