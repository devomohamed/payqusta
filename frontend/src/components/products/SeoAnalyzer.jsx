import React, { useMemo } from 'react';
import { Search, CheckCircle, AlertCircle, Info, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const analyzeSeoContent = ({ text = '', title = '' } = {}) => {
    const results = [];
    let score = 0;

    if (title.length >= 10 && title.length <= 60) {
        results.push({ text: t('seo_analyzer.ui.kdhvgsn'), type: 'success' });
        score += 30;
    } else if (title.length < 10) {
        results.push({ text: t('seo_analyzer.ui.koetyhv'), type: 'warning' });
        score += 10;
    } else {
        results.push({ text: t('seo_analyzer.ui.kr917mw'), type: 'warning' });
        score += 15;
    }

    const plainText = text.replace(/<[^>]*>/g, '');

    if (plainText.length > 60) {
        results.push({ text: t('seo_analyzer.ui.khvha7w'), type: 'success' });
        score += 30;
    } else if (plainText.length > 20) {
        results.push({ text: t('seo_analyzer.ui.kj4k62e'), type: 'warning' });
        score += 15;
    } else {
        results.push({ text: t('seo_analyzer.ui.k16ejag'), type: 'error' });
    }

    if (title && plainText.toLowerCase().includes(title.toLowerCase())) {
        results.push({ text: t('seo_analyzer.ui.ki6v32e'), type: 'success' });
        score += 30;
    }

    score += 10;

    return { score, results };
};

const SeoAnalyzer = ({ text = '', title = '' }) => {
    const analysis = useMemo(() => analyzeSeoContent({ text, title }), [text, title]);

    const scoreColor = analysis.score > 80 ? 'text-emerald-500' : analysis.score > 50 ? 'text-amber-500' : 'text-rose-500';
    const progressColor = analysis.score > 80 ? 'bg-emerald-500' : analysis.score > 50 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div className="app-surface overflow-hidden rounded-2xl border border-gray-100/80 dark:border-white/10">
            <div className="flex items-center justify-between border-b border-gray-100/80 p-4 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
                        <Search className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{t('seo_analyzer.ui.k6py6q')}</span>
                </div>
                <div className="text-right">
                    <div className={`text-xl font-black ${scoreColor}`}>{analysis.score}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('seo_analyzer.ui.kfz18tc')}</div>
                </div>
            </div>

            <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
                <div
                    className={`h-full transition-all duration-1000 ${progressColor}`}
                    style={{ width: `${analysis.score}%` }}
                />
            </div>

            <div className="space-y-3 p-4">
                {analysis.results.map((result, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                        {result.type === 'success' ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : result.type === 'warning' ? (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                        )}
                        <span className="text-xs font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                            {result.text}
                        </span>
                    </div>
                ))}

                <div className="pt-2">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-800/30 dark:bg-blue-900/20">
                        <div className="mb-1 flex items-center gap-2">
                            <BarChart className="h-3 w-3 text-blue-600" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-600">{t('seo_analyzer.ui.k48ag9h')}</span>
                        </div>
                        <p className="text-[11px] leading-normal text-blue-800 dark:text-blue-300">
                            كلما كان العنوان والوصف قريبين من الكلمات التي يبحث بها العملاء، زادت فرصة ظهور المنتج في نتائج البحث.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeoAnalyzer;
