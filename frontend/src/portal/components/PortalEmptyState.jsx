import React from 'react';
import { PackageOpen } from 'lucide-react';
import { EmptyState } from '../../components/UI';

export default function PortalEmptyState({
  icon: Icon = PackageOpen,
  title = 'لا توجد بيانات',
  message = '',
  actionText,
  onAction,
  className = '',
}) {
  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={message}
      className={className}
      action={actionText && onAction ? {
        label: actionText,
        onClick: onAction,
        variant: 'primary',
        size: 'md',
      } : null}
    />
  );
}
