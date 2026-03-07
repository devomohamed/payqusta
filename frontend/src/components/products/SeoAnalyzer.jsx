import React, { useMemo } from 'react';
import { Search, CheckCircle, AlertCircle, Info, BarChart } from 'lucide-react';

export const analyzeSeoContent = ({ text = '', title = '' } = {}) => {
    const results = [];
    let score = 0;

    // Title Length
    if (title.length >= 10 && title.length <= 60) {
        results.push({ text: 'طول العنوان مثالي لتحركات البحث', type: 'success' });
        score += 30;
    } else if (title.length < 10) {
        results.push({ text: 'العنوان قصير جداً، حاول إضافة كلمات مفتاحية', type: 'warning' });
        score += 10;
    } else {
        results.push({ text: 'العنوان طويل جداً، قد يتم اقتطاعه في نتائج البحث', type: 'warning' });
        score += 15;
    }

    // Description Length
    const plainText = text.replace(/<[^>]*>/g, '');
    if (plainText.length > 150) {
        results.push({ text: 'وصف المنتج غني بالمعلومات', type: 'success' });
        score += 30;
    } else if (plainText.length > 50) {
        results.push({ text: 'الوصف جيد ولكن يمكن التوسع فيه أكثر', type: 'warning' });
        score += 15;
    } else {
        results.push({ text: 'الوصف قصير جداً لمجركات البحث', type: 'error' });
    }

    // Keyword usage
    if (title && plainText.toLowerCase().includes(title.toLowerCase())) {
        results.push({ text: 'العنوان مستخدم في الوصف (ممتاز)', type: 'success' });
        score += 30;
    }

    // Image usage (placeholder check)
    score += 10; // Assume image is added by ProductMediaStep

    return { score, results };
};

const SeoAnalyzer = ({ text = '', title = '' }) => {
    const analysis = useMemo(() => analyzeSeoContent({ text, title }), [text, title]);

    const scoreColor = analysis.score > 80 ? 'text-emerald-500' : analysis.score > 50 ? 'text-amber-500' : 'text-rose-500';
    const progressColor = analysis.score > 80 ? 'bg-emerald-500' : analysis.score > 50 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <Search className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">تحليل الـ SEO الذكي</span>
                </div>
                <div className="text-right">
                    <div className={`text-xl font-black ${scoreColor}`}>{analysis.score}%</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">نقاط السيو</div>
                </div>
            </div>

            <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
                <div
                    className={`h-full transition-all duration-1000 ${progressColor}`}
                    style={{ width: `${analysis.score}%` }}
                />
            </div>

            <div className="p-4 space-y-3">
                {analysis.results.map((res, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                        {res.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : res.type === 'warning' ? (
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                            <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                            {res.text}
                        </span>
                    </div>
                ))}

                <div className="pt-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <div className="flex gap-2 items-center mb-1">
                            <BarChart className="w-3 h-3 text-blue-600" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">نصيحة الخبراء</span>
                        </div>
                        <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-normal">
                            كلما كان العنوان والوصف يحتويان على كلمات يبحث عنها العملاء، زاد ظهور منتجك في جوجل ومحركات البحث.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeoAnalyzer;
