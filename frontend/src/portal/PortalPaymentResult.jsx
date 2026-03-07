import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PortalPaymentResult() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation('portal');

    // Paymob typically redirects with 'success=true' or 'success=false', 
    // embedded in query params. Some gateways use 'status' etc.
    // We'll look for common success indicators in the query string.
    const isSuccessStr = searchParams.get('success');
    const hasError = searchParams.get('error') || searchParams.get('declined');

    const [isSuccess, setIsSuccess] = useState(null);

    useEffect(() => {
        if (isSuccessStr === 'true' && !hasError) {
            setIsSuccess(true);
        } else if (isSuccessStr === 'false' || hasError) {
            setIsSuccess(false);
        } else {
            // Default fallback if we can't tell, assume failure or pending
            setIsSuccess(false);
        }
    }, [searchParams, isSuccessStr, hasError]);

    if (isSuccess === null) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 text-center p-8">

                {isSuccess ? (
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            تم الدفع بنجاح
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            شكراً لك. تم استلام دفعتك وتحديث حالة الفاتورة. قد يستغرق ظهور التحديث بضع دقائق.
                        </p>
                    </div>
                ) : (
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            فشلت عملية الدفع
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            عذراً، لم نتمكن من إتمام عملية الدفع. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع مختلفة.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Link
                        to="/portal/invoices"
                        className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2"
                    >
                        <FileText className="w-5 h-5" />
                        العودة للفواتير
                    </Link>
                    <Link
                        to="/portal/dashboard"
                        className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        الرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );
}
