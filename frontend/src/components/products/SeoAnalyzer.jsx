import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/**
 * SeoAnalyzer Component
 * Provides real-time SEO feedback for a given text and target keyword.
 */
export default function SeoAnalyzer({ title, description, keywords, content }) {
    const [score, setScore] = useState(0);
    const [results, setResults] = useState([]);

    useEffect(() => {
        analyzeSEO();
    }, [title, description, keywords, content]);

    const analyzeSEO = () => {
        let currentScore = 0;
        const checks = [];
        const maxScore = 100;

        // Helper to safely check text length
        const getLength = (text) => (text ? text.trim().length : 0);
        const getWordCount = (text) => (text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0);

        // 1. Title Length Check (Optimal: 40-60 characters)
        const titleLen = getLength(title);
        if (titleLen === 0) {
            checks.push({ status: 'error', text: 'عنوان الصفحة (Meta Title) مفقود.' });
        } else if (titleLen < 30) {
            currentScore += 10;
            checks.push({ status: 'warning', text: 'عنوان الصفحة قصير جداً. يفضل أن يكون بين 40 و 60 حرفاً.' });
        } else if (titleLen > 60) {
            currentScore += 10;
            checks.push({ status: 'warning', text: 'عنوان الصفحة طويل جداً. قد لا يظهر كاملاً في محركات البحث.' });
        } else {
            currentScore += 20;
            checks.push({ status: 'success', text: 'طول عنوان الصفحة مناسب.' });
        }

        // 2. Meta Description Length Check (Optimal: 120-160 characters)
        const descLen = getLength(description);
        if (descLen === 0) {
            checks.push({ status: 'error', text: 'وصف الصفحة (Meta Description) مفقود.' });
        } else if (descLen < 120) {
            currentScore += 10;
            checks.push({ status: 'warning', text: 'الوصف قصير جداً. يفضل أن يكون بين 120 و 160 حرفاً.' });
        } else if (descLen > 160) {
            currentScore += 10;
            checks.push({ status: 'warning', text: 'الوصف طويل جداً. قد يتم اقتطاعه في نتائج البحث.' });
        } else {
            currentScore += 20;
            checks.push({ status: 'success', text: 'طول وصف الصفحة ممتاز.' });
        }

        // 3. Content Word Count Check (Optimal: > 300 words)
        // Strip HTML tags for accurate word count
        const cleanContent = content ? content.replace(/<[^>]+>/g, '') : '';
        const wordCount = getWordCount(cleanContent);

        if (wordCount === 0) {
            checks.push({ status: 'error', text: 'وصف المنتج التفصيلي فارغ. أضف تفاصيل للمنتج.' });
        } else if (wordCount < 100) {
            currentScore += 5;
            checks.push({ status: 'error', text: `وصف المنتج قصير جداً (${wordCount} كلمة). حاول إضافة المزيد من التفاصيل (ينصح بـ 300 كلمة).` });
        } else if (wordCount < 300) {
            currentScore += 15;
            checks.push({ status: 'warning', text: `وصف المنتج مقبول (${wordCount} كلمة)، لكن زيادة التفاصيل ستحسن نتائجه.` });
        } else {
            currentScore += 25;
            checks.push({ status: 'success', text: `طول وصف المنتج ممتاز (${wordCount} كلمة).` });
        }

        // 4. Keyword Presence Check
        const keywordList = keywords ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];

        if (keywordList.length === 0) {
            checks.push({ status: 'error', text: 'لم يتم إضافة كلمات دلالية للتحسين استناداً عليها.' });
        } else {
            let keywordsFoundInContent = 0;
            let keywordsFoundInTitleOrDesc = false;

            const titleAndDesc = `${title || ''} ${description || ''}`.toLowerCase();
            const contentLower = cleanContent.toLowerCase();

            keywordList.forEach(kw => {
                if (titleAndDesc.includes(kw)) keywordsFoundInTitleOrDesc = true;

                // Count occurrences in content (basic match)
                const regex = new RegExp(kw, 'gi');
                const matches = contentLower.match(regex);
                if (matches) keywordsFoundInContent += matches.length;
            });

            if (keywordsFoundInTitleOrDesc) {
                currentScore += 15;
                checks.push({ status: 'success', text: 'إحدى الكلمات الدلالية موجودة في العنوان أو الوصف.' });
            } else {
                checks.push({ status: 'error', text: 'الكلمات الدلالية غير مستخدمة في عنوان أو وصف الصفحة.' });
            }

            // Density calculation
            if (wordCount > 0 && keywordsFoundInContent > 0) {
                const density = (keywordsFoundInContent / wordCount) * 100;
                if (density < 0.5) {
                    currentScore += 10;
                    checks.push({ status: 'warning', text: 'كثافة الكلمات الدلالية منخفضة في وصف المنتج. حاول استخدامها بشكل طبيعي.' });
                } else if (density > 3) {
                    currentScore += 10;
                    checks.push({ status: 'warning', text: 'تحذير: كثافة الكلمات الدلالية مرتفعة جداً (حشو). قلل استخدامها لتبدو طبيعية.' });
                } else {
                    currentScore += 20;
                    checks.push({ status: 'success', text: 'كثافة الكلمات الدلالية ممتازة في الوصف التفصيلي.' });
                }
            } else if (wordCount > 0 && keywordsFoundInContent === 0) {
                checks.push({ status: 'error', text: 'الكلمات الدلالية غير مستخدمة في وصف المنتج التفصيلي.' });
            }
        }

        setScore(Math.min(currentScore, maxScore));
        setResults(checks.sort((a, b) => {
            // Order: error (red) -> warning (orange) -> success (green)
            const weight = { error: 1, warning: 2, success: 3 };
            return weight[a.status] - weight[b.status];
        }));
    };

    const getScoreColor = () => {
        if (score >= 80) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800';
        if (score >= 50) return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800';
        return 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800';
    };

    const getBarColor = () => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 50) return 'bg-orange-500';
        return 'bg-rose-500';
    };

    const statusIcons = {
        error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />,
        warning: <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />,
        success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <span>🔍</span> تقييم جودة الـ SEO
                </h3>

                <div className={`px-3 py-1 rounded-full border text-sm font-bold flex items-center gap-1.5 ${getScoreColor()}`}>
                    <span>التقييم:</span>
                    <span>{score}/100</span>
                </div>
            </div>

            <div className="p-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6 overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getBarColor()}`}
                        style={{ width: `${score}%` }}
                    ></div>
                </div>

                {/* Results List */}
                <div className="space-y-3">
                    {results.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">اكتب وصفاً وعنواناً للمنتج لرؤية التقييم</p>
                    ) : (
                        results.map((result, index) => (
                            <div key={index} className="flex gap-2.5 items-start text-sm">
                                {statusIcons[result.status]}
                                <span className={`leading-relaxed ${result.status === 'error' ? 'text-gray-700 dark:text-gray-300' :
                                        result.status === 'warning' ? 'text-gray-600 dark:text-gray-400' :
                                            'text-gray-500 dark:text-gray-500'
                                    }`}>
                                    {result.text}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
