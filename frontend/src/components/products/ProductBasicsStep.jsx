import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Camera,
  Check,
  Download,
  FileText,
  Hash,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  User,
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { Button, Modal } from '../UI';
import RichTextEditor from '../RichTextEditor';
import BarcodeScanner from '../BarcodeScanner';
import BarcodeLabel from '../BarcodeLabel';
import CategorySelector from '../CategorySelector';
import SeoAnalyzer from './SeoAnalyzer';
import TagInput from '../TagInput';
import { categoriesApi, productsApi, useAuthStore } from '../../store';
import { buildBarcodeSvg, downloadBarcodePng, printBarcodeLabel, resolveBarcodePayload } from '../../utils/barcodeUtils';
import { getIconForCategory, getCategoryIconSuggestions, DEFAULT_CATEGORY_ICON } from '../../utils/aiHelper';

const BARCODE_TYPE_OPTIONS = ['UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'QR_CODE', 'UNKNOWN'];

export default function ProductBasicsStep({
  form,
  setForm,
  productId = '',
  categories = [],
  suppliers = [],
  onCategoriesReload,
}) {
  const [scannerTarget, setScannerTarget] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [generatingLocalBarcode, setGeneratingLocalBarcode] = useState(false);
  const [categoryMode, setCategoryMode] = useState('root');
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent: '',
    icon: DEFAULT_CATEGORY_ICON,
  });

  const tenant = useAuthStore((state) => state.tenant);
  const barcodeSettings = tenant?.settings?.barcode || {};
  const barcodeMode = barcodeSettings.mode || 'both';
  const showInternationalBarcode = barcodeMode === 'both' || barcodeMode === 'international_only';
  const showLocalBarcode = barcodeMode === 'both' || barcodeMode === 'local_only';
  const storeAutoGeneratesLocalBarcode = barcodeSettings.autoGenerateLocalBarcode === true;
  const hasPersistedProduct = Boolean(productId);
  const hasLocalBarcodeValue = Boolean(String(form.localBarcode || '').trim());
  const shouldAutoGenerateAfterSave = showLocalBarcode
    && !hasPersistedProduct
    && !hasLocalBarcodeValue
    && (storeAutoGeneratesLocalBarcode || form.generateBarcodeAfterCreate !== false);
  const activeBarcodePayload = useMemo(
    () => resolveBarcodePayload(form, showLocalBarcode ? 'local' : 'international'),
    [form, showLocalBarcode]
  );

  const selectedCategory = categories.find((category) => category?._id === form.category);
  const subcategories = selectedCategory?.children || [];
  const rootCategories = categories.filter((category) => category?._id && category._id !== 'uncategorized');

  // Multi-level subcategory: find which level-2 item owns the current form.subcategory
  const findSelectedLevel2 = () => {
    // Direct level-2 match
    const direct = subcategories.find((s) => s._id === form.subcategory);
    if (direct) return direct;
    // form.subcategory might be a level-3 child of a level-2
    for (const sub of subcategories) {
      if (sub.children?.find((c) => c._id === form.subcategory)) return sub;
    }
    return null;
  };
  const selectedLevel2 = findSelectedLevel2();
  const level3Subcats = selectedLevel2?.children || [];
  const level2Value = selectedLevel2?._id || '';
  const level3Value = level3Subcats.some((c) => c._id === form.subcategory) ? form.subcategory : '';
  const iconSuggestions = getCategoryIconSuggestions(categoryForm.name, 10);

  const handleBarcodeScan = (payload) => {
    if (scannerTarget === 'international') {
      setForm((prev) => ({
        ...prev,
        barcode: payload.value,
        internationalBarcode: payload.value,
        internationalBarcodeType: payload.format || 'UNKNOWN',
      }));
    }

    if (scannerTarget === 'local') {
      setForm((prev) => ({
        ...prev,
        localBarcode: payload.value,
        localBarcodeType: 'CODE128',
      }));
    }

    setScannerTarget('');
  };

  const handleGenerateLocalBarcode = async () => {
    if (!productId) {
      toast.error('احفظ المنتج أولًا ثم أعد توليد الباركود المحلي.');
      return;
    }

    setGeneratingLocalBarcode(true);
    try {
      const response = await productsApi.generateLocalBarcode(productId);
      const localBarcode = response?.data?.data?.localBarcode || '';
      const localBarcodeType = response?.data?.data?.localBarcodeType || 'CODE128';

      setForm((prev) => ({
        ...prev,
        localBarcode,
        localBarcodeType,
      }));

      toast.success('تم توليد الباركود المحلي.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'تعذر توليد الباركود المحلي.');
    } finally {
      setGeneratingLocalBarcode(false);
    }
  };

  const handleDownloadBarcode = async () => {
    if (!activeBarcodePayload?.value) return;

    try {
      const svgMarkup = buildBarcodeSvg(
        activeBarcodePayload.value,
        activeBarcodePayload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'
      );
      await downloadBarcodePng(
        svgMarkup,
        `${activeBarcodePayload.source || 'barcode'}-${activeBarcodePayload.value}.png`
      );
    } catch {
      toast.error('تعذر تنزيل صورة الباركود.');
    }
  };

  const handlePrintBarcode = () => {
    if (!activeBarcodePayload?.value) return;

    const svgMarkup = buildBarcodeSvg(
      activeBarcodePayload.value,
      activeBarcodePayload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'
    );

    printBarcodeLabel({
      svgMarkup,
      title: form.name || 'ملصق باركود',
      subtitle: activeBarcodePayload.source === 'local' ? 'باركود محلي' : 'باركود دولي',
      caption: activeBarcodePayload.value,
    });
  };

  const openAddCategoryModal = () => {
    setCategoryMode('root');
    setCategoryForm({
      name: '',
      description: '',
      parent: '',
      icon: DEFAULT_CATEGORY_ICON,
    });
    setShowCategoryModal(true);
  };

  const handleCategoryNameChange = (name) => {
    const suggestedIcon = getIconForCategory(name);
    setCategoryForm((prev) => ({
      ...prev,
      name,
      icon: suggestedIcon || prev.icon || DEFAULT_CATEGORY_ICON,
    }));
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('يرجى إدخال اسم القسم.');
      return;
    }

    if (categoryMode === 'child' && !categoryForm.parent) {
      toast.error('اختر القسم الرئيسي أولًا.');
      return;
    }

    setSavingCategory(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description || '',
        icon: categoryForm.icon || DEFAULT_CATEGORY_ICON,
        parent: categoryMode === 'child' ? categoryForm.parent : null,
      };

      const response = await categoriesApi.create(payload);
      const createdCategoryId = response?.data?.data?._id;

      if (typeof onCategoriesReload === 'function') {
        await onCategoriesReload();
      }

      if (createdCategoryId) {
        setForm((prev) => ({
          ...prev,
          category: categoryMode === 'root' ? createdCategoryId : prev.category,
          subcategory: categoryMode === 'child' ? createdCategoryId : '',
        }));
      }

      toast.success('تمت إضافة القسم بنجاح.');
      setShowCategoryModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'تعذر إنشاء القسم.');
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <section>
        <SectionHeader icon={FileText} title="المعلومات الأساسية" subtitle="الاسم والأقسام والربط بالمورد" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              اسم المنتج <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="مثال: تيشيرت قطن"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              dir="rtl"
            />
            {form.name ? <p className="text-xs text-gray-400">{form.name.length}/200 حرف</p> : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary-500" />
                الأقسام
              </label>
              <button
                type="button"
                onClick={openAddCategoryModal}
                className="rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-bold text-primary-600 transition-colors hover:bg-primary-50"
              >
                إضافة قسم جديد
              </button>
            </div>

            <CategorySelector
              categories={categories}
              value={form.category}
              placeholder="بدون قسم"
              onChange={(categoryId) => setForm((prev) => ({ ...prev, category: categoryId || '', subcategory: '' }))}
            />

            {form.category && subcategories.length > 0 ? (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">القسم الفرعي</label>
                {/* Level 2 dropdown */}
                <select
                  value={level2Value}
                  onChange={(event) => setForm((prev) => ({ ...prev, subcategory: event.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  dir="rtl"
                >
                  <option value="">بدون قسم فرعي</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory._id} value={subcategory._id}>
                      {subcategory.icon ? `${subcategory.icon} ` : ''}{subcategory.name}
                    </option>
                  ))}
                </select>
                {/* Level 3 dropdown — only shown when selected level-2 has children */}
                {level3Subcats.length > 0 && (
                  <select
                    value={level3Value}
                    onChange={(event) => setForm((prev) => ({ ...prev, subcategory: event.target.value || level2Value }))}
                    className="w-full rounded-xl border-2 border-primary-100 bg-primary-50/30 px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-primary-900/40 dark:bg-primary-950/20 dark:text-white"
                    dir="rtl"
                  >
                    <option value="">بدون قسم أكثر تحديداً</option>
                    {level3Subcats.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.icon ? `${sub.icon} ` : ''}{sub.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}
          </div>

          {suppliers?.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary-500" />
                المورد
              </label>
              <select
                value={form.supplier || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                dir="rtl"
              >
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader icon={FileText} title="وصف المنتج" subtitle="الوصف التحريري الكامل للمنتج" />
        <div className="overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <RichTextEditor
            value={form.description}
            onChange={(content) => setForm((prev) => ({ ...prev, description: content }))}
            minHeight={320}
          />
          {form.description ? (
            <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <SeoAnalyzer text={form.description} title={form.name} />
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader icon={Hash} title="التنظيم والتعريف" subtitle="SKU والباركود المحلي والدولي وتاريخ الانتهاء" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {!showInternationalBarcode && !showLocalBarcode ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
              إعدادات المتجر الحالية تخفي واجهات الباركود. القيم القديمة ستظل محفوظة في الخلفية إذا كانت موجودة.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">كود الصنف (SKU)</label>
              <input
                type="text"
                value={form.sku || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="SKU-001"
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                dir="ltr"
              />
            </div>

            {showInternationalBarcode ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">الباركود الدولي</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.internationalBarcode || form.barcode || ''}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        barcode: event.target.value,
                        internationalBarcode: event.target.value,
                      }))}
                      placeholder="UPC / EAN / QR"
                      className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerTarget('international')}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-50 px-4 py-3 font-bold text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400"
                    >
                      <Camera className="w-4 h-4" />
                      مسح
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">نوع الباركود الدولي</label>
                  <select
                    value={form.internationalBarcodeType || 'UNKNOWN'}
                    onChange={(event) => setForm((prev) => ({ ...prev, internationalBarcodeType: event.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {BARCODE_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {showLocalBarcode ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">الباركود المحلي</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.localBarcode || ''}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        localBarcode: event.target.value,
                        localBarcodeType: event.target.value ? 'CODE128' : prev.localBarcodeType,
                      }))}
                      placeholder="000000000001"
                      className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerTarget('local')}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <Camera className="w-4 h-4" />
                      مسح
                    </button>
                  </div>
                </div>

                {!hasPersistedProduct && !hasLocalBarcodeValue ? (
                  <div
                    className={`rounded-2xl border px-4 py-4 shadow-sm ${shouldAutoGenerateAfterSave
                      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:via-gray-900 dark:to-teal-950/20'
                      : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:border-amber-900/30 dark:from-amber-950/20 dark:via-gray-900 dark:to-orange-950/20'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${shouldAutoGenerateAfterSave
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          }`}
                      >
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${shouldAutoGenerateAfterSave
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              }`}
                          >
                            {shouldAutoGenerateAfterSave
                              ? (storeAutoGeneratesLocalBarcode ? 'إعداد المتجر' : 'خطوة واحدة')
                              : 'بعد أول حفظ'}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                            CODE128
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-black text-gray-900 dark:text-white">
                          {shouldAutoGenerateAfterSave
                            ? (storeAutoGeneratesLocalBarcode
                              ? 'إعدادات المتجر الحالية ستولد الباركود المحلي تلقائيًا عند الحفظ.'
                              : 'سيتم توليد الباركود المحلي تلقائيًا بمجرد حفظ المنتج.')
                            : 'سيصبح التوليد اليدوي متاحًا لك من نفس الشاشة بعد أول حفظ.'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {shouldAutoGenerateAfterSave
                            ? (storeAutoGeneratesLocalBarcode
                              ? 'يمكنك تعديل هذا السلوك لاحقًا من إعدادات الباركود على مستوى المتجر، لكن المنتج الحالي سيحصل على كوده تلقائيًا.'
                              : 'اترك الحقل فارغًا وسيقوم النظام بإنشاء الكود في الخلفية دون الحاجة للعودة مرة أخرى.')
                            : 'إذا كنت لا تريد التوليد التلقائي الآن، يمكنك حفظ المنتج أولًا ثم إعادة توليد الكود لاحقًا.'}
                        </p>
                      </div>
                    </div>

                    {!storeAutoGeneratesLocalBarcode ? (
                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/80 bg-white/80 px-3.5 py-3 transition-colors hover:border-primary-200 hover:bg-white dark:border-gray-800 dark:bg-gray-950/70 dark:hover:border-primary-900/40">
                        <input
                          type="checkbox"
                          checked={form.generateBarcodeAfterCreate !== false}
                          onChange={(event) => setForm((prev) => ({
                            ...prev,
                            generateBarcodeAfterCreate: event.target.checked,
                          }))}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">
                            توليد تلقائي بعد أول حفظ
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                            يوفر على المستخدم خطوة الحفظ ثم الرجوع لإعادة توليد الباركود المحلي يدويًا.
                          </span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {hasPersistedProduct ? (
                    <Button type="button" variant="outline" onClick={handleGenerateLocalBarcode} loading={generatingLocalBarcode}>
                      <RefreshCw className="w-4 h-4" />
                      {form.localBarcode ? 'إعادة توليد' : 'توليد باركود محلي'}
                    </Button>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-2 text-xs font-bold ${hasLocalBarcodeValue
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                        : shouldAutoGenerateAfterSave
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        }`}
                    >
                      {hasLocalBarcodeValue
                        ? 'سيتم حفظ الكود الذي أدخلته مباشرة'
                        : shouldAutoGenerateAfterSave
                          ? 'سيُجهّز تلقائيًا بعد الحفظ'
                          : 'التوليد اليدوي متاح بعد الحفظ'}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    CODE128
                  </span>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">تاريخ الانتهاء</label>
              <input
                type="date"
                value={form.expiryDate || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {activeBarcodePayload?.value ? (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <BarcodeLabel
                  value={activeBarcodePayload.value}
                  format={activeBarcodePayload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'}
                      title={activeBarcodePayload.source === 'local' ? 'باركود محلي' : 'باركود دولي'}
                      subtitle={form.name || 'ملصق باركود'}
                  caption={activeBarcodePayload.value}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2 lg:w-56">
                  <Button type="button" variant="outline" onClick={handleDownloadBarcode}>
                    <Download className="w-4 h-4" />
                    تنزيل PNG
                  </Button>
                  <Button type="button" onClick={handlePrintBarcode}>
                    <Printer className="w-4 h-4" />
                    طباعة الملصق
                  </Button>
                  <p className="text-xs text-gray-500">
                    الطباعة هنا تعتمد على متصفح الجهاز وقالب طباعة للملصقات، بدون طباعة صامتة.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader icon={Search} title="تحسين محركات البحث (SEO)" subtitle="الكلمات المفتاحية والوصف الظاهرين في نتائج البحث" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">الكلمات المفتاحية</label>
            <TagInput
              value={form.seoTitle || ''}
              onChange={(newValue) => setForm((prev) => ({ ...prev, seoTitle: newValue }))}
              placeholder="مثال: موبايل، آيفون، هاتف ذكي"
              maxTags={10}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">وصف SEO</label>
            <textarea
              value={form.seoDescription || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, seoDescription: event.target.value }))}
              placeholder="وصف مختصر وجذاب للمنتج"
              rows={3}
              maxLength={180}
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              dir="rtl"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>يفضل بين 150 و160 حرفًا</span>
              <span className={(form.seoDescription?.length || 0) > 160 ? 'text-orange-500' : ''}>
                {form.seoDescription?.length || 0}/180
              </span>
            </div>
          </div>

          {(form.seoTitle || form.name || form.seoDescription || form.description) ? (
            <div className="flex flex-col gap-2.5 mt-4">
              <p className="text-xs font-black text-gray-500 flex items-center gap-1.5 px-1"><Search className="w-3.5 h-3.5" /> معاينة في نتائج بحث جوجل</p>
              <div className="rounded-2xl border border-gray-200 bg-[#202124] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-right font-sans" dir="rtl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-[#303134] border border-[#3c4043] rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                    {tenant?.logo ? (
                      <img src={tenant.logo} alt="شعار المتجر" className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col leading-tight pt-0.5 overflow-hidden w-full">
                    <span className="text-[14px] font-normal text-[#dadce0] truncate">
                      {tenant?.storeName || tenant?.name || 'متجرك الإلكتروني'}
                    </span>
                    <div className="flex items-center justify-start gap-1.5 text-[12px] text-[#bdc1c6] font-normal mt-0.5 max-w-full overflow-hidden truncate">
                      <span dir="ltr" className="truncate">{typeof window !== 'undefined' ? window.location.hostname : 'payqusta.store'}</span>
                      <span className="text-[10px] opacity-70 mt-0.5 shrink-0">›</span>
                      <span className="shrink-0 truncate">المنتجات</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-[104px] h-[104px] rounded-xl bg-[#303134] shrink-0 border border-[#3c4043] overflow-hidden flex items-center justify-center mt-1">
                    {form.primaryImagePreview ? (
                      <img src={form.primaryImagePreview} alt="صورة المنتج" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-500 flex flex-col items-center justify-center gap-1 opacity-60">
                        <ImageIcon className="w-6 h-6" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold">صورة المنتج</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center h-[104px]">
                    <h3 className="text-[20px] font-normal text-[#8ab4f8] leading-tight mb-1 truncate hover:underline cursor-pointer">
                      {form.seoTitle ? form.seoTitle.replace(/,/g, ' | ') : form.name}
                    </h3>
                    <p className="text-[14px] text-[#bdc1c6] line-clamp-2 leading-relaxed">
                      {form.seoDescription || (form.description ? form.description.replace(/<[^>]*>/g, '').slice(0, 155) : 'لا يوجد وصف بعد.')}
                    </p>
                    {form.price && (
                      <p className="text-[14px] text-[#bdc1c6] mt-1 line-clamp-1">
                        السعر: {form.price} ج.م
                        {form.compareAtPrice && ` السعر السابق: ${form.compareAtPrice} ج.م`}
                        <span className="text-[#81c995] font-bold mr-2">متوفر ✓</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        open={showCategoryModal}
        onClose={() => !savingCategory && setShowCategoryModal(false)}
        title="إضافة قسم جديد"
        size="2xl"
      >
        <div className="space-y-5 pb-28">
          <div className="rounded-3xl border border-primary-500/15 bg-gradient-to-br from-primary-950 via-slate-900 to-slate-950 px-4 py-4 text-white shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-900 shadow-xl">
                {categoryForm.icon || DEFAULT_CATEGORY_ICON}
              </div>
              <div className="flex-1 text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-primary-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  اقتراح ذكي للأيقونة
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-white">
                  سيتم اقتراح أيقونة تلقائيًا حسب اسم القسم، ويمكنك تعديلها يدويًا قبل الحفظ.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">الأيقونة</label>
              <input
                type="text"
                value={categoryForm.icon}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, icon: event.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-center text-2xl transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div className="col-span-3">
              <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">اسم القسم</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(event) => handleCategoryNameChange(event.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategoryMode('root');
                setCategoryForm((prev) => ({ ...prev, parent: '' }));
              }}
              className={`rounded-2xl border px-4 py-3 text-right transition-all ${categoryMode === 'root'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'
                }`}
            >
              <p className="text-sm font-black">قسم رئيسي</p>
              <p className="mt-1 text-[11px]">يظهر كقسم أساسي في المتجر.</p>
            </button>
            <button
              type="button"
              onClick={() => setCategoryMode('child')}
              className={`rounded-2xl border px-4 py-3 text-right transition-all ${categoryMode === 'child'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'
                }`}
            >
              <p className="text-sm font-black">قسم فرعي</p>
              <p className="mt-1 text-[11px]">يرتبط بقسم رئيسي موجود.</p>
            </button>
          </div>

          {categoryMode === 'child' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">القسم الرئيسي</label>
              <CategorySelector
                categories={rootCategories}
                value={categoryForm.parent}
                onChange={(value) => setCategoryForm((prev) => ({ ...prev, parent: value }))}
                placeholder="اختر القسم الرئيسي"
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-black text-gray-800 dark:text-white">أيقونات مقترحة</p>
                <p className="text-[11px] text-gray-500">اختيارات مناسبة حسب اسم القسم.</p>
              </div>
              <Sparkles className="h-4 w-4 text-primary-500" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {iconSuggestions.map((icon) => (
                <button
                  key={`${categoryForm.name || 'default'}-${icon}`}
                  type="button"
                  onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                  className={`flex h-12 items-center justify-center rounded-2xl border text-2xl transition-all ${categoryForm.icon === icon
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/40'
                    }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">وصف مختصر</label>
            <textarea
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              dir="rtl"
            />
          </div>
        </div>

        <div className="sticky bottom-20 z-30 mt-6 flex justify-end gap-3 rounded-2xl border border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <Button variant="ghost" onClick={() => setShowCategoryModal(false)} disabled={savingCategory}>
            إلغاء
          </Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleCreateCategory} loading={savingCategory}>
            حفظ
          </Button>
        </div>
      </Modal>

      {scannerTarget ? (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setScannerTarget('')}
        />
      ) : null}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
        <Icon className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}
