import { buildBarcodeSvg } from './barcodeUtils';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(value, currency = 'EGP') {
  const normalized = Number(value) || 0;
  const currencyLabel = currency === 'EGP' ? 'ج.م' : currency;
  return `${normalized.toLocaleString('ar-EG')} ${escapeHtml(currencyLabel)}`;
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getPaymentMethodLabel(method) {
  return (
    {
      cash: 'نقدي',
      cash_on_delivery: 'الدفع عند الاستلام',
      visa: 'بطاقة',
      installment: 'أقساط',
      deferred: 'آجل',
    }[method] || method || '-'
  );
}

function resolveItemBarcode(item, source) {
  if (source === 'local' && item?.localBarcode) {
    return {
      value: item.localBarcode,
      type: item.localBarcodeType || 'CODE128',
      label: 'الباركود المحلي',
    };
  }

  if (source === 'international' && (item?.internationalBarcode || item?.barcode)) {
    return {
      value: item.internationalBarcode || item.barcode,
      type: item.internationalBarcodeType || 'UNKNOWN',
      label: 'الباركود الدولي',
    };
  }

  return null;
}

function renderBarcodeBlock(item, source) {
  const payload = resolveItemBarcode(item, source);
  if (!payload) return '';

  const svgMarkup = buildBarcodeSvg(payload.value, payload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128', {
    height: 44,
    moduleWidth: 1.5,
    quietZone: 8,
    fontSize: 10,
    textMargin: 12,
    size: 110,
  });

  if (!svgMarkup) return '';

  return `
    <div class="barcode-block">
      <div class="barcode-header">${escapeHtml(payload.label)}</div>
      <div class="barcode-graphic">${svgMarkup}</div>
      <div class="barcode-value">${escapeHtml(payload.value)}</div>
    </div>
  `;
}

function openPrintDocument({ title, bodyClass, styles, content, printWindow }) {
  const targetWindow = printWindow || window.open('', '_blank', 'width=860,height=960');
  if (!targetWindow) {
    throw new Error('PRINT_WINDOW_BLOCKED');
  }

  targetWindow.document.open();
  targetWindow.document.write(`
    <!doctype html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #111827;
            --muted: #6b7280;
            --line: #d1d5db;
            --panel: #f9fafb;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #eef2f7;
            color: var(--ink);
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
          }
          .page-shell {
            display: flex;
            justify-content: center;
            padding: 24px;
          }
          .document {
            width: 100%;
            background: #ffffff;
            border: 1px solid var(--line);
            box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
          }
          .document-header {
            border-bottom: 2px solid var(--ink);
            padding: 18px 20px 14px;
          }
          .document-title {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }
          .document-subtitle {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 13px;
          }
          .store-block {
            display: grid;
            gap: 6px;
            margin-top: 12px;
          }
          .store-name {
            font-size: 18px;
            font-weight: 800;
          }
          .meta-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 16px 20px;
            border-bottom: 1px solid var(--line);
            background: var(--panel);
          }
          .meta-card {
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 10px 12px;
            background: #ffffff;
          }
          .meta-label {
            color: var(--muted);
            font-size: 11px;
            font-weight: 700;
          }
          .meta-value {
            margin-top: 4px;
            font-size: 14px;
            font-weight: 700;
          }
          .section {
            padding: 18px 20px;
          }
          .section-title {
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
          }
          .line-items {
            display: grid;
            gap: 12px;
          }
          .line-item {
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 12px;
            page-break-inside: avoid;
          }
          .line-main {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }
          .line-name {
            font-size: 15px;
            font-weight: 800;
          }
          .line-meta {
            margin-top: 4px;
            color: var(--muted);
            font-size: 12px;
          }
          .line-total {
            white-space: nowrap;
            font-size: 14px;
            font-weight: 800;
          }
          .qty-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            border-radius: 999px;
            background: var(--panel);
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 700;
          }
          .barcode-block {
            margin-top: 10px;
            border-top: 1px dashed var(--line);
            padding-top: 10px;
          }
          .barcode-header {
            font-size: 10px;
            font-weight: 800;
            color: var(--muted);
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .barcode-graphic {
            margin-top: 6px;
            overflow: hidden;
          }
          .barcode-graphic svg {
            display: block;
            max-width: 100%;
            height: auto;
          }
          .barcode-value {
            margin-top: 4px;
            font-size: 11px;
            font-weight: 700;
            word-break: break-all;
          }
          .totals {
            display: grid;
            gap: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            font-size: 14px;
          }
          .total-row strong {
            font-size: 16px;
          }
          .notes-box {
            border: 1px dashed var(--line);
            border-radius: 12px;
            padding: 12px;
            background: #fff;
            white-space: pre-wrap;
            line-height: 1.8;
            font-size: 13px;
          }
          .address-box {
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 12px;
            line-height: 1.8;
            font-size: 13px;
            background: #fff;
          }
          .document-footer {
            border-top: 1px solid var(--line);
            padding: 14px 20px 18px;
            color: var(--muted);
            font-size: 11px;
            text-align: center;
          }
          ${styles}
          @media print {
            body {
              background: #ffffff;
            }
            .page-shell {
              padding: 0;
            }
            .document {
              border: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body class="${escapeHtml(bodyClass)}">
        <div class="page-shell">
          ${content}
        </div>
        <script>
          window.onload = function () {
            window.print();
          };
          window.onafterprint = function () {
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  targetWindow.document.close();
}

function renderReceiptItems(invoice, barcodeSource, currency) {
  return (invoice?.items || []).map((item) => `
    <div class="line-item">
      <div class="line-main">
        <div>
          <div class="line-name">${escapeHtml(item.productName || 'صنف')}</div>
          <div class="line-meta">
            ${escapeHtml(item.sku || 'بدون SKU')}
            <span>•</span>
            ${formatMoney(item.unitPrice, currency)} للوحدة
          </div>
          <div class="qty-pill">الكمية: ${escapeHtml(item.quantity)}</div>
        </div>
        <div class="line-total">${formatMoney(item.totalPrice, currency)}</div>
      </div>
      ${renderBarcodeBlock(item, barcodeSource)}
    </div>
  `).join('');
}

function renderDeliveryItems(invoice, barcodeSource) {
  return (invoice?.items || []).map((item) => `
    <div class="line-item">
      <div class="line-main">
        <div>
          <div class="line-name">${escapeHtml(item.productName || 'صنف')}</div>
          <div class="line-meta">${escapeHtml(item.sku || 'بدون SKU')}</div>
          <div class="qty-pill">الكمية المطلوبة: ${escapeHtml(item.quantity)}</div>
        </div>
        <div class="line-total">${escapeHtml(String(item.quantity || 0))} قطعة</div>
      </div>
      ${renderBarcodeBlock(item, barcodeSource)}
    </div>
  `).join('');
}

export function printReceiptDocument({ invoice, tenant, barcodeSource = 'none', printWindow }) {
  const currency = tenant?.settings?.currency || 'EGP';
  const itemsTotal = (invoice?.items || []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  const content = `
    <div class="document">
      <div class="document-header">
        <h1 class="document-title">إيصال بيع</h1>
        <p class="document-subtitle">طباعة عبر المتصفح مع مصدر باركود: ${escapeHtml(barcodeSource)}</p>
        <div class="store-block">
          <div class="store-name">${escapeHtml(tenant?.name || 'PayQusta')}</div>
          <div>${escapeHtml(tenant?.businessInfo?.phone || '')}</div>
          <div>${escapeHtml(tenant?.businessInfo?.address || '')}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">رقم الفاتورة</div>
          <div class="meta-value">${escapeHtml(invoice?.invoiceNumber || '-')}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">التاريخ</div>
          <div class="meta-value">${escapeHtml(formatDateTime(invoice?.createdAt))}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">العميل</div>
          <div class="meta-value">${escapeHtml(invoice?.customer?.name || '-')}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">طريقة الدفع</div>
          <div class="meta-value">${escapeHtml(getPaymentMethodLabel(invoice?.paymentMethod))}</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">الأصناف</h2>
        <div class="line-items">${renderReceiptItems(invoice, barcodeSource, currency)}</div>
      </div>

      <div class="section">
        <h2 class="section-title">الإجماليات</h2>
        <div class="totals">
          <div class="total-row"><span>عدد القطع</span><span>${escapeHtml(String(itemsTotal))}</span></div>
          <div class="total-row"><span>الإجمالي قبل الخصم</span><span>${formatMoney(invoice?.subtotal, currency)}</span></div>
          <div class="total-row"><span>الخصم</span><span>${formatMoney(invoice?.discount, currency)}</span></div>
          <div class="total-row"><span>المدفوع</span><span>${formatMoney(invoice?.paidAmount, currency)}</span></div>
          <div class="total-row"><strong>الإجمالي النهائي</strong><strong>${formatMoney(invoice?.totalAmount, currency)}</strong></div>
        </div>
      </div>

      ${invoice?.notes ? `
        <div class="section">
          <h2 class="section-title">ملاحظات</h2>
          <div class="notes-box">${escapeHtml(invoice.notes)}</div>
        </div>
      ` : ''}

      <div class="document-footer">
        تم إنشاء هذا الإيصال من PayQusta باستخدام Browser Print فقط.
      </div>
    </div>
  `;

  openPrintDocument({
    title: `Receipt ${invoice?.invoiceNumber || ''}`.trim(),
    bodyClass: 'receipt-print',
    styles: `
      .receipt-print .document {
        max-width: 360px;
      }
      @page {
        size: 80mm auto;
        margin: 8mm 6mm;
      }
    `,
    content,
    printWindow,
  });
}

export function printDeliveryTicket({ invoice, tenant, barcodeSource = 'none', printWindow }) {
  const recipientName = invoice?.shippingAddress?.fullName || invoice?.customer?.name || '-';
  const recipientPhone = invoice?.shippingAddress?.phone || invoice?.customer?.phone || '-';
  const recipientAddress = [
    invoice?.shippingAddress?.address,
    invoice?.shippingAddress?.city,
    invoice?.shippingAddress?.governorate,
  ].filter(Boolean).join(' - ') || invoice?.customer?.address || '-';

  const content = `
    <div class="document">
      <div class="document-header">
        <h1 class="document-title">تيكيت توصيل</h1>
        <p class="document-subtitle">طباعة عبر المتصفح مع مصدر باركود: ${escapeHtml(barcodeSource)}</p>
        <div class="store-block">
          <div class="store-name">${escapeHtml(tenant?.name || 'PayQusta')}</div>
          <div>${escapeHtml(tenant?.businessInfo?.phone || '')}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">رقم الفاتورة</div>
          <div class="meta-value">${escapeHtml(invoice?.invoiceNumber || '-')}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">رقم الشحنة</div>
          <div class="meta-value">${escapeHtml(invoice?.shippingDetails?.waybillNumber || '-')}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">الحالة</div>
          <div class="meta-value">${escapeHtml(invoice?.shippingDetails?.status || invoice?.orderStatus || '-')}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">تاريخ الإنشاء</div>
          <div class="meta-value">${escapeHtml(formatDateTime(invoice?.createdAt))}</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">بيانات المستلم</h2>
        <div class="address-box">
          <div><strong>الاسم:</strong> ${escapeHtml(recipientName)}</div>
          <div><strong>الهاتف:</strong> ${escapeHtml(recipientPhone)}</div>
          <div><strong>العنوان:</strong> ${escapeHtml(recipientAddress)}</div>
          <div><strong>المبلغ المطلوب:</strong> ${formatMoney(invoice?.remainingAmount, tenant?.settings?.currency || 'EGP')}</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">محتويات الشحنة</h2>
        <div class="line-items">${renderDeliveryItems(invoice, barcodeSource)}</div>
      </div>

      ${invoice?.shippingAddress?.notes || invoice?.notes ? `
        <div class="section">
          <h2 class="section-title">ملاحظات</h2>
          <div class="notes-box">${escapeHtml(invoice?.shippingAddress?.notes || invoice?.notes || '')}</div>
        </div>
      ` : ''}

      <div class="document-footer">
        هذا المستند مهيأ للطباعة من المتصفح فقط ولا يعتمد على silent printing.
      </div>
    </div>
  `;

  openPrintDocument({
    title: `Delivery Ticket ${invoice?.invoiceNumber || ''}`.trim(),
    bodyClass: 'delivery-print',
    styles: `
      .delivery-print .document {
        max-width: 840px;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
    `,
    content,
    printWindow,
  });
}
