import { FileText, MessageCircle, Package, RotateCcw } from 'lucide-react';

export function mergeUniqueProducts(...lists) {
  const seen = new Set();

  return lists
    .flat()
    .filter((product) => {
      if (!product?._id || seen.has(product._id)) return false;
      seen.add(product._id);
      return true;
    });
}

export const supportQuickTypes = [
  { value: 'inquiry', label: 'استفسار عام' },
  { value: 'order', label: 'مشكلة طلب' },
  { value: 'payment', label: 'مشكلة دفع' },
  { value: 'complaint', label: 'شكوى' },
];

export const getCustomerNavLinks = (portalBasePath) => ([
  { key: 'orders', label: 'طلباتي', to: `${portalBasePath}/orders`, icon: Package },
  { key: 'invoices', label: 'فواتيري', to: `${portalBasePath}/invoices`, icon: FileText },
  { key: 'returns', label: 'المرتجعات', to: `${portalBasePath}/returns`, icon: RotateCcw },
  { key: 'support', label: 'الدعم', to: `${portalBasePath}/support`, icon: MessageCircle },
]);

export const getSupportStatusBadge = (status) => {
  switch (status) {
    case 'replied':
      return { label: 'تم الرد', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
    case 'closed':
      return { label: 'مغلقة', className: 'app-surface-muted app-text-soft' };
    default:
      return { label: 'مفتوحة', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  }
};
