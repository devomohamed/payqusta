const fs = require('fs');
const path = require('path');

const prodFile = path.resolve(__dirname, 'src/pages/ProductsPage.jsx');
let text = fs.readFileSync(prodFile, 'utf8');

// The error was specifically at line 316 and around there where rogue backticks were injected into template literals
// We will simply replace the known broken string blocks.

text = text.replace(/toast\.success\(`ت& إرسا  ط ب إعادة ا تخز`    &رد عبر WhatsApp S&\\n\$\{res\.data\.data\.productsCount\} & تج`\);/g,
    "toast.success(`تم رسال طلب إعادة التخزين عبر WhatsApp لـ \\n${res.data.data.productsCount} منتج`);");

text = text.replace(/toast\.success\(`ت& إعداد ط ب إعادة ا تخز`  \(\$\{res\.data\.data\?\.productsCount \|\| 0\} & تج\)`\);/g,
    "toast.success(`تم إعداد طلب إعادة التخزين (${res.data.data?.productsCount || 0} منتج)`);");

// Replace the notify error that also has a rogue backtick:
text = text.replace(/notify\.error\(getUserFriendlyErrorMessage\(err, 'حدث خطأ ف` ا حذف ا ج&اع`\. بعض ا & تجات  د تْ  &رتبطة بط بات\.'\)\)/g,
    "notify.error(getUserFriendlyErrorMessage(err, 'حدث خطأ في الحذف الجماعي. بعض المنتجات قد تكون مرتبطة بطلبات.'))");

// Replace the Request Restock error:
text = text.replace(/toast\.error\(getUserFriendlyErrorMessage\(err, 'خطأ ف` إرسا  ط ب إعادة ا تخز` \. تأْد &  تفر س` ة اتصا    &رد\.'\)\);/g,
    "toast.error(getUserFriendlyErrorMessage(err, 'خطأ في إرسال طلب إعادة التخزين. تأكد من توفر وسيلة اتصال للمورد.'));");

// And any fallback removal of the backtick right after `تخز` 
text = text.replace(/تخز`/g, "تخزين");

text = text.replace(/\uFFFD/g, ""); // Strip all remaining replacement characters so they don't clog the UI

fs.writeFileSync(prodFile, text, 'utf8');
console.log("Stripped rogue backticks and mojibake from ProductsPage.jsx");
