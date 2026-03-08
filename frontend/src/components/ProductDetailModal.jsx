import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Barcode,
  Boxes,
  CalendarDays,
  Copy,
  MapPin,
  Package,
  Pencil,
  Tag,
  Truck,
} from 'lucide-react';

import { productsApi, useAuthStore } from '../store';
import { collectProductImages } from '../utils/media';
import BarcodeLabel from './BarcodeLabel';
import { Badge, Button, Card, LoadingSpinner, Modal } from './UI';

const currencyFormatter = new Intl.NumberFormat('ar-EG');
const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

function formatMoney(value) {
  return `${currencyFormatter.format(Number(value || 0))} ج.م`;
}

function formatDate(value) {
  if (!value) return 'غير متوفر';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'غير متوفر' : dateFormatter.format(parsed);
}

function formatBarcodeType(type) {
  const normalized = String(type || '').trim().toUpperCase();
  const labels = {
    UPC_A: 'UPC-A',
    UPC_E: 'UPC-E',
    EAN_8: 'EAN-8',
    EAN_13: 'EAN-13',
    QR_CODE: 'QR Code',
    CODE128: 'Code 128',
    UNKNOWN: 'تنسيق عام',
  };
  return labels[normalized] || normalized || 'تنسيق عام';
}

function looksLikeHtml(text = '') {
  return /<\/?[a-z][\s\S]*>/i.test(String(text || ''));
}

function normalizeVariantAttributes(attributes) {
  if (!attributes) return [];
  if (attributes instanceof Map) return [...attributes.entries()];
  return Object.entries(attributes).filter(([, value]) => hasValue(value));
}

function getStatusMeta(status) {
  if (status === 'in_stock') {
    return {
      badge: 'success',
      label: 'متوفر بالمخزون',
      panel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }

  if (status === 'low_stock') {
    return {
      badge: 'warning',
      label: 'مخزون منخفض',
      panel: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  return {
    badge: 'danger',
    label: 'نفد من المخزون',
    panel: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  };
}

function buildAvailabilityRows(product, tenantId) {
  if (Array.isArray(product?.inventory) && product.inventory.length > 0) {
    return product.inventory.map((item) => {
      const branchRef = item?.branch;
      const branchId = typeof branchRef === 'string' ? branchRef : (branchRef?._id || '');
      const branchName = typeof branchRef === 'object' && branchRef?.name
        ? branchRef.name
        : (branchId && tenantId && String(branchId) === String(tenantId) ? 'الفرع الرئيسي' : 'فرع غير معروف');

      return {
        branchName,
        quantity: Number(item?.quantity) || 0,
        minQuantity: Number(item?.minQuantity) || 5,
      };
    });
  }

  return [{
    branchName: 'الفرع الرئيسي',
    quantity: Number(product?.stock?.quantity) || 0,
    minQuantity: Number(product?.stock?.minQuantity) || 5,
  }];
}

function buildIdentifierRows(product) {
  return [
    {
      key: 'sku',
      title: 'SKU',
      value: product?.sku,
      subtitle: 'الكود الداخلي',
      format: 'CODE128',
    },
    {
      key: 'international',
      title: 'الباركود الدولي',
      value: product?.internationalBarcode || product?.barcode,
      subtitle: formatBarcodeType(product?.internationalBarcodeType || 'UNKNOWN'),
      format: product?.internationalBarcodeType || 'CODE128',
    },
    {
      key: 'local',
      title: 'الباركود المحلي',
      value: product?.localBarcode,
      subtitle: formatBarcodeType(product?.localBarcodeType || 'CODE128'),
      format: product?.localBarcodeType || 'CODE128',
    },
  ].filter((item) => hasValue(item.value));
}

function Surface({ className = '', children }) {
  return (
    <Card className={`rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_50px_-36px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle = '' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint = '' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-medium text-slate-950 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function IdentifierCard({ item, onCopy }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/65">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onCopy(item.value, item.title)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
        >
          <Copy className="h-3.5 w-3.5" />
          نسخ
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
        <span className="select-all break-all font-mono text-sm font-semibold text-slate-950 dark:text-white">
          {item.value}
        </span>
      </div>

      <BarcodeLabel
        value={item.value}
        format={item.format}
        title={item.title}
        subtitle={item.subtitle}
        compact
        className="mt-4 rounded-2xl"
      />
    </div>
  );
}

export default function ProductDetailModal({ product, open, onClose, onEdit }) {
  const tenantId = useAuthStore((state) => state.tenant?._id || state.tenant?.id || '');
  const [details, setDetails] = useState(product || null);
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    if (!open || !product?._id) return undefined;

    let cancelled = false;
    setDetails(product);
    setLoading(true);

    productsApi.getById(product._id)
      .then((response) => {
        if (cancelled) return;
        setDetails(response?.data?.data || product);
      })
      .catch(() => {
        if (cancelled) return;
        setDetails(product);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, product]);

  const displayProduct = details || product;
  const images = useMemo(() => collectProductImages(displayProduct), [displayProduct]);
  const availabilityRows = useMemo(
    () => buildAvailabilityRows(displayProduct, tenantId),
    [displayProduct, tenantId]
  );
  const identifiers = useMemo(
    () => buildIdentifierRows(displayProduct),
    [displayProduct]
  );

  useEffect(() => {
    setActiveImage(images[0] || '');
  }, [images]);

  const statusMeta = getStatusMeta(displayProduct?.stockStatus);
  const variantCount = Array.isArray(displayProduct?.variants) ? displayProduct.variants.length : 0;
  const tags = Array.isArray(displayProduct?.tags) ? displayProduct.tags.filter(Boolean) : [];
  const supplierName = displayProduct?.supplier?.name || 'بدون مورد';
  const supplierPhone = displayProduct?.supplier?.phone || 'غير متوفر';
  const price = Number(displayProduct?.price) || 0;
  const cost = Number(displayProduct?.cost) || 0;
  const compareAtPrice = Number(displayProduct?.compareAtPrice) || 0;
  const profit = price - cost;
  const description = String(displayProduct?.description || '').trim();

  const handleCopy = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`تم نسخ ${label}`);
    } catch {
      toast.error('تعذر نسخ القيمة');
    }
  };

  if (!displayProduct) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تفاصيل المنتج"
      size="2xl"
      bodyClassName="!p-0"
      contentClassName="overflow-hidden"
      headerClassName="bg-white/95 backdrop-blur-sm dark:bg-slate-950/95"
    >
      <div className="relative bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
        <div className="max-h-[88vh] overflow-y-auto p-5 sm:p-6">
          <div className="space-y-5">
            <Surface className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="border-b border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/80 lg:border-b-0 lg:border-l">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[20px] bg-slate-50 p-6 dark:bg-slate-950">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt={displayProduct.name}
                          className="max-h-[300px] w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                          <div className="mb-3 rounded-2xl bg-slate-100 p-5 dark:bg-slate-800">
                            <Package className="h-10 w-10" />
                          </div>
                          <p className="text-sm font-medium">لا توجد صورة</p>
                        </div>
                      )}
                    </div>

                    {images.length > 1 ? (
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {images.map((image) => (
                          <button
                            key={image}
                            type="button"
                            onClick={() => setActiveImage(image)}
                            className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border p-1.5 transition-colors ${
                              image === activeImage
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                            }`}
                          >
                            <img src={image} alt="" className="h-full w-full rounded-xl object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusMeta.badge} className="px-3 py-1.5 font-semibold">
                          {statusMeta.label}
                        </Badge>
                        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.panel}`}>
                          {displayProduct?.category?.name || displayProduct?.categoryName || 'بدون تصنيف'}
                        </span>
                        {displayProduct?.subcategory?.name ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {displayProduct.subcategory.name}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <h2 className="text-3xl font-bold leading-tight text-slate-950 dark:text-white sm:text-[2.3rem]">
                          {displayProduct.name}
                        </h2>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                          {displayProduct?.sku ? (
                            <span className="rounded-full border border-slate-200 px-3 py-1 font-mono text-xs dark:border-slate-700">
                              {displayProduct.sku}
                            </span>
                          ) : null}
                          <span>المورد: {supplierName}</span>
                          <span>آخر تحديث: {formatDate(displayProduct?.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {onEdit ? (
                      <Button variant="outline" onClick={() => onEdit(displayProduct)} className="px-5">
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="سعر البيع"
                      value={formatMoney(displayProduct?.price)}
                      hint={compareAtPrice > price ? `قبل الخصم ${formatMoney(compareAtPrice)}` : 'السعر الحالي'}
                    />
                    <MetricCard
                      label="التكلفة"
                      value={formatMoney(cost)}
                      hint="تكلفة الوحدة"
                    />
                    <MetricCard
                      label="الربح للوحدة"
                      value={formatMoney(profit)}
                      hint={cost > 0 ? `${(((price - cost) / cost) * 100).toFixed(1)}% هامش ربح` : 'لا توجد تكلفة'}
                    />
                    <MetricCard
                      label="المخزون الحالي"
                      value={`${Number(displayProduct?.stock?.quantity) || 0} ${displayProduct?.stock?.unit || 'قطعة'}`}
                      hint={`الحد الأدنى ${Number(displayProduct?.stock?.minQuantity) || 0}`}
                    />
                  </div>
                </div>
              </div>
            </Surface>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <Surface className="p-5 sm:p-6 xl:col-span-12">
                <SectionHeader
                  icon={Barcode}
                  title="الأكواد والباركود"
                  subtitle="بطاقات منظمة تعرض SKU والباركود الدولي والمحلي بشكل أوضح"
                />
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {identifiers.length > 0 ? (
                    identifiers.map((item) => (
                      <IdentifierCard key={item.key} item={item} onCopy={handleCopy} />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400 lg:col-span-2 2xl:col-span-3">
                      لا يوجد باركود أو SKU محفوظ لهذا المنتج.
                    </div>
                  )}
                </div>
              </Surface>

              <Surface className="p-5 sm:p-6 xl:col-span-4">
                <SectionHeader
                  icon={MapPin}
                  title="توزيع المخزون"
                  subtitle="الكمية المتاحة في كل فرع"
                />
                <div className="mt-5 space-y-3">
                  {availabilityRows.map((row) => {
                    const low = row.quantity <= row.minQuantity;
                    return (
                      <div
                        key={`${row.branchName}-${row.quantity}-${row.minQuantity}`}
                        className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/65"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${low ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">{row.branchName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              الحد الأدنى: {row.minQuantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xl font-semibold text-slate-950 dark:text-white">{row.quantity}</p>
                          <p className={`mt-1 text-xs font-medium ${low ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                            {low ? 'منخفض' : 'مستقر'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Surface>

              <Surface className="p-5 sm:p-6 xl:col-span-4">
                <SectionHeader
                  icon={Truck}
                  title="بيانات سريعة"
                  subtitle="ملخص تشغيلي للمورد والشحن والضريبة"
                />
                <div className="mt-5">
                  <DetailRow label="المورد" value={supplierName} />
                  <DetailRow label="هاتف المورد" value={supplierPhone} />
                  <DetailRow label="تكلفة الشحن" value={hasValue(displayProduct?.shippingCost) ? formatMoney(displayProduct.shippingCost) : 'غير متوفر'} />
                  <DetailRow label="الضريبة" value={`${Number(displayProduct?.taxRate) || 0}%`} />
                  <DetailRow label="الصلاحية" value={formatDate(displayProduct?.expiryDate)} />
                  <DetailRow label="تاريخ الإنشاء" value={formatDate(displayProduct?.createdAt)} />
                </div>

                {tags.length > 0 ? (
                  <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">الوسوم</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tagValue) => (
                        <span
                          key={tagValue}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {tagValue}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Surface>

              {(displayProduct?.seoTitle || displayProduct?.seoDescription) ? (
                <Surface className="p-5 sm:p-6 xl:col-span-4">
                  <SectionHeader
                    icon={Tag}
                    title="بيانات SEO"
                    subtitle="العنوان والوصف الخاصان بالظهور الخارجي"
                  />
                  <div className="mt-5">
                    <DetailRow label="عنوان SEO" value={displayProduct?.seoTitle || 'غير متوفر'} />
                    <DetailRow label="وصف SEO" value={displayProduct?.seoDescription || 'غير متوفر'} />
                  </div>
                </Surface>
              ) : null}

              {description ? (
                <Surface className={`p-5 sm:p-6 ${displayProduct?.seoTitle || displayProduct?.seoDescription ? 'xl:col-span-8' : 'xl:col-span-12'}`}>
                  <SectionHeader
                    icon={Package}
                    title="وصف المنتج"
                    subtitle="تفاصيل المنتج الكاملة كما تم إدخالها"
                  />
                  <div className="mt-5">
                    {looksLikeHtml(description) ? (
                      <div
                        className="rtl-editor-content prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: description }}
                      />
                    ) : (
                      <p className="whitespace-pre-line text-sm leading-8 text-slate-700 dark:text-slate-300">
                        {description}
                      </p>
                    )}
                  </div>
                </Surface>
              ) : null}

              {variantCount > 0 ? (
                <Surface className="p-5 sm:p-6 xl:col-span-12">
                  <SectionHeader
                    icon={Boxes}
                    title="متغيرات المنتج"
                    subtitle="الألوان والمقاسات والخيارات مع السعر والمخزون"
                  />
                  <div className="mt-5 grid grid-cols-1 gap-4 2xl:grid-cols-2">
                    {displayProduct.variants.map((variant, index) => {
                      const attributes = normalizeVariantAttributes(variant?.attributes);
                      const variantBarcode = variant?.localBarcode || variant?.internationalBarcode || variant?.barcode;

                      return (
                        <div
                          key={`${variant?._id || index}`}
                          className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/65"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                متغير {index + 1}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {attributes.length > 0 ? (
                                  attributes.map(([key, value]) => (
                                    <span
                                      key={`${key}-${value}`}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"
                                    >
                                      {key}: {value}
                                    </span>
                                  ))
                                ) : (
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                                    بدون خصائص
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant={variant?.isActive === false ? 'gray' : 'success'}>
                              {variant?.isActive === false ? 'غير نشط' : 'نشط'}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <MetricCard
                              label="السعر"
                              value={hasValue(variant?.price) ? formatMoney(variant.price) : 'غير محدد'}
                            />
                            <MetricCard
                              label="المخزون"
                              value={`${Number(variant?.stock) || 0}`}
                            />
                          </div>

                          {(variant?.sku || variantBarcode) ? (
                            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
                              {variant?.sku ? (
                                <DetailRow label="SKU" value={variant.sku} mono />
                              ) : null}
                              {variantBarcode ? (
                                <DetailRow label="الباركود" value={variantBarcode} mono />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Surface>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/65 backdrop-blur-sm dark:bg-slate-950/70">
            <LoadingSpinner text="جارٍ تحميل التفاصيل..." />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/95">
        {onEdit ? (
          <Button variant="outline" onClick={() => onEdit(displayProduct)}>
            <Pencil className="h-4 w-4" />
            تعديل
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </Modal>
  );
}
