import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
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
  Layers,
  LayoutGrid,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, Card, Badge } from '../UI';
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
  fieldErrors = {},
}) {
  const { t } = useTranslation('admin');
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
  const [iconSearchQuery, setIconSearchQuery] = useState('');

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
  const iconSuggestions = getCategoryIconSuggestions(categoryForm.name || iconSearchQuery, 12);

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
      toast.error(t('product_basics_step.toasts.kfgpdug'));
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

      toast.success(t('product_basics_step.toasts.k9mqz0y'));
    } catch (error) {
      toast.error(error?.response?.data?.message || t('product_basics_step.toasts.kp6ihod'));
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
      toast.error(t('product_basics_step.toasts.kiuhjd0'));
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
      title: form.name || t('product_basics_step.toasts.k53y2ms'),
      subtitle: activeBarcodePayload.source === 'local' ? t('product_basics_step.ui.kadubca') : t('product_basics_step.ui.kae7t15'),
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
    setIconSearchQuery('');
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
      toast.error(t('product_basics_step.toasts.ki5xls7'));
      return;
    }

    if (categoryMode === 'child' && !categoryForm.parent) {
      toast.error(t('product_basics_step.toasts.k2n215r'));
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

      toast.success(t('product_basics_step.toasts.kjw3v92'));
      setShowCategoryModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || t('product_basics_step.toasts.k7wxjkq'));
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <section>
        <SectionHeader icon={FileText} title={t('product_basics_step.titles.kxo1xqd')} subtitle="الاسم والأقسام والربط بالمورد" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              اسم المنتج <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t('product_basics_step.placeholders.k56ngeh')}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-medium text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:bg-gray-800 dark:text-white ${
                fieldErrors.name ? 'border-red-500 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
              }`}
              dir="rtl"
            />
            {fieldErrors.name && (
              <p className="flex items-center gap-1 text-xs font-bold text-red-500 animate-shake">
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.name === 'name_required' ? t('product_basics_step.ui.k56ynrg') : fieldErrors.name}
              </p>
            )}
            {form.name ? <p className="text-xs text-gray-400">{form.name.length}/200 حرف</p> : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary-500" />
                {t('product_basics_step.ui.kz8i2t1')}
              </label>
              <button
                type="button"
                onClick={openAddCategoryModal}
                className="rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-bold text-primary-600 transition-colors hover:bg-primary-50"
              >
                {t('product_basics_step.ui.kd5p0x6')}
              </button>
            </div>

            <CategorySelector
              categories={categories}
              value={form.category}
              placeholder={t('product_basics_step.placeholders.kmn6v53')}
              onChange={(categoryId) => setForm((prev) => ({ ...prev, category: categoryId || '', subcategory: '' }))}
            />

            {form.category && subcategories.length > 0 ? (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.kbwqhp5')}</label>
                {/* Level 2 dropdown */}
                <select
                  value={level2Value}
                  onChange={(event) => setForm((prev) => ({ ...prev, subcategory: event.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  dir="rtl"
                >
                  <option value="">{t('product_basics_step.ui.k65tm8o')}</option>
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
                    <option value="">{t('product_basics_step.ui.klcdnoe')}</option>
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
                {t('product_basics_step.ui.kaawtj6')}
              </label>
              <select
                value={form.supplier || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                dir="rtl"
              >
                <option value="">{t('product_basics_step.ui.k8ca3ng')}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader icon={FileText} title={t('product_basics_step.titles.kau35mc')} subtitle="الوصف التحريري الكامل للمنتج" />
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
        <SectionHeader icon={Hash} title={t('product_basics_step.titles.knaebra')} subtitle="SKU والباركود المحلي والدولي وتاريخ الانتهاء" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {!showInternationalBarcode && !showLocalBarcode ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
              {t('product_basics_step.ui.kjfee7y')}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.k7thf9r')}</label>
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
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.knt29k7')}</label>
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
                      {t('product_basics_step.ui.ky5b3')}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('product_basics_step.ui.ksxj6ny')}</label>
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
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.kntfr92')}</label>
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
                      {t('product_basics_step.ui.ky5b3')}
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
                              ? (storeAutoGeneratesLocalBarcode ? t('product_basics_step.ui.kq1jm5g') : t('product_basics_step.ui.ki1iz6'))
                              : 'بعد أول حفظ'}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                            CODE128
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-black text-gray-900 dark:text-white">
                          {shouldAutoGenerateAfterSave
                            ? (storeAutoGeneratesLocalBarcode
                              ? t('product_basics_step.ui.kjotshn') : t('product_basics_step.ui.kqtbuut'))
                            : 'سيصبح التوليد اليدوي متاحًا لك من نفس الشاشة بعد أول حفظ.'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {shouldAutoGenerateAfterSave
                            ? (storeAutoGeneratesLocalBarcode
                              ? 'يمكنك تعديل هذا السلوك لاحقًا من إعدادات الباركود على مستوى المتجر، لكن المنتج الحالي سيحصل على كوده تلقائيًا.'
                              : t('product_basics_step.ui.k7dzu9t'))
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
                            {t('product_basics_step.ui.k34x3fr')}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {t('product_basics_step.ui.kp4t9fy')}
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
                      {form.localBarcode ? t('product_basics_step.ui.k2efgqw') : 'توليد باركود محلي'}
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
                        ? t('product_basics_step.ui.k79gjcz') : shouldAutoGenerateAfterSave
                          ? t('product_basics_step.ui.kooq6hc') : 'التوليد اليدوي متاح بعد الحفظ'}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    CODE128
                  </span>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.khxljbv')}</label>
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
                      title={activeBarcodePayload.source === 'local' ? t('product_basics_step.ui.kadubca') : 'باركود دولي'}
                      subtitle={form.name || t('product_basics_step.toasts.k53y2ms')}
                  caption={activeBarcodePayload.value}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2 lg:w-56">
                  <Button type="button" variant="outline" onClick={handleDownloadBarcode}>
                    <Download className="w-4 h-4" />
                    {t('product_basics_step.ui.ktjyneh')}
                  </Button>
                  <Button type="button" onClick={handlePrintBarcode}>
                    <Printer className="w-4 h-4" />
                    {t('product_basics_step.ui.kqqyk4j')}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('product_basics_step.ui.ksodljs')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader icon={Search} title={t('product_basics_step.titles.kpvzq42')} subtitle="الكلمات المفتاحية والوصف الظاهرين في نتائج البحث" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.kf8zhwg')}</label>
            <TagInput
              value={form.seoTitle || ''}
              onChange={(newValue) => setForm((prev) => ({ ...prev, seoTitle: newValue }))}
              placeholder={t('product_basics_step.placeholders.kxjqz40')}
              maxTags={10}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('product_basics_step.ui.kexw2dt')}</label>
            <textarea
              value={form.seoDescription || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, seoDescription: event.target.value }))}
              placeholder={t('product_basics_step.placeholders.k4qljcr')}
              rows={3}
              maxLength={180}
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              dir="rtl"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{t('product_basics_step.ui.ke9jw0p')}</span>
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
                      {tenant?.storeName || tenant?.name || t('product_basics_step.toasts.knkt6px')}
                    </span>
                    <div className="flex items-center justify-start gap-1.5 text-[12px] text-[#bdc1c6] font-normal mt-0.5 max-w-full overflow-hidden truncate">
                      <span dir="ltr" className="truncate">{typeof window !== 'undefined' ? window.location.hostname : 'payqusta.store'}</span>
                      <span className="text-[10px] opacity-70 mt-0.5 shrink-0">›</span>
                      <span className="shrink-0 truncate">{t('product_basics_step.ui.ks0nri5')}</span>
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
                        <span className="text-[9px] font-bold">{t('product_basics_step.ui.k1kvwh7')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center h-[104px]">
                    <h3 className="text-[20px] font-normal text-[#8ab4f8] leading-tight mb-1 truncate hover:underline cursor-pointer">
                      {form.seoTitle ? form.seoTitle.replace(/,/g, ' | ') : form.name}
                    </h3>
                    <p className="text-[14px] text-[#bdc1c6] line-clamp-2 leading-relaxed">
                      {form.seoDescription || (form.description ? form.description.replace(/<[^>]*>/g, '').slice(0, 155) : t('product_basics_step.ui.kni9yzi'))}
                    </p>
                    {form.price && (
                      <p className="text-[14px] text-[#bdc1c6] mt-1 line-clamp-1">
                        السعر: {form.price} ج.م
                        {form.compareAtPrice && ` السعر السابق: ${form.compareAtPrice} ج.م`}
                        <span className="text-[#81c995] font-bold mr-2">{t('product_basics_step.ui.kxe93iy')}</span>
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
        title={t('product_basics_step.titles.kd5p0x6')}
        size="2xl"
        bodyClassName="!p-0 overflow-hidden"
        contentClassName="rounded-[2.5rem]"
      >
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
          {/* Main Form Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
            {/* Live Preview Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Card className="relative overflow-hidden border-none shadow-2xl bg-slate-900 text-white p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-white/10 blur-lg rounded-full animate-pulse" />
                    <div className="relative h-20 w-20 flex items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-4xl shadow-inner">
                      {categoryForm.icon || DEFAULT_CATEGORY_ICON}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" className="bg-primary-500/20 text-primary-200 border border-primary-500/30">
                        {categoryMode === 'root' ? t('product_basics_step.ui.k1hda1s') : 'قسم فرعي'}
                      </Badge>
                      {categoryMode === 'child' && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white/50 uppercase tracking-widest">
                          <Layers className="w-3 h-3" />
                          <span>{t('product_basics_step.ui.kpbwuke')}</span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-2xl font-black tracking-tight truncate max-w-[300px]">
                      {categoryForm.name || t('product_basics_step.toasts.kw188sr')}
                    </h4>
                    <p className="text-sm text-white/60 line-clamp-1 italic font-medium">
                      {categoryForm.description || t('product_basics_step.toasts.kn1hab9')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Input Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('product_basics_step.ui.kqzk8ml')}</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={categoryForm.icon}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, icon: event.target.value }))}
                    className="w-full rounded-2xl border-2 border-gray-100 bg-white px-4 py-4 text-center text-3xl shadow-sm transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="md:col-span-9">
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('product_basics_step.ui.kr36bdc')}</label>
                <input
                  type="text"
                  placeholder={t('product_basics_step.placeholders.kbqpunv')}
                  value={categoryForm.name}
                  onChange={(event) => handleCategoryNameChange(event.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 bg-white px-5 py-4 text-lg font-bold shadow-sm transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Segmented Mode Selector */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('product_basics_step.ui.kqsukby')}</label>
              <div className="relative p-1.5 flex bg-gray-200/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                <div 
                  className="absolute inset-y-1.5 transition-all duration-300 ease-out bg-white dark:bg-slate-800 rounded-xl shadow-lg ring-1 ring-black/5"
                  style={{ 
                    width: 'calc(50% - 6px)', 
                    right: categoryMode === 'root' ? '6px' : '50%'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCategoryMode('root');
                    setCategoryForm((prev) => ({ ...prev, parent: '' }));
                  }}
                  className={`relative z-10 flex-1 py-3 text-sm font-black transition-colors ${categoryMode === 'root' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
                >
                  {t('product_basics_step.ui.k1hda1s')}
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryMode('child')}
                  className={`relative z-10 flex-1 py-3 text-sm font-black transition-colors ${categoryMode === 'child' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
                >
                  {t('product_basics_step.ui.kkkdjkj')}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {categoryMode === 'child' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('product_basics_step.ui.k9e2ora')}</label>
                  <CategorySelector
                    categories={rootCategories}
                    value={categoryForm.parent}
                    onChange={(value) => setCategoryForm((prev) => ({ ...prev, parent: value }))}
                    placeholder={t('product_basics_step.placeholders.kpqflf3')}
                    className="!rounded-2xl"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Icon Suggestions Gallery */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h5 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wide">{t('product_basics_step.ui.kceg4f8')}</h5>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('product_basics_step.placeholders.ksmohkk')}
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pr-9 pl-4 py-2 text-sm transition-all focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:focus:bg-slate-900"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                {iconSuggestions.map((icon) => {
                  const isSelected = categoryForm.icon === icon;
                  return (
                    <motion.button
                      key={`${categoryForm.name}-${icon}-${iconSearchQuery}`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                      className={`relative flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl transition-all duration-300 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-xl shadow-primary-500/20 dark:bg-primary-500/20'
                          : 'border-gray-100 bg-white hover:border-primary-200 dark:border-white/5 dark:bg-white/5'
                      }`}
                    >
                      {icon}
                      {isSelected && (
                        <motion.div 
                          layoutId="activeIcon"
                          className="absolute inset-0 rounded-2xl ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900" 
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('product_basics_step.ui.ky0q67f')}</label>
              <textarea
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder={t('product_basics_step.placeholders.kxlbh8x')}
                className="w-full resize-none rounded-2xl border-2 border-gray-100 bg-white px-5 py-4 text-sm font-medium shadow-sm transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                dir="rtl"
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => setShowCategoryModal(false)} 
                disabled={savingCategory}
                className="px-8 rounded-2xl"
              >
                {t('product_basics_step.ui.cancel')}
              </Button>
              <Button 
                variant="primary"
                size="lg"
                icon={<Check className="w-5 h-5" />} 
                onClick={handleCreateCategory} 
                loading={savingCategory}
                className="px-10 rounded-2xl shadow-xl shadow-primary-500/20"
              >
                {t('product_basics_step.ui.kjw7oyy')}
              </Button>
            </div>
          </div>
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
