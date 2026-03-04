import React, { useEffect, useState, useRef } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { FileText, Upload, Trash2, CheckCircle, Clock, AlertCircle, Eye, Shield, Camera, Image as ImageIcon } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { confirm } from '../components/ConfirmDialog';

const docTypes = [
    { id: 'national_id', label: 'بطاقة الهوية الوطنية', required: true, description: 'يرجى تقديم الوجهين الأمامي والخلفي بطريقة واضحة للتحقق.' },
    { id: 'passport', label: 'جواز السفر', required: false, description: 'الصفحة الرئيسية التي تحتوي على بياناتك الشخصية.' },
    { id: 'utility_bill', label: 'إيصال مرافق (كهرباء/مياه)', required: false, description: 'إثبات سكن حديث لا يمر عليه أكثر من 3 أشهر.' },
    { id: 'contract', label: 'عقد إيجار/تمليك', required: false, description: 'دليل موثق يثبت ملكية أو إيجار مقر عملك/سكنك.' },
    { id: 'other', label: 'مستندات أخرى', required: false, description: 'أي مستند إضافي لدعم ملفك.' },
];

export default function PortalDocuments() {
    const { fetchDocuments, uploadDocument, deleteDocument, loading } = usePortalStore();
    const { dark } = useThemeStore();
    const [documents, setDocuments] = useState([]);
    const [uploadingType, setUploadingType] = useState(null);

    // State for local dual-uploads
    const [dualUploads, setDualUploads] = useState({});

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        const docs = await fetchDocuments();
        setDocuments(docs || []);
    };

    const handleFileSelect = (type, side, file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { // 20MB limit
            notify.error('حجم الملف يجب أن يكون أقل من 20 ميجابايت');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'national_id') {
                setDualUploads(prev => ({
                    ...prev,
                    [type]: {
                        ...prev[type],
                        [side]: reader.result
                    }
                }));
            } else {
                // Immediate upload for single-file docs
                processUpload(type, reader.result, null);
            }
        };
        reader.readAsDataURL(file);
    };

    const processUpload = async (type, frontFile, backFile) => {
        setUploadingType(type);
        const res = await uploadDocument(type, frontFile, backFile);
        if (res.success) {
            notify.success('تم رفع المستند بنجاح');
            setDocuments(res.documents);
            // Clear dual upload state if any
            if (type === 'national_id') {
                setDualUploads(prev => {
                    const temp = { ...prev };
                    delete temp[type];
                    return temp;
                });
            }
        } else {
            notify.error(res.message);
        }
        setUploadingType(null);
    };

    const submitDualUpload = (type) => {
        const data = dualUploads[type];
        if (!data || !data.front) {
            notify.error('يجب رفع الصورة الأمامية للبطاقة');
            return;
        }
        if (!data.back) {
            notify.error('يجب رفع الصورة الخلفية للبطاقة');
            return;
        }
        processUpload(type, data.front, data.back);
    };

    const handleDelete = async (id) => {
        const ok = await confirm.delete('هل أنت متأكد من حذف هذا المستند؟');
        if (!ok) return;
        const res = await deleteDocument(id);
        if (res.success) {
            notify.success('تم حذف المستند');
            setDocuments(res.documents);
        } else {
            notify.error(res.message);
        }
    };

    // Sub-component for dropping files
    const DropZone = ({ typeName, side, label, currentFile, onFile, disabled }) => {
        const [isDrag, setIsDrag] = useState(false);
        const inputRef = useRef(null);

        return (
            <div
                className={`relative overflow-hidden group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} ${isDrag ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 scale-[1.02]' : currentFile ? 'border-green-500/50 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDrag(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        onFile(typeName, side, e.dataTransfer.files[0]);
                    }
                }}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            onFile(typeName, side, e.target.files[0]);
                        }
                    }}
                />

                {currentFile ? (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-bold text-green-700 dark:text-green-400">تم إرفاق {label}</span>
                        <img src={currentFile} alt="Preview" className="w-24 h-16 object-cover rounded-lg border-2 border-green-200 mt-2 shadow-sm" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                            {side === 'front' ? <Camera className="w-7 h-7" /> : side === 'back' ? <ImageIcon className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                        </div>
                        <span className="text-sm font-bold">اسحب صورة {label} أو اضغط للرفع</span>
                        <span className="text-[10px] text-gray-400 font-medium">PNG, JPG, PDF • بحد أقصى 20MB</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-24" dir="rtl">
            {/* Header with Premium Glassmorphism */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white shadow-xl shadow-primary-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Shield className="w-7 h-7" />
                            </div>
                            توثيق الحساب والمستندات
                        </h2>
                        <p className="text-primary-100 max-w-lg text-sm leading-relaxed">
                            قم بتوثيق هويتك لرفع سقف معاملتك وتفعيل خيارات التقسيط. نحن نستخدم تقنيات الذكاء الاصطناعي (OCR) للتحقق من بياناتك في ثوانٍ بطريقة آمنة ومشفرة.
                        </p>
                    </div>
                    {/* Status Global Card */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px] text-center">
                        <p className="text-primary-100 text-xs mb-1">حالة التوثيق</p>
                        {documents.some(d => d.type === 'national_id' && d.status === 'approved') ? (
                            <div className="text-green-300 font-bold text-lg flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" /> موثق بالكامل
                            </div>
                        ) : (
                            <div className="text-yellow-300 font-bold justify-center text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5" /> يتطلب توثيق
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {docTypes.map((type) => {
                    const uploadedDoc = documents.find(d => d.type === type.id && d.status !== 'rejected');
                    const rejectedDoc = documents.find(d => d.type === type.id && d.status === 'rejected');

                    const currentDoc = uploadedDoc || rejectedDoc;
                    const isRejected = currentDoc?.status === 'rejected';
                    const isUploaded = !!uploadedDoc;
                    const isUploadingThis = uploadingType === type.id;

                    return (
                        <div key={type.id} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col h-full">

                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isUploaded
                                        ? currentDoc.status === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                        : isRejected ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                        }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                            {type.label}
                                            {type.required && <span className="text-red-500 mr-1 text-sm">*</span>}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px]">
                                            {type.description}
                                        </p>
                                    </div>
                                </div>

                                {isUploaded && (
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm border ${currentDoc.status === 'approved'
                                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400'
                                        }`}>
                                        {currentDoc.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                        {currentDoc.status === 'approved' ? 'مقبول' : 'قيد المراجعة'}
                                    </div>
                                )}
                            </div>

                            <hr className="my-5 border-gray-100 dark:border-gray-700" />

                            <div className="flex-1 flex flex-col justify-end">
                                {isRejected && (
                                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl mb-5 flex items-start gap-3 text-sm text-red-700 dark:text-red-400 animate-in slide-in-from-top-2">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block mb-1">تم رفض المستند</span>
                                            {currentDoc.rejectionReason || 'الملف غير واضح أو المعرف الذكي (OCR) فشل في قراءة البيانات. يرجى التقاط صورة أوضح وإعادة المحاولة.'}
                                        </div>
                                    </div>
                                )}

                                {isUploaded ? (
                                    <div className="flex flex-col gap-3 mt-auto">
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={currentDoc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Eye className="w-5 h-5" />
                                                {type.id === 'national_id' ? 'الوجه الأمامي' : 'معاينة المستند'}
                                            </a>
                                            {currentDoc.backUrl && (
                                                <a
                                                    href={currentDoc.backUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                    الوجه الخلفي
                                                </a>
                                            )}
                                            {currentDoc.status === 'pending' && (
                                                <button
                                                    onClick={() => handleDelete(currentDoc._id)}
                                                    className="w-12 h-12 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center justify-center transition-all shadow-sm"
                                                    title="حذف المستند"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    type.id === 'national_id' ? (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            <div className="grid grid-cols-2 gap-3">
                                                <DropZone
                                                    typeName={type.id}
                                                    side="front"
                                                    label="الوجه الأمامي"
                                                    currentFile={dualUploads[type.id]?.front}
                                                    onFile={handleFileSelect}
                                                    disabled={isUploadingThis}
                                                />
                                                <DropZone
                                                    typeName={type.id}
                                                    side="back"
                                                    label="الوجه الخلفي"
                                                    currentFile={dualUploads[type.id]?.back}
                                                    onFile={handleFileSelect}
                                                    disabled={isUploadingThis}
                                                />
                                            </div>

                                            {(dualUploads[type.id]?.front || dualUploads[type.id]?.back) && (
                                                <button
                                                    onClick={() => submitDualUpload(type.id)}
                                                    disabled={isUploadingThis || !dualUploads[type.id]?.front || !dualUploads[type.id]?.back}
                                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-primary-500/30 disabled:shadow-none"
                                                >
                                                    {isUploadingThis ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            جاري الفحص السحابي والرفع...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-5 h-5" />
                                                            المصادقة ورفع البطاقة
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in duration-500 mt-auto">
                                            {isUploadingThis ? (
                                                <div className="h-[150px] border-2 border-dashed border-primary-200 dark:border-primary-800 rounded-3xl flex flex-col items-center justify-center gap-3 bg-primary-50/50 dark:bg-primary-900/10">
                                                    <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm text-primary-600 dark:text-primary-400 font-bold">جاري الرفع...</span>
                                                </div>
                                            ) : (
                                                <DropZone
                                                    typeName={type.id}
                                                    side="front"
                                                    label="الملف"
                                                    onFile={handleFileSelect}
                                                    disabled={false}
                                                />
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
