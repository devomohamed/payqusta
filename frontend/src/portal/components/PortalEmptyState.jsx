import React from 'react';
import { PackageOpen } from 'lucide-react';
import { EmptyState } from '../../components/UI';
import { useTranslation } from 'react-i18next';

export default function PortalEmptyState({
  icon: Icon = PackageOpen,
  title = t('portal_empty_state.ui.km3iafu'),
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
