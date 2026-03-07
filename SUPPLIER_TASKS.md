# Supplier Domain Tasks

## Objective
تثبيت مفهوم المورد كـ "دائن" (Account Payable) فقط، وتوحيد كل الحسابات والتنبيهات والتقارير على دورة الشراء من المورد.

## Sprint 1 (Critical)
- [x] تعريف تاسكات المورد بشكل رسمي داخل المشروع.
- [x] إصلاح نموذج الإشعارات لدعم أنواع إشعارات المورد الفعلية:
  - `supplier_payment_overdue`
  - `supplier_payment_recorded`
  - ربط `relatedModel` بـ `SupplierPurchaseInvoice`
- [x] إزالة التكرار في `NotificationService.onSupplierPaymentDue`.
- [x] توحيد حساب "المستحقات للمورد" في BI على `SupplierPurchaseInvoice.installmentsSchedule` بدل `Supplier.payments`.
- [x] توحيد نفس المنطق في Dashboard suggestions.

## Sprint 2 (High Value)
- [ ] تقرير كشف حساب مورد (Supplier Statement) مع فلترة تاريخ + PDF/Excel.
- [ ] تقرير أعمار الديون للموردين (AP Aging: 0-30 / 31-60 / 61-90 / 90+).
- [ ] دعم مرتجعات المشتريات (Purchase Return / Debit Note) وتأثيرها على الرصيد والمخزون.
- [ ] دعم عربون المورد (Advance) وتسويته تلقائيا.

## Sprint 3 (Reliability)
- [ ] تغليف عملية الاستلام في DB transaction (تحديث مخزون + PO + SPI + Supplier financials) لضمان الاتساق.
- [ ] ضم `purchase_orders` و `supplier_purchase_invoices` إلى backup/restore.
- [ ] فصل صلاحيات `suppliers` إلى:
  - `purchase_orders`
  - `supplier_invoices`
  - `supplier_master`

## Notes
- أي منطق جديد يجب أن يعتمد على `SupplierPurchaseInvoice` كمصدر الحقيقة المالي الأساسي للمورد.
- `Supplier.payments` يعتبر Legacy ويستخدم فقط للتوافق المؤقت حتى تنفيذ ترحيل كامل.
