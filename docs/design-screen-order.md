# ترتيب الشاشات المتبقية للتصميم

هذا الملف هو backlog مرتب للتنفيذ.
ابدأ من الأعلى للأسفل.
لا تنتقل لمرحلة جديدة قبل إنهاء المرحلة الحالية.

## ملاحظات

- الشاشات الأساسية التي تم لمسها بالفعل في الدفعات السابقة: `Dashboard`, `Settings`, `Products`, `Customers`, `QuickSale`, صفحات الموقع العام الأساسية، وبعض شاشات الجرد والمشتريات والبوابة.
- القائمة التالية تركّز على الشاشات التي ما زالت تحتاج pass تصميم/توحيد كامل أو لم تدخل في نفس مستوى الـ polish بعد.

## المرحلة 1: التشغيل اليومي

1. `InvoicesPage.jsx`
2. `CashDrawerPage.jsx`
3. `ReturnsManagementPage.jsx`
4. `InstallmentsDashboardPage.jsx`
5. `SupplierPurchaseInvoicesPage.jsx`
6. `SupportMessagesPage.jsx`
7. `NotificationsPage.jsx`

الهدف:
- توحيد الحاويات والفلاتر والجداول.
- ضبط mobile hierarchy.
- توحيد حالات `empty/loading/action bars`.

## المرحلة 2: التقارير والماليات

1. `ReportsPage.jsx`
2. `BusinessReportsPage.jsx`
3. `FinancialsPage.jsx`
4. `RevenueAnalyticsPage.jsx`
5. `PaymentAnalyticsPage.jsx`
6. `ExpensesPage.jsx`
7. `AgingReportPage.jsx`
8. `SupplierAgingReportPage.jsx`
9. `StaffPerformancePage.jsx`

الهدف:
- تهدئة الكثافة البصرية.
- توحيد البطاقات الإحصائية والـ charts containers.
- تحسين تباين الدارك مود.

## المرحلة 3: الإدارة والتشغيل المتقدم

1. `AdminDashboardPage.jsx`
2. `AdminStatisticsPage.jsx`
3. `AdminUsersPage.jsx`
4. `AdminTenantsPage.jsx`
5. `AdminAuditLogsPage.jsx`
6. `AuditLogsPage.jsx`
7. `RolesPage.jsx`
8. `BackupRestorePage.jsx`
9. `KYCReviewPage.jsx`
10. `CommandCenterPage.jsx`
11. `PortalOrdersAdminPage.jsx`

الهدف:
- توحيد shell الإداري الثقيل.
- تقليل ازدحام الصفحات متعددة الجداول/البطاقات.
- تحسين وضوح الأولويات البصرية.

## المرحلة 4: التسويق والنمو

1. `MarketingPage.jsx`
2. `CouponsPage.jsx`
3. `ReferralPage.jsx`
4. `ReviewsPage.jsx`
5. `PublicLeadsPage.jsx`
6. `AddonStorePage.jsx`

الهدف:
- الحفاظ على نفس الـ design system بدون فقدان الطابع التجاري.
- تقوية CTA hierarchy.
- مراجعة mobile cards والرسائل الفارغة.

## المرحلة 5: الاشتراكات والخطط

1. `SubscriptionPage.jsx`
2. `SubscriptionRequestsPage.jsx`
3. `SuperAdminDashboard.jsx`
4. `SuperAdminPlansPage.jsx`

الهدف:
- توحيد تجربة الباقات والخطط.
- إبراز المقارنة بين الخطط بدون زحمة.
- ضبط توافق الدارك مود.

## المرحلة 6: التطبيقات الطرفية

1. `CollectorDashboard.jsx`
2. `FieldCollectionApp.jsx`
3. `BranchDashboardPage.jsx`

الهدف:
- مراجعة شاشات الاستخدام الميداني.
- تحسين المسافات واللمس على الموبايل.
- تبسيط الإجراءات السريعة.

## المرحلة 7: شاشات الدخول والحواف

1. `LoginPage.jsx`
2. `ForgotPasswordPage.jsx`
3. `ResetPasswordPage.jsx`

الهدف:
- توحيد الثيم مع بقية النظام.
- تحسين الإدراك البصري للحالة والخطأ.
- التأكد من وضوح التجربة على الموبايل.

## المرحلة 8: شاشات البوابة المتبقية

1. `PortalHome.jsx`
2. `PortalProducts.jsx`
3. `PortalProductDetails.jsx`
4. `PortalCheckout.jsx`
5. `PortalOrders.jsx`
6. `PortalInvoices.jsx`
7. `PortalReturns.jsx`
8. `PortalStatement.jsx`
9. `PortalNotifications.jsx`
10. `PortalPointsHistory.jsx`
11. `PortalAddresses.jsx`
12. `PortalDocuments.jsx`
13. `PortalInstallmentCalculator.jsx`
14. `PortalReviews.jsx`
15. `PortalSupportChat.jsx`
16. `PortalPaymentResult.jsx`
17. `PortalLogin.jsx`

الهدف:
- توحيد البوابة بالكامل مع الـ layout الجديد.
- ضبط cards/forms/tables على نفس الـ tokens.
- تحسين flows الشراء، الفواتير، والدعم.

## ترتيب التنفيذ المقترح

1. المرحلة 1
2. المرحلة 2
3. المرحلة 3
4. المرحلة 8
5. المرحلة 4
6. المرحلة 5
7. المرحلة 6
8. المرحلة 7

## قاعدة العمل

- كل شاشة: `layout -> filters -> content cards/tables -> modals -> mobile`.
- بعد كل دفعة: تشغيل `npm --prefix frontend run build`.
- لا تبدأ مرحلة جديدة إلا بعد تثبيت المرحلة السابقة بصريًا.
