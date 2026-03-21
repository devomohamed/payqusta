import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Crop, Image as ImageIcon, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../../utils/canvasUtils';
import { Button } from '../UI';

export default function ImageEditorModal({ isOpen, onClose, files, onComplete }) {
    const safeFiles = Array.isArray(files) ? files : [];
    const currentFile = safeFiles[0] || null;
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [saving, setSaving] = useState(false);

    const imageUrl = useMemo(() => {
        if (!currentFile) return '';
        return URL.createObjectURL(currentFile);
    }, [currentFile]);

    useEffect(() => {
        if (!imageUrl) return undefined;
        return () => URL.revokeObjectURL(imageUrl);
    }, [imageUrl]);

    useEffect(() => {
        if (!isOpen) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            setSaving(false);
        }
    }, [isOpen]);

    const handleCropComplete = useCallback((_, nextCroppedAreaPixels) => {
        setCroppedAreaPixels(nextCroppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!currentFile || saving) return;

        setSaving(true);
        try {
            const croppedFile = await getCroppedImg(
                imageUrl,
                croppedAreaPixels,
                currentFile.name,
                currentFile.type,
            );
            onComplete([croppedFile]);
        } catch (error) {
            console.error(error);
            onComplete([currentFile]);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !currentFile || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xl dark:bg-slate-950/78">
            <div className="app-surface-glass relative flex h-[min(88vh,840px)] w-full max-w-[1320px] flex-col overflow-hidden rounded-[2rem] border border-[color:var(--surface-border)] shadow-[0_40px_120px_rgba(15,23,42,0.22)] dark:shadow-[0_40px_120px_rgba(2,6,23,0.6)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.09),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.10),transparent_24%)]" />

                <div className="relative flex items-start justify-between gap-4 border-b border-[color:var(--surface-border)] px-6 py-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/18 via-sky-500/10 to-transparent text-primary-500 dark:text-primary-300">
                            <Crop className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="app-text-strong text-xl font-bold">تعديل صورة المنتج</h3>
                                <span className="rounded-full border border-primary-500/15 bg-primary-500/10 px-2.5 py-1 text-[11px] font-bold text-primary-700 dark:text-primary-300">
                                    قص 1:1
                                </span>
                            </div>
                            <p className="app-text-body mt-1 text-sm">
                                حرّك الصورة داخل الإطار حتى تصل لنتيجة أنيقة وواضحة في بطاقة المنتج والغلاف الرئيسي.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="app-surface-muted shrink-0 rounded-2xl p-2.5 app-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                        aria-label="إغلاق محرر الصورة"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="relative grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.45fr)_360px]">
                    <div className="order-1 flex min-h-[420px] flex-col p-5 lg:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="app-text-strong text-sm font-bold">معاينة القص</div>
                                <div className="app-text-soft mt-1 text-xs">
                                    سيتم حفظ هذه النتيجة فقط عند الضغط على زر حفظ التعديل.
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="app-surface rounded-full px-3 py-1.5 text-[11px] font-bold app-text-soft">
                                    {currentFile.name}
                                </span>
                                <span className="app-surface rounded-full px-3 py-1.5 text-[11px] font-bold app-text-soft">
                                    تكبير {Math.round(zoom * 100)}%
                                </span>
                            </div>
                        </div>

                        <div className="app-surface-muted relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[color:var(--surface-border)] p-5">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)]" />
                            <div className="absolute left-5 top-5 z-10 rounded-full border border-[color:var(--surface-border)] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-900/70 dark:text-slate-100">
                                إطار الغلاف
                            </div>
                            <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-[1.5rem] border border-[color:var(--surface-border)] bg-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:bg-slate-950/65">
                                <Cropper
                                    image={imageUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={handleCropComplete}
                                    onZoomChange={setZoom}
                                    objectFit="contain"
                                    showGrid={false}
                                />
                            </div>
                        </div>
                    </div>

                    <aside className="app-surface-muted order-2 flex flex-col border-t border-[color:var(--surface-border)] p-5 lg:border-r lg:border-t-0">
                        <div className="app-surface rounded-3xl p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="rounded-xl bg-primary-500/12 p-2 text-primary-500 dark:text-primary-300">
                                    <ImageIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="app-text-strong text-sm font-bold">الصورة الأصلية</div>
                                    <div className="app-text-soft text-xs">مرجع سريع قبل الحفظ</div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
                                <img
                                    src={imageUrl}
                                    alt={currentFile.name || 'معاينة الصورة'}
                                    className="h-52 w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        </div>

                        <div className="app-surface mt-4 rounded-3xl p-4">
                            <div className="mb-3 flex items-center justify-between text-[11px]">
                                <span className="app-text-soft font-semibold">مستوى التكبير</span>
                                <span className="app-text-strong font-bold">{Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))}
                                    className="app-surface flex h-10 w-10 items-center justify-center rounded-2xl transition-colors hover:text-primary-500"
                                    aria-label="تقليل التكبير"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-label="تكبير الصورة"
                                    onChange={(event) => setZoom(Number(event.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary-500 dark:bg-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                                    className="app-surface flex h-10 w-10 items-center justify-center rounded-2xl transition-colors hover:text-primary-500"
                                    aria-label="زيادة التكبير"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="app-surface mt-4 rounded-3xl p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="app-text-strong text-sm font-bold">ملاحظات سريعة</div>
                            </div>
                            <ul className="app-text-body space-y-2 text-xs leading-6">
                                <li>ضع المنتج في الوسط مع أقل قدر من الفراغات غير المهمة.</li>
                                <li>حافظ على وضوح العنصر الأساسي لأن هذه الصورة ستظهر في الكروت والقوائم.</li>
                                <li>في الـ light mode ستبدو الحدود أنعم، وفي الـ dark mode ستبقى القراءة واضحة.</li>
                            </ul>
                        </div>
                    </aside>
                </div>

                <div className="relative flex flex-col-reverse gap-3 border-t border-[color:var(--surface-border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="app-text-soft text-xs">
                        الضغط على إلغاء سيغلق النافذة بدون استبدال الصورة الحالية.
                    </p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                        <Button variant="ghost" onClick={onClose} className="justify-center sm:min-w-[130px]">
                            إلغاء
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            loading={saving}
                            className="justify-center px-6 shadow-[0_18px_40px_rgba(79,70,229,0.22)] sm:min-w-[180px]"
                        >
                            حفظ التعديل
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
