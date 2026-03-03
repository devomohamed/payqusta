export function getUserFriendlyErrorMessage(err, defaultMsg = 'حدث خطأ غير متوقع. يرجى إعادة المحاولة.') {
    if (!err) return defaultMsg;

    let msg = '';
    if (typeof err === 'string') {
        msg = err;
    } else if (err.response?.data?.message) {
        msg = err.response.data.message;
    } else if (err.message) {
        msg = err.message;
    } else {
        return defaultMsg;
    }

    msg = msg.replace(/tenant/gi, 'المتجر');
    msg = msg.replace(/customDomain/gi, 'النطاق المخصص');
    msg = msg.replace(/subdomain/gi, 'رابط المتجر');

    if (/"[a-f0-9]{24}"/i.test(msg) && msg.includes('المتجر')) {
        return 'تعذر الحفظ بسبب تعارض داخلي في ربط المتجر. يرجى إعادة المحاولة.';
    }

    if (msg.includes('حقل "المتجر"')) {
        return 'تعذر الحفظ بسبب تعارض داخلي في بيانات المتجر. يرجى إعادة المحاولة.';
    }

    if (msg.includes('ObjectId') || msg.includes('CastError')) {
        return 'بيانات مرتبطة غير صالحة أو مفقودة.';
    }

    if (msg.includes('ValidationError')) {
        return 'خطأ في التحقق من صحة البيانات المُدخلة. يرجى مراجعة الحقول.';
    }

    if (msg.includes('E11000') || msg.includes('duplicate key')) {
        return 'تحذير: هذه البيانات مُستخدمة بالفعل من قبل (قيمة مكررة).';
    }

    if (msg.includes('MongoServerError') || msg.includes('MongoError')) {
        return 'تعذر الحفظ بسبب تعارض داخلي في البيانات. يرجى إعادة المحاولة.';
    }

    return msg;
}
